import { createClient } from '@supabase/supabase-js';

const [, , action = 'list', reportId, nextStatus] = process.argv;
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running report triage.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

if (action === 'list') {
  const { data, error } = await supabase
    .from('reports')
    .select('id, listing_id, reporter_id, reason, details, status, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) throw error;
  console.table(data);
} else if (action === 'set-status' && reportId && ['reviewed', 'dismissed'].includes(nextStatus)) {
  const { error } = await supabase.from('reports').update({ status: nextStatus }).eq('id', reportId);
  if (error) throw error;
  console.log(`Report ${reportId} marked ${nextStatus}.`);
} else {
  console.error('Usage: node scripts/triage-reports.mjs list | set-status <report-id> <reviewed|dismissed>');
  process.exit(1);
}
