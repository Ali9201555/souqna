import type { NewListingInput } from '@/data/ListingsProvider';
import { supabase } from '@/lib/supabase';
import type { Listing, ListingAttributes, SellerProfile } from '@/types';

/**
 * Supabase data layer for listings. These functions accept/return domain
 * `Listing` objects (camelCase, epoch-ms timestamps) so the provider and
 * screens stay decoupled from the Postgres column names. Only call when
 * `isSupabaseConfigured` is true — `supabase` throws otherwise; writes
 * additionally require an authed session (RLS: `seller_id = auth.uid()`).
 */

/** A row from `public.listings` (see supabase/migrations/0001_initial_schema.sql). */
type ListingRow = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price_iqd: number;
  negotiable: boolean;
  category_id: string;
  governorate_id: string;
  condition: 'new' | 'used';
  status: 'active' | 'sold' | 'removed';
  created_at: string;
  attributes: Record<string, unknown> | null;
};

type ListingImageRow = { url: string; sort_order: number };

type ListingRowWithImages = ListingRow & { listing_images: ListingImageRow[] | null };

/** Pull `*` plus the embedded images in one round-trip. */
const SELECT_WITH_IMAGES = '*, listing_images(url, sort_order)';

/** Accept only the discriminated shapes the client knows; anything else → undefined. */
function mapAttributes(value: Record<string, unknown> | null): ListingAttributes | undefined {
  if (value == null) return undefined;
  return value.kind === 'vehicle' || value.kind === 'property' || value.kind === 'food'
    ? (value as unknown as ListingAttributes)
    : undefined;
}

function mapListing(row: ListingRowWithImages): Listing {
  const images = (row.listing_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => img.url);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priceIqd: row.price_iqd,
    negotiable: row.negotiable,
    categoryId: row.category_id,
    governorateId: row.governorate_id,
    condition: row.condition,
    images,
    sellerId: row.seller_id,
    createdAt: new Date(row.created_at).getTime(),
    attributes: mapAttributes(row.attributes),
  };
}

/** Active listings, newest first. RLS limits this to `status = 'active'`. */
export async function fetchActiveListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(SELECT_WITH_IMAGES)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ListingRowWithImages[]).map(mapListing);
}

/** A single listing by id, or `null` if not found / not visible under RLS. */
export async function fetchListingById(id: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from('listings')
    .select(SELECT_WITH_IMAGES)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapListing(data as unknown as ListingRowWithImages) : null;
}

const BUCKET = 'listing-images';

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
};

function imageMeta(uri: string): { ext: string; contentType: string } {
  const last = uri.split(/[?#]/)[0].split('/').pop() ?? '';
  const ext = last.includes('.') ? (last.split('.').pop() ?? '').toLowerCase() : '';
  return EXT_MIME[ext] ? { ext, contentType: EXT_MIME[ext] } : { ext: 'jpg', contentType: 'image/jpeg' };
}

/** Upload one local image; returns its public URL. Path: `<uid>/<batch>/<index>.<ext>`. */
async function uploadListingImage(uri: string, sellerId: string, batchId: string, index: number): Promise<string> {
  const { ext, contentType } = imageMeta(uri);
  // RN can't reliably upload Blob/FormData bodies through supabase-js — the
  // vendor-blessed pattern is fetch(uri) → ArrayBuffer, which also covers
  // blob:/data: URIs on web. contentType is mandatory for ArrayBuffer bodies
  // (defaults to text/plain otherwise).
  const arrayBuffer = await fetch(uri).then((r) => r.arrayBuffer());
  // First path segment must be the uploader's uid — the storage RLS write
  // policy checks (storage.foldername(name))[1] = auth.uid().
  const path = `${sellerId}/${batchId}/${index}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Create a listing with images. Caller must be authed (RLS: seller_id = auth.uid()). */
export async function createListing(input: NewListingInput, sellerId: string): Promise<Listing> {
  // Upload local images first: a storage failure then leaves zero DB rows.
  // http(s) URLs (e.g. placeholder images) pass through without uploading.
  // Fresh batch path per attempt, so retries never hit "already exists".
  const batchId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const urls = await Promise.all(
    input.images.map((uri, i) =>
      /^https?:\/\//.test(uri) ? Promise.resolve(uri) : uploadListingImage(uri, sellerId, batchId, i),
    ),
  );

  // Insert hidden (status 'removed') and only activate once the image rows are
  // in. If the app dies or the network drops between steps, the orphan is
  // invisible to the public feed instead of a broken active listing — the
  // owner-scoped RLS select/update policies still let us see and finish it.
  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: sellerId,
      title: input.title,
      description: input.description,
      price_iqd: input.priceIqd,
      negotiable: input.negotiable,
      category_id: input.categoryId,
      governorate_id: input.governorateId,
      condition: input.condition,
      attributes: input.attributes ?? {},
      status: 'removed',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  const row = data as unknown as ListingRow;

  // Image rows go in after the parent exists — their RLS with-check subqueries
  // the parent listing for ownership.
  const imageRows = urls.map((url, i) => ({ listing_id: row.id, url, sort_order: i }));
  if (imageRows.length) {
    const { error: imgError } = await supabase.from('listing_images').insert(imageRows);
    if (imgError) {
      // Best-effort cleanup of the (invisible) draft; surface the original error.
      await supabase.from('listings').delete().eq('id', row.id).then(() => undefined, () => undefined);
      throw new Error(imgError.message);
    }
  }

  const { data: activated, error: activateError } = await supabase
    .from('listings')
    .update({ status: 'active' })
    .eq('id', row.id)
    .select('*')
    .single();
  if (activateError) {
    // The draft stays invisible; a retry publishes fresh rather than duplicating
    // something public.
    await supabase.from('listings').delete().eq('id', row.id).then(() => undefined, () => undefined);
    throw new Error(activateError.message);
  }

  // url + sort_order are client-supplied, so mapping with them is identical to
  // a re-select — no extra round trip.
  return mapListing({
    ...(activated as unknown as ListingRow),
    listing_images: imageRows.map(({ url, sort_order }) => ({ url, sort_order })),
  });
}

type PublicProfileRow = {
  id: string;
  name: string;
  avatar_color: string;
  rating_avg: number | string;
  rating_count: number;
  is_phone_verified: boolean;
  created_at: string;
};

/**
 * Public seller profiles from the column-safe `profiles_public` view. Phone is
 * deliberately NOT exposed there (owner-only PII) — remote sellers are
 * contacted through chat, so `phone` maps to ''.
 */
export async function fetchSellerProfiles(ids: string[]): Promise<SellerProfile[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from('profiles_public').select('*').in('id', ids);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as PublicProfileRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    phone: '',
    avatarColor: row.avatar_color,
    joinedYear: new Date(row.created_at).getFullYear(),
    ratingAvg: Number(row.rating_avg) || 0,
    ratingCount: row.rating_count,
    isPhoneVerified: row.is_phone_verified,
  }));
}
