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
