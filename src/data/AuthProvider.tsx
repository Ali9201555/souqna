import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Dev-only escape hatch: hosted Supabase can't test phone OTP without Twilio,
 * but email OTP works zero-config. With this flag on, the sign-in flow routes
 * the identical two-leg OTP flow through email instead of SMS. The public
 * surface stays phone-shaped; only the input field + the API channel change.
 * Gated on __DEV__ so a release build can never ship the email channel even if
 * the env var leaks into a production build.
 */
export const AUTH_USES_EMAIL = __DEV__ && process.env.EXPO_PUBLIC_AUTH_DEV_EMAIL_OTP === 'true';

export type AuthErrorCode =
  | 'invalid_phone'
  | 'invalid_code'
  | 'rate_limited'
  | 'expired'
  | 'network'
  | 'not_configured'
  | 'unknown';

export type AuthResult = { ok: true } | { ok: false; code: AuthErrorCode };

/** A `profiles` row mapped to camelCase (see supabase/migrations/0001). */
export type Profile = {
  id: string;
  name: string;
  phone: string | null;
  avatarColor: string;
  ratingAvg: number;
  ratingCount: number;
  isPhoneVerified: boolean;
};

type AuthStatus = 'loading' | 'authenticated' | 'guest';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** The signed-in user's profile row; null while loading or before it resolves. */
  profile: Profile | null;
  status: AuthStatus;
  /** Initial session-restore only (NOT per-action). The sign-in UI owns its own pending state. */
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Send an OTP. Validates the identifier locally first. Never throws. */
  signInWithPhone: (phone: string) => Promise<AuthResult>;
  /** Verify the OTP. On success, onAuthStateChange updates state. Never throws. */
  verifyOtp: (phone: string, code: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalize Iraqi input to E.164 (+9647XXXXXXXXX), or null if invalid. */
function normalizeIraqiPhone(input: string): string | null {
  let local = input.replace(/\D/g, '');
  if (local.startsWith('00964')) local = local.slice(5);
  else if (local.startsWith('964')) local = local.slice(3);
  if (local.startsWith('0')) local = local.slice(1);
  return /^7\d{9}$/.test(local) ? `+964${local}` : null;
}

/** Map a supabase-js AuthError to our coarse, translatable code. */
function mapError(error: { message?: string; status?: number; code?: string } | null): AuthErrorCode {
  if (!error) return 'unknown';
  const msg = (error.message ?? '').toLowerCase();
  if (error.status === 429 || msg.includes('rate limit') || (error.code ?? '').includes('rate')) return 'rate_limited';
  if (msg.includes('expired')) return 'expired';
  if (msg.includes('invalid') && (msg.includes('otp') || msg.includes('token') || msg.includes('code'))) return 'invalid_code';
  if (msg.includes('network') || msg.includes('failed to fetch')) return 'network';
  return 'unknown';
}

type ProfileRow = {
  id: string;
  name: string;
  phone: string | null;
  avatar_color: string;
  rating_avg: number | string;
  rating_count: number;
  is_phone_verified: boolean;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'guest');
  const [profile, setProfile] = useState<Profile | null>(null);

  // Restore the persisted session on launch, then track auth changes. The
  // onAuthStateChange callback is kept to setState ONLY — calling other
  // supabase.auth.* methods inside it can deadlock the client.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setStatus(data.session ? 'authenticated' : 'guest');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setStatus(next ? 'authenticated' : 'guest');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load the profile row when the user changes (separate from onAuthStateChange).
  // The handle_new_user trigger creates the row on signup, so this is read-only.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      setProfile(null);
      return;
    }
    let mounted = true;
    supabase
      .from('profiles')
      .select('id, name, phone, avatar_color, rating_avg, rating_count, is_phone_verified')
      .eq('id', userId)
      .maybeSingle()
      .then(
        ({ data, error }) => {
          // On error the profile just stays null — gating never depends on it.
          if (!mounted || error || !data) return;
          const row = data as ProfileRow;
          setProfile({
            id: row.id,
            name: row.name,
            phone: row.phone,
            avatarColor: row.avatar_color,
            ratingAvg: Number(row.rating_avg) || 0,
            ratingCount: row.rating_count,
            isPhoneVerified: row.is_phone_verified,
          });
        },
        () => undefined,
      );
    return () => {
      mounted = false;
    };
  }, [userId]);

  const signInWithPhone = useCallback(async (input: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { ok: false, code: 'not_configured' };
    if (AUTH_USES_EMAIL) {
      const email = input.trim();
      if (!EMAIL_RE.test(email)) return { ok: false, code: 'invalid_phone' };
      // On web, send the magic link back to this origin so clicking it lands
      // in the app already signed in (detectSessionInUrl picks up the tokens).
      // The origin must be allowed in Supabase URL Configuration — the default
      // Site URL is http://localhost:3000, so dev-test with `--port 3000`.
      const emailRedirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } });
      return error ? { ok: false, code: mapError(error) } : { ok: true };
    }
    const phone = normalizeIraqiPhone(input);
    if (!phone) return { ok: false, code: 'invalid_phone' };
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return error ? { ok: false, code: mapError(error) } : { ok: true };
  }, []);

  const verifyOtp = useCallback(async (input: string, code: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { ok: false, code: 'not_configured' };
    const token = code.replace(/\D/g, '');
    if (AUTH_USES_EMAIL) {
      const email = input.trim();
      if (!EMAIL_RE.test(email)) return { ok: false, code: 'invalid_phone' };
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      return error ? { ok: false, code: mapError(error) } : { ok: true };
    }
    const phone = normalizeIraqiPhone(input);
    if (!phone) return { ok: false, code: 'invalid_phone' };
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    return error ? { ok: false, code: mapError(error) } : { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut({ scope: 'local' });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      status,
      isLoading: status === 'loading',
      isAuthenticated: status === 'authenticated',
      signInWithPhone,
      verifyOtp,
      signOut,
    }),
    [session, profile, status, signInWithPhone, verifyOtp, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
