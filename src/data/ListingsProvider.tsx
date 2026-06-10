import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { DEMO_USER_ID, SELLERS, SEED_LISTINGS, SEED_THREADS } from '@/data/seed';
import { fetchActiveListings } from '@/data/listingsApi';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { ChatThread, Listing, SellerProfile } from '@/types';

/**
 * Fields the seller fills in when posting. id/createdAt/sellerId are assigned
 * by the store. This mirrors the shape a Supabase `insert` will accept later,
 * so screens won't change when the backend is wired in.
 */
export type NewListingInput = Omit<Listing, 'id' | 'createdAt' | 'sellerId'>;

type ListingsContextValue = {
  listings: Listing[];
  threads: ChatThread[];
  favorites: string[];
  currentUserId: string;
  myListings: Listing[];
  /** True while the listings feed is loading (storage hydration or a Supabase fetch). */
  isLoading: boolean;
  /** Non-null when the last listings fetch failed (Supabase-backed mode only). */
  error: string | null;
  /** Re-fetch the listings feed. No-op in in-memory mode. */
  refetch: () => Promise<void>;
  addListing: (input: NewListingInput) => Listing;
  getListing: (id: string) => Listing | undefined;
  getSeller: (id: string) => SellerProfile | undefined;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
};

const ListingsContext = createContext<ListingsContextValue | null>(null);

const LOCAL_LISTINGS_KEY = 'souqna.localListings';
const FAVORITES_KEY = 'souqna.favorites';

const byNewest = (a: Listing, b: Listing) => b.createdAt - a.createdAt;

function isListing(value: unknown): value is Listing {
  if (value == null || typeof value !== 'object') return false;
  const listing = value as Partial<Listing>;
  return (
    typeof listing.id === 'string' &&
    typeof listing.title === 'string' &&
    typeof listing.description === 'string' &&
    typeof listing.priceIqd === 'number' &&
    typeof listing.negotiable === 'boolean' &&
    typeof listing.categoryId === 'string' &&
    typeof listing.governorateId === 'string' &&
    (listing.condition === 'new' || listing.condition === 'used') &&
    Array.isArray(listing.images) &&
    listing.images.every((uri) => typeof uri === 'string') &&
    typeof listing.sellerId === 'string' &&
    typeof listing.createdAt === 'number'
  );
}

function parseLocalListings(raw: string | null): Listing[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isListing).sort(byNewest) : [];
  } catch {
    return [];
  }
}

function parseFavorites(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function ListingsProvider({ children }: { children: ReactNode }) {
  const [localListings, setLocalListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [threads] = useState<ChatThread[]>(SEED_THREADS);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  // Supabase-backed feed. When unconfigured these stay inert and the in-memory
  // SEED_LISTINGS are shown instead, so the app runs identically without keys.
  const [remoteListings, setRemoteListings] = useState<Listing[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState(isSupabaseConfigured);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setIsLoadingRemote(true);
    setRemoteError(null);
    try {
      setRemoteListings(await fetchActiveListings());
    } catch (e) {
      setRemoteError(e instanceof Error ? e.message : 'Failed to load listings');
    } finally {
      setIsLoadingRemote(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([AsyncStorage.getItem(LOCAL_LISTINGS_KEY), AsyncStorage.getItem(FAVORITES_KEY)])
      .then(([storedListings, storedFavorites]) => {
        if (!isMounted) return;
        setLocalListings(parseLocalListings(storedListings));
        setFavorites(parseFavorites(storedFavorites));
      })
      .finally(() => {
        if (isMounted) setHasLoadedStorage(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    AsyncStorage.setItem(LOCAL_LISTINGS_KEY, JSON.stringify(localListings)).catch(() => undefined);
  }, [hasLoadedStorage, localListings]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)).catch(() => undefined);
  }, [hasLoadedStorage, favorites]);

  // Real listings come from Supabase once configured; otherwise the demo seed.
  // Locally-created listings always sit on top so "post → see it" works pre-auth.
  const baseListings = isSupabaseConfigured ? remoteListings : SEED_LISTINGS;
  const listings = useMemo(
    () => [...localListings, ...baseListings].sort(byNewest),
    [localListings, baseListings],
  );

  const isLoading = !hasLoadedStorage || isLoadingRemote;

  const addListing = useCallback((input: NewListingInput) => {
    const listing: Listing = {
      ...input,
      id: `local-${Date.now()}`,
      createdAt: Date.now(),
      sellerId: DEMO_USER_ID,
    };
    setLocalListings((prev) => [listing, ...prev].sort(byNewest));
    return listing;
  }, []);

  const getListing = useCallback(
    (id: string) => listings.find((l) => l.id === id),
    [listings],
  );

  const getSeller = useCallback((id: string) => SELLERS.find((s) => s.id === id), []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const myListings = useMemo(
    () => listings.filter((l) => l.sellerId === DEMO_USER_ID),
    [listings],
  );

  const value = useMemo<ListingsContextValue>(
    () => ({
      listings,
      threads,
      favorites,
      currentUserId: DEMO_USER_ID,
      myListings,
      isLoading,
      error: remoteError,
      refetch,
      addListing,
      getListing,
      getSeller,
      toggleFavorite,
      isFavorite,
    }),
    [listings, threads, favorites, myListings, isLoading, remoteError, refetch, addListing, getListing, getSeller, toggleFavorite, isFavorite],
  );

  return <ListingsContext value={value}>{children}</ListingsContext>;
}

export function useListings() {
  const ctx = use(ListingsContext);
  if (!ctx) throw new Error('useListings must be used within a ListingsProvider');
  return ctx;
}
