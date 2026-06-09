import type { TKey } from '@/i18n/translations';

type Translate = (key: TKey, vars?: Record<string, string | number>) => string;

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
