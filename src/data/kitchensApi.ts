import { supabase } from '@/lib/supabase';
import type { Kitchen } from '@/types';

/**
 * Supabase layer for home-cook storefronts. Public-read, owner-write (RLS in
 * 0009). A kitchen's dishes are the owner's food listings, resolved client-side
 * by seller_id — no extra join here. Only call when configured; writes need an
 * authed owner.
 */

type KitchenRow = {
  id: string;
  owner_id: string;
  name: string;
  bio: string;
  cover_url: string | null;
  cuisines: string[] | null;
  governorate_id: string | null;
  created_at: string;
};

function mapKitchen(row: KitchenRow): Kitchen {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    bio: row.bio ?? '',
    coverUrl: row.cover_url ?? undefined,
    cuisines: row.cuisines ?? [],
    governorateId: row.governorate_id ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function fetchKitchens(): Promise<Kitchen[]> {
  const { data, error } = await supabase.from('kitchens').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as KitchenRow[]).map(mapKitchen);
}

export async function fetchKitchen(id: string): Promise<Kitchen | null> {
  const { data, error } = await supabase.from('kitchens').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapKitchen(data as unknown as KitchenRow) : null;
}

/** Fields a cook fills in; id/ownerId/createdAt are assigned by the store. */
export type KitchenInput = {
  name: string;
  bio: string;
  coverUrl?: string;
  cuisines: string[];
  governorateId?: string;
};

/** Create or update the signed-in cook's kitchen (unique on owner_id). */
export async function upsertMyKitchen(input: KitchenInput, ownerId: string): Promise<Kitchen> {
  const { data, error } = await supabase
    .from('kitchens')
    .upsert(
      {
        owner_id: ownerId,
        name: input.name,
        bio: input.bio,
        cover_url: input.coverUrl ?? null,
        cuisines: input.cuisines,
        governorate_id: input.governorateId ?? null,
      },
      { onConflict: 'owner_id', ignoreDuplicates: false },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapKitchen(data as unknown as KitchenRow);
}
