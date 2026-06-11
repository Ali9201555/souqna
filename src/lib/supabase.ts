import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

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
 * `isSupabaseConfigured`). Configured with AsyncStorage session persistence so
 * a signed-in user survives app restarts (Phase 2 auth).
 */
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        // Native: persist to AsyncStorage. Web: omit it so supabase-js uses its
        // SSR-safe localStorage adapter — react-native-web's AsyncStorage reads
        // `window` unguarded, which crashes static web export (it still persists
        // to localStorage in the browser).
        ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
        autoRefreshToken: true,
        persistSession: true,
        // Web: pick the session out of a magic-link redirect (#access_token=…)
        // so clicking the sign-in email lands the user back in the app signed
        // in. Native has no URL fragment to parse — deep-link auth would need
        // scheme plumbing we don't want for a dev-only email flow.
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : new Proxy({} as SupabaseClient, { get: notConfigured });

// Native only: tie the token-refresh loop to app foreground so a backgrounded
// timer can't silently let the access token expire. Guarded by
// `isSupabaseConfigured` because the not-configured Proxy throws on `.auth`
// access; skipped on web, where react-native-web manages visibility itself.
if (isSupabaseConfigured && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
