import type { DealType, Listing, PropertyType, Transmission } from '@/types';

/**
 * Section filter state + pure predicates. These predicates are the contract
 * for filter semantics in BOTH modes: they run client-side today, and the
 * Phase-4 server-side jsonb queries must mirror them exactly — numbers compare
 * numerically, and a listing MISSING a filtered key is EXCLUDED (matching SQL
 * NULL semantics for `attributes->key` comparisons).
 */

export type PriceRange = { min?: number; max?: number };

export type VehicleFilters = {
  make?: string;
  /** Model id; only meaningful alongside a make. */
  model?: string;
  /** Free-text trim, matched case-insensitively as a substring. */
  trim?: string;
  yearMin?: number;
  mileageMax?: number;
  transmission?: Transmission;
  price?: PriceRange;
};

export type PropertyFilters = {
  /** undefined = both sale and rent. */
  dealType?: DealType;
  propertyType?: PropertyType;
  bedroomsMin?: number;
  areaM2Min?: number;
  price?: PriceRange;
};

/**
 * `priceIqd === 0` means "contact for price": it never matches a price filter
 * (parity with the search screen's push-zero-to-end convention).
 */
function matchesPrice(priceIqd: number, range: PriceRange | undefined): boolean {
  if (!range || (range.min == null && range.max == null)) return true;
  if (priceIqd <= 0) return false;
  if (range.min != null && priceIqd < range.min) return false;
  if (range.max != null && priceIqd > range.max) return false;
  return true;
}

export function matchesVehicleFilters(listing: Listing, f: VehicleFilters): boolean {
  if (!matchesPrice(listing.priceIqd, f.price)) return false;
  const a = listing.attributes;
  const v = a?.kind === 'vehicle' ? a : undefined;
  if (f.make != null && v?.make !== f.make) return false;
  if (f.model != null && v?.model !== f.model) return false;
  if (f.trim != null && f.trim.trim() !== '') {
    const needle = f.trim.trim().toLowerCase();
    if (!(v?.trim ?? '').toLowerCase().includes(needle)) return false;
  }
  if (f.yearMin != null && (v?.year == null || v.year < f.yearMin)) return false;
  if (f.mileageMax != null && (v?.mileageKm == null || v.mileageKm > f.mileageMax)) return false;
  if (f.transmission != null && v?.transmission !== f.transmission) return false;
  return true;
}

export function matchesPropertyFilters(listing: Listing, f: PropertyFilters): boolean {
  if (!matchesPrice(listing.priceIqd, f.price)) return false;
  const a = listing.attributes;
  const p = a?.kind === 'property' ? a : undefined;
  if (f.dealType != null && p?.dealType !== f.dealType) return false;
  if (f.propertyType != null && p?.propertyType !== f.propertyType) return false;
  if (f.bedroomsMin != null && (p?.bedrooms == null || p.bedrooms < f.bedroomsMin)) return false;
  if (f.areaM2Min != null && (p?.areaM2 == null || p.areaM2 < f.areaM2Min)) return false;
  return true;
}
