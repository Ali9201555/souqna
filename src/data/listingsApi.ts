import { supabase } from '@/lib/supabase';
import type { Listing } from '@/types';

/**
 * Supabase read layer for listings. These functions return domain `Listing`
 * objects (camelCase, epoch-ms timestamps) so the provider and screens stay
 * decoupled from the Postgres column names. Only call when
 * `isSupabaseConfigured` is true — `supabase` throws otherwise.
 *
 * Writes (create/update listing) land with Phase 2 auth, since the listings RLS
 * insert policy requires `seller_id = auth.uid()`.
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
};

type ListingImageRow = { url: string; sort_order: number };

type ListingRowWithImages = ListingRow & { listing_images: ListingImageRow[] | null };

/** Pull `*` plus the embedded images in one round-trip. */
const SELECT_WITH_IMAGES = '*, listing_images(url, sort_order)';

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
