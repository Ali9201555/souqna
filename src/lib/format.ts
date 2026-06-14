import type { TKey } from '@/i18n/translations';

type Translate = (key: TKey, vars?: Record<string, string | number>) => string;

/**
 * Arabic/Kurdish keyboards can emit Eastern Arabic numerals; normalize to
 * ASCII so numeric parsing doesn't silently reject them.
 */
export function toAsciiDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

/** Parse a user-typed integer (any digit script); NaN-safe → undefined. */
export function parseIntField(value: string): number | undefined {
  const n = parseInt(toAsciiDigits(value).replace(/[^\d]/g, ''), 10);
  return Number.isNaN(n) ? undefined : n;
}

export function groupThousands(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatPrice(priceIqd: number, currencyLabel: string): string {
  return `${groupThousands(priceIqd)} ${currencyLabel}`;
}

/**
 * Admin-managed IQD-per-USD rate. Iraq has two rates (official CBI vs the
 * parallel/market rate the property market actually uses) and no free API
 * publishes the parallel rate reliably, so this is a manual constant we update
 * deliberately rather than a live feed. ~market rate as of mid-2026.
 */
export const IQD_PER_USD = 1460;

export function usdToIqd(usd: number): number {
  return Math.round(usd * IQD_PER_USD);
}
export function iqdToUsd(iqd: number): number {
  return Math.round(iqd / IQD_PER_USD);
}

/** "$95,000" / "١٢٠٬٠٠٠ د.ع" — the native currency, wrapped LTR-isolated so the symbol doesn't mirror in RTL. */
export function formatMoney(amount: number, currency: 'IQD' | 'USD', iqdLabel: string): string {
  const body = currency === 'USD' ? `$${groupThousands(amount)}` : `${groupThousands(amount)} ${iqdLabel}`;
  return `⁦${body}⁩`;
}

/** The non-native currency as a clearly-labelled estimate, e.g. "≈ $82,000". */
export function approxOther(amount: number, currency: 'IQD' | 'USD', iqdLabel: string): string {
  const other = currency === 'USD' ? `${groupThousands(usdToIqd(amount))} ${iqdLabel}` : `$${groupThousands(iqdToUsd(amount))}`;
  return `⁦≈ ${other}⁩`;
}

export function formatRelativeTime(createdAt: number, t: Translate): string {
  const diffMs = Date.now() - createdAt;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return t('common_justNow');
  if (minutes < 60) return t('common_minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('common_hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t('common_yesterday');
  return t('common_daysAgo', { count: days });
}
