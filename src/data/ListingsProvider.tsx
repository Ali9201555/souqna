import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { DEMO_USER_ID, SELLERS, SEED_LISTINGS, SEED_THREADS } from '@/data/seed';
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
  reports: ListingReport[];
  currentUserId: string;
  myListings: Listing[];
  addListing: (input: NewListingInput) => Listing;
  getListing: (id: string) => Listing | undefined;
  getSeller: (id: string) => SellerProfile | undefined;
  reportListing: (listingId: string, reason: ReportReason) => ListingReport;
  hasReportedListing: (listingId: string) => boolean;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
};

const ListingsContext = createContext<ListingsContextValue | null>(null);

const LOCAL_LISTINGS_KEY = 'souqna.localListings';
const FAVORITES_KEY = 'souqna.favorites';
const REPORTS_KEY = 'souqna.reports';

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

function isReport(value: unknown): value is ListingReport {
  if (value == null || typeof value !== 'object') return false;
  const report = value as Partial<ListingReport>;
  return (
    typeof report.id === 'string' &&
    typeof report.listingId === 'string' &&
    typeof report.reporterId === 'string' &&
    (report.reason === 'spam' ||
      report.reason === 'fraud' ||
      report.reason === 'prohibited' ||
      report.reason === 'duplicate' ||
      report.reason === 'other') &&
    typeof report.createdAt === 'number'
  );
}

function parseReports(raw: string | null): ListingReport[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isReport).sort((a, b) => b.createdAt - a.createdAt) : [];
  } catch {
    return [];
  }
}

export function ListingsProvider({ children }: { children: ReactNode }) {
  const [localListings, setLocalListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [reports, setReports] = useState<ListingReport[]>([]);
  const [threads] = useState<ChatThread[]>(SEED_THREADS);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  useEffect(() => {
    let isMounted = true;

    Promise.all([AsyncStorage.getItem(LOCAL_LISTINGS_KEY), AsyncStorage.getItem(FAVORITES_KEY), AsyncStorage.getItem(REPORTS_KEY)])
      .then(([storedListings, storedFavorites, storedReports]) => {
        if (!isMounted) return;
        setLocalListings(parseLocalListings(storedListings));
        setFavorites(parseFavorites(storedFavorites));
        setReports(parseReports(storedReports));
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

  const listings = useMemo(() => [...localListings, ...SEED_LISTINGS].sort(byNewest), [localListings]);

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

  const reportListing = useCallback(
    (listingId: string, reason: ReportReason) => {
      const existing = reports.find((report) => report.listingId === listingId && report.reporterId === DEMO_USER_ID);
      if (existing) return existing;

      const report: ListingReport = {
        id: `report-${Date.now()}`,
        listingId,
        reporterId: DEMO_USER_ID,
        reason,
        createdAt: Date.now(),
      };
      setReports((prev) => [report, ...prev]);
      return report;
    },
    [reports],
  );

  const hasReportedListing = useCallback(
    (listingId: string) => reports.some((report) => report.listingId === listingId && report.reporterId === DEMO_USER_ID),
    [reports],
  );

  const myListings = useMemo(
    () => listings.filter((l) => l.sellerId === DEMO_USER_ID),
    [listings],
  );

  const value = useMemo<ListingsContextValue>(
    () => ({
      listings,
      threads,
      favorites,
      reports,
      currentUserId: DEMO_USER_ID,
      myListings,
      addListing,
      getListing,
      getSeller,
      reportListing,
      hasReportedListing,
      toggleFavorite,
      isFavorite,
    }),
    [
      listings,
      threads,
      favorites,
      reports,
      myListings,
      addListing,
      getListing,
      getSeller,
      reportListing,
      hasReportedListing,
      toggleFavorite,
      isFavorite,
    ],
  );

  return <ListingsContext value={value}>{children}</ListingsContext>;
}

export function useListings() {
  const ctx = use(ListingsContext);
  if (!ctx) throw new Error('useListings must be used within a ListingsProvider');
  return ctx;
}
