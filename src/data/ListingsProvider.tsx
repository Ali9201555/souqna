import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/data/AuthProvider';
import { DEMO_USER_ID, SELLERS, SEED_LISTINGS, SEED_THREADS } from '@/data/seed';
import { createListing as apiCreateListing, fetchActiveListings } from '@/data/listingsApi';
import { isSupabaseConfigured } from '@/lib/supabase';
import { checkReportRateLimit } from '@/lib/trust/moderation';
import { submitReportToSupabase } from '@/services/reports';
import type { ChatThread, Listing, ListingReport, ReportReason, SellerProfile } from '@/types';

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
  /** Create a listing remotely (uploads local photos). Falls back to the local addListing in demo mode. */
  createListing: (input: NewListingInput) => Promise<Listing>;
  getListing: (id: string) => Listing | undefined;
  getSeller: (id: string) => SellerProfile | undefined;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  submitReport: (input: { listingId: string; reason: ReportReason; details?: string }) => Promise<ListingReport>;
};

const ListingsContext = createContext<ListingsContextValue | null>(null);

const LOCAL_LISTINGS_KEY = 'souqna.localListings';
const FAVORITES_KEY = 'souqna.favorites';
const REPORTS_KEY = 'souqna.reports';
const REPORT_TIMESTAMPS_KEY = 'souqna.reportTimestamps';

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

function parseReports(raw: string | null): ListingReport[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((report): report is ListingReport => {
      const value = report as Partial<ListingReport>;
      return (
        typeof value.id === 'string' &&
        typeof value.listingId === 'string' &&
        typeof value.reporterId === 'string' &&
        typeof value.reason === 'string' &&
        typeof value.createdAt === 'number'
      );
    }) : [];
  } catch {
    return [];
  }
}

function parseTimestamps(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((timestamp): timestamp is number => typeof timestamp === 'number') : [];
  } catch {
    return [];
  }
}

export function ListingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [localListings, setLocalListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [reports, setReports] = useState<ListingReport[]>([]);
  const [reportTimestamps, setReportTimestamps] = useState<number[]>([]);
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

    Promise.all([
      AsyncStorage.getItem(LOCAL_LISTINGS_KEY),
      AsyncStorage.getItem(FAVORITES_KEY),
      AsyncStorage.getItem(REPORTS_KEY),
      AsyncStorage.getItem(REPORT_TIMESTAMPS_KEY),
    ])
      .then(([storedListings, storedFavorites, storedReports, storedReportTimestamps]) => {
        if (!isMounted) return;
        setLocalListings(parseLocalListings(storedListings));
        setFavorites(parseFavorites(storedFavorites));
        setReports(parseReports(storedReports));
        setReportTimestamps(parseTimestamps(storedReportTimestamps));
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

  useEffect(() => {
    if (!hasLoadedStorage) return;
    AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(reports)).catch(() => undefined);
  }, [hasLoadedStorage, reports]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    AsyncStorage.setItem(REPORT_TIMESTAMPS_KEY, JSON.stringify(reportTimestamps)).catch(() => undefined);
  }, [hasLoadedStorage, reportTimestamps]);

  // Configured → the DB is the single source of truth. Demo mode → seed plus
  // locally-persisted posts ("post → see it" without a backend). Local demo
  // posts are deliberately NOT merged into the real feed — they belong to no
  // real account and would pollute it.
  const listings = useMemo(
    () =>
      isSupabaseConfigured
        ? [...remoteListings].sort(byNewest)
        : [...localListings, ...SEED_LISTINGS].sort(byNewest),
    [localListings, remoteListings],
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

  const userId = user?.id ?? null;

  const createListing = useCallback(
    async (input: NewListingInput): Promise<Listing> => {
      // Demo fallback. Sell is AuthGated, so this branch is only reachable if
      // the gate is ever relaxed or Supabase isn't configured.
      if (!isSupabaseConfigured || !userId) return addListing(input);
      const listing = await apiCreateListing(input, userId);
      // Land it in provider state before resolving so getListing()/the success
      // card's detail link work immediately; it survives the next refetch
      // because the row is status='active' in the DB. The id filter dedupes
      // against a refetch that may already have returned the new row.
      setRemoteListings((prev) => [listing, ...prev.filter((l) => l.id !== listing.id)].sort(byNewest));
      return listing;
    },
    [addListing, userId],
  );

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

  const submitReport = useCallback(async (input: { listingId: string; reason: ReportReason; details?: string }) => {
    const now = Date.now();
    const limit = checkReportRateLimit(reportTimestamps, now);
    if (!limit.allowed) {
      throw new Error('rate_limited');
    }

    const report: ListingReport = {
      id: `local-report-${now}`,
      listingId: input.listingId,
      reporterId: DEMO_USER_ID,
      reason: input.reason,
      details: input.details,
      status: 'open',
      createdAt: now,
    };

    await submitReportToSupabase({ ...input, reporterId: DEMO_USER_ID });
    setReports((prev) => [report, ...prev]);
    setReportTimestamps(limit.timestamps);
    return report;
  }, [reportTimestamps]);

  // Signed in → the auth uid (remote rows carry it); demo mode → DEMO_USER_ID.
  const ownerId = userId ?? DEMO_USER_ID;

  const myListings = useMemo(
    () => listings.filter((l) => l.sellerId === ownerId),
    [listings, ownerId],
  );

  const value = useMemo<ListingsContextValue>(
    () => ({
      listings,
      threads,
      favorites,
      currentUserId: ownerId,
      myListings,
      isLoading,
      error: remoteError,
      refetch,
      addListing,
      createListing,
      getListing,
      getSeller,
      toggleFavorite,
      isFavorite,
      submitReport,
    }),
    [listings, threads, favorites, ownerId, myListings, isLoading, remoteError, refetch, addListing, createListing, getListing, getSeller, toggleFavorite, isFavorite, submitReport],
  );

  return <ListingsContext value={value}>{children}</ListingsContext>;
}

export function useListings() {
  const ctx = use(ListingsContext);
  if (!ctx) throw new Error('useListings must be used within a ListingsProvider');
  return ctx;
}
