import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True only when real Supabase credentials are present. The `.env.example`
 * placeholders (`your-project-ref` / `your-anon-public-key`) count as "not
 * configured", so the app falls back to its in-memory data layer until an
 * operator pastes real keys (runbook: supabase/README.md). When this flips to
 * true, the listings feed reads from Supabase with no further code changes.
 */
export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project-ref') &&
  !supabaseAnonKey.includes('your-anon');

function notConfigured(): never {
  throw new Error(
    'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY in .env (copy .env.example). Guard live ' +
      'calls with `isSupabaseConfigured`. Session persistence is added in Phase 2.',
  );
}

/**
 * The Supabase client. Importing this module is always safe — when credentials
 * are missing, any *use* of the client throws (callers gate on
 * `isSupabaseConfigured`). Auth storage / session persistence lands in Phase 2.
 */
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : new Proxy({} as SupabaseClient, { get: notConfigured });
