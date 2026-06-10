import type { ReportReason } from '@/types';

export const REPORT_REASONS: ReportReason[] = ['scam', 'prohibited', 'duplicate', 'sold', 'offensive', 'other'];

const REPORT_WINDOW_MS = 60 * 60_000;
const MAX_REPORTS_PER_WINDOW = 5;
const MIN_DETAILS_LENGTH = 8;
const MAX_DETAILS_LENGTH = 500;

type RateLimitInput = {
  now: number;
  timestamps: number[];
  windowMs: number;
  limit: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAt?: number;
  timestamps: number[];
};

export function checkRateLimit({ now, timestamps, windowMs, limit }: RateLimitInput): RateLimitResult {
  const recent = timestamps.filter((timestamp) => now - timestamp < windowMs);
  if (recent.length >= limit) {
    return { allowed: false, retryAt: Math.min(...recent) + windowMs, timestamps: recent };
  }
  return { allowed: true, timestamps: [...recent, now] };
}

export function checkReportRateLimit(timestamps: number[], now = Date.now()) {
  return checkRateLimit({
    now,
    timestamps,
    windowMs: REPORT_WINDOW_MS,
    limit: MAX_REPORTS_PER_WINDOW,
  });
}

export function cleanReportDetails(details: string) {
  return details.trim().replace(/\s+/g, ' ').slice(0, MAX_DETAILS_LENGTH);
}

export function validateReport(reason: ReportReason | null, details: string) {
  const cleanedDetails = cleanReportDetails(details);
  if (!reason || !REPORT_REASONS.includes(reason)) return { ok: false as const, code: 'reason' as const };
  if (reason === 'other' && cleanedDetails.length < MIN_DETAILS_LENGTH) {
    return { ok: false as const, code: 'details' as const };
  }
  return { ok: true as const, details: cleanedDetails };
}
