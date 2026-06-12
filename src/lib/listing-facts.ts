import { DEAL_TYPE_SHORT, TRANSMISSION_LABEL } from '@/lib/attribute-labels';
import { groupThousands } from '@/lib/format';
import type { TKey } from '@/i18n/translations';
import type { Listing } from '@/types';

type Translate = (key: TKey, vars?: Record<string, string | number>) => string;

/**
 * Compact fact badges for listing cards — e.g. cars: "2019 · 78,000 km ·
 * Automatic", real estate: "Rent · 3 BR · 140 m²". Empty for listings without
 * structured attributes, so generic categories render unchanged.
 */
export function listingFacts(listing: Listing, t: Translate): string[] {
  const a = listing.attributes;
  if (a?.kind === 'vehicle') {
    const facts: string[] = [];
    if (a.year != null) facts.push(String(a.year));
    if (a.mileageKm != null) facts.push(`${groupThousands(a.mileageKm)} ${t('unit_km')}`);
    if (a.transmission != null) facts.push(t(TRANSMISSION_LABEL[a.transmission]));
    return facts;
  }
  if (a?.kind === 'property') {
    const facts: string[] = [t(DEAL_TYPE_SHORT[a.dealType])];
    if (a.bedrooms != null) facts.push(t('fact_beds', { count: a.bedrooms }));
    if (a.areaM2 != null) facts.push(`${groupThousands(a.areaM2)} ${t('unit_m2')}`);
    return facts;
  }
  return [];
}
