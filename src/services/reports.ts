import { createClient } from '@supabase/supabase-js';

import type { ReportReason } from '@/types';

type SubmitReportInput = {
  listingId: string;
  reporterId: string;
  reason: ReportReason;
  details?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function submitReportToSupabase(input: SubmitReportInput) {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return { skipped: true as const };
  if (!UUID_RE.test(input.listingId) || !UUID_RE.test(input.reporterId)) return { skipped: true as const };

  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { error } = await client.from('reports').insert({
    listing_id: input.listingId,
    reporter_id: input.reporterId,
    reason: input.reason,
    details: input.details || null,
  });

  if (error) throw error;
  return { skipped: false as const };
}
