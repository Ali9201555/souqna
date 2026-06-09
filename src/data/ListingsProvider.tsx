import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';

import { DEMO_USER_ID, SELLERS, SEED_LISTINGS, SEED_THREADS } from '@/data/seed';
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
  addListing: (input: NewListingInput) => Listing;
  getListing: (id: string) => Listing | undefined;
  getSeller: (id: string) => SellerProfile | undefined;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
};

const ListingsContext = createContext<ListingsContextValue | null>(null);

const byNewest = (a: Listing, b: Listing) => b.createdAt - a.createdAt;

export function ListingsProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<Listing[]>(() => [...SEED_LISTINGS].sort(byNewest));
  const [favorites, setFavorites] = useState<string[]>([]);
  const [threads] = useState<ChatThread[]>(SEED_THREADS);

  const addListing = useCallback((input: NewListingInput) => {
    const listing: Listing = {
      ...input,
      id: `local-${Date.now()}`,
      createdAt: Date.now(),
      sellerId: DEMO_USER_ID,
    };
    setListings((prev) => [listing, ...prev].sort(byNewest));
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
      addListing,
      getListing,
      getSeller,
      toggleFavorite,
      isFavorite,
    }),
    [listings, threads, favorites, myListings, addListing, getListing, getSeller, toggleFavorite, isFavorite],
  );

  return <ListingsContext value={value}>{children}</ListingsContext>;
}

export function useListings() {
  const ctx = use(ListingsContext);
  if (!ctx) throw new Error('useListings must be used within a ListingsProvider');
  return ctx;
}
