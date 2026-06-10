import type { ListingCondition } from '@/types';

export const POST_TIMESTAMPS_KEY = 'souqna.postTimestamps';

const POST_WINDOW_MS = 24 * 60 * 60_000;
const MAX_POSTS_PER_WINDOW = 5;
const MIN_TITLE_LENGTH = 6;
const MAX_TITLE_LENGTH = 90;
const MAX_DESCRIPTION_LENGTH = 1_500;
const BLOCKED_CONTENT_RE =
  /(western\s*union|money\s*gram|crypto|bitcoin|usdt|gift\s*card|telegram|واتساب|تليجرام|تحويل|حوالة|عربون|بطاقة\s*شحن)/i;
const URL_RE = /https?:\/\/|www\./i;

export type ListingDraft = {
  title: string;
  description: string;
  priceIqd: number;
  categoryId: string | null;
  governorateId: string | null;
  condition: ListingCondition;
};

export type ListingDraftError = 'required' | 'title' | 'description' | 'content';

export function parsePostTimestamps(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((timestamp): timestamp is number => typeof timestamp === 'number') : [];
  } catch {
    return [];
  }
}

export function checkPostRateLimit(timestamps: number[], now = Date.now()) {
  const recent = timestamps.filter((timestamp) => now - timestamp < POST_WINDOW_MS);
  if (recent.length >= MAX_POSTS_PER_WINDOW) {
    return { allowed: false as const, timestamps: recent };
  }
  return { allowed: true as const, timestamps: [...recent, now] };
}

export function validateListingDraft(draft: ListingDraft): { ok: true } | { ok: false; code: ListingDraftError } {
  const title = draft.title.trim();
  const description = draft.description.trim();

  if (!title || !draft.categoryId || !draft.governorateId || Number.isNaN(draft.priceIqd)) {
    return { ok: false, code: 'required' };
  }
  if (title.length < MIN_TITLE_LENGTH || title.length > MAX_TITLE_LENGTH) {
    return { ok: false, code: 'title' };
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return { ok: false, code: 'description' };
  }
  if (URL_RE.test(`${title} ${description}`) || BLOCKED_CONTENT_RE.test(`${title} ${description}`)) {
    return { ok: false, code: 'content' };
  }

  return { ok: true };
}
