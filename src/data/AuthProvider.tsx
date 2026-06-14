import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

// Lets a native OAuth browser tab hand control back to the app on redirect.
WebBrowser.maybeCompleteAuthSession();

/** Social identity providers offered on the welcome screen. */
export type OAuthProvider = 'google' | 'apple' | 'facebook';

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
  | 'invalid_email'
  | 'invalid_code'
  | 'invalid_credentials'
  | 'email_in_use'
  | 'email_not_confirmed'
  | 'weak_password'
  | 'rate_limited'
  | 'expired'
  | 'network'
  | 'not_configured'
  | 'cancelled'
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
  /**
   * Create an account with email + password. The name rides in user metadata,
   * so the handle_new_user trigger fills profiles.name server-side. Resolves
   * `pendingConfirmation` when the project requires email confirmation.
   */
  signUpWithPassword: (input: { name: string; email: string; password: string }) => Promise<SignUpResult>;
  /** Email + password sign-in. Never throws. */
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  /**
   * OAuth sign-in (Google/Apple/Facebook). Web does a full-page redirect; native
   * opens an in-app browser and completes the PKCE/implicit handshake by hand.
   * Returns `not_configured` in demo mode and `cancelled` if the user backs out.
   * The provider must be enabled in Supabase Auth + the redirect URL allowlisted.
   */
  signInWithOAuth: (provider: OAuthProvider) => Promise<AuthResult>;
  /** A failed web OAuth redirect's error text (disabled provider / origin not allowlisted), surfaced so it isn't silent. */
  oauthError: string | null;
  /** Dismiss the surfaced OAuth error. */
  clearOAuthError: () => void;
  /** Send a password-reset email. The link signs the user in for /reset-password. */
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  /** Set a new password for the signed-in (or recovery) session. */
  updatePassword: (password: string) => Promise<AuthResult>;
  /** Set the signed-in user's display name on their profile row. Never throws. */
  setDisplayName: (name: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

export type SignUpResult = AuthResult | { ok: true; pendingConfirmation: true };

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
  const code = error.code ?? '';
  if (error.status === 429 || msg.includes('rate limit') || code.includes('rate')) return 'rate_limited';
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) return 'invalid_credentials';
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) return 'email_not_confirmed';
  if (code === 'weak_password' || msg.includes('password should be')) return 'weak_password';
  if (code === 'user_already_exists' || msg.includes('already registered')) return 'email_in_use';
  if (msg.includes('expired')) return 'expired';
  if (msg.includes('invalid') && (msg.includes('otp') || msg.includes('token') || msg.includes('code'))) return 'invalid_code';
  if (msg.includes('network') || msg.includes('failed to fetch')) return 'network';
  return 'unknown';
}

/**
 * On web, an OAuth redirect that FAILED (provider not enabled, or the origin
 * isn't in Supabase's Redirect-URL allowlist) comes back as `?error=…` / `#error=…`
 * at page load — outside any awaited call — so it would otherwise vanish silently.
 * Read it once at mount so the sign-in UI can show why nothing happened.
 */
function readOAuthErrorFromUrl(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return q.get('error_description') || h.get('error_description') || q.get('error') || h.get('error');
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
  // Captured before supabase-js's URL detection runs (state initializer = first render).
  const [oauthError, setOauthError] = useState<string | null>(() => readOAuthErrorFromUrl());

  // Strip the error params from the address bar so a reload doesn't resurface them.
  useEffect(() => {
    if (Platform.OS === 'web' && oauthError && typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
    // Run once on mount; reading the initial oauthError is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const clearOAuthError = useCallback(() => setOauthError(null), []);

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

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setStatus(next ? 'authenticated' : 'guest');
      // A reset link landed us in a recovery session — collect the new password.
      // (Navigation only here; supabase.auth.* calls inside this callback deadlock.)
      if (event === 'PASSWORD_RECOVERY') router.push('/reset-password');
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

  const signUpWithPassword = useCallback(
    async ({ name, email, password }: { name: string; email: string; password: string }): Promise<SignUpResult> => {
      if (!isSupabaseConfigured) return { ok: false, code: 'not_configured' };
      const trimmedEmail = email.trim();
      if (!EMAIL_RE.test(trimmedEmail)) return { ok: false, code: 'invalid_email' };
      if (password.length < 8) return { ok: false, code: 'weak_password' };
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        // handle_new_user reads raw_user_meta_data->>'name' into profiles.name.
        options: { data: { name: name.trim() } },
      });
      if (error) return { ok: false, code: mapError(error) };
      // With email confirmation ON, an already-registered email returns an
      // obfuscated user with no identities instead of an error.
      if (data.user && (data.user.identities?.length ?? 0) === 0) return { ok: false, code: 'email_in_use' };
      if (!data.session) return { ok: true, pendingConfirmation: true };
      return { ok: true };
    },
    [],
  );

  const signInWithPassword = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { ok: false, code: 'not_configured' };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { ok: false, code: mapError(error) } : { ok: true };
  }, []);

  const signInWithOAuth = useCallback(async (provider: OAuthProvider): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { ok: false, code: 'not_configured' };
    try {
      // Web: let supabase-js own the full-page redirect; the session is picked up
      // on return via detectSessionInUrl. (No code runs after this resolves.)
      if (Platform.OS === 'web') {
        const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
        const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
        return error ? { ok: false, code: mapError(error) } : { ok: true };
      }
      // Native: open the provider in a system browser, then exchange the tokens
      // the redirect hands back. redirectTo (Linking.createURL('/') → `souqna:///`
      // in a dev/standalone build, `exp://…` in Expo Go) must be in Supabase's
      // allowlist; deep-linking only resolves in a built binary, never Expo Go.
      const redirectTo = Linking.createURL('/');
      // Pre-warm Android Custom Tabs so the auth tab opens instantly and the
      // redirect back into the app isn't missed on a cold browser start.
      if (Platform.OS === 'android') await WebBrowser.warmUpAsync().catch(() => undefined);
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) return { ok: false, code: mapError(error) };
        if (!data?.url) return { ok: false, code: 'unknown' };

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type !== 'success') return { ok: false, code: 'cancelled' };

        // The handshake returns either a PKCE `code` or raw tokens (implicit).
        const returned = result.url;
        const fragment = returned.includes('#') ? returned.split('#')[1] : '';
        const query = returned.includes('?') ? returned.split('?')[1].split('#')[0] : '';
        const params = new URLSearchParams(fragment || query);
        const code = params.get('code');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (code) {
          const { error: xErr } = await supabase.auth.exchangeCodeForSession(code);
          return xErr ? { ok: false, code: mapError(xErr) } : { ok: true };
        }
        if (accessToken && refreshToken) {
          const { error: sErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          return sErr ? { ok: false, code: mapError(sErr) } : { ok: true };
        }
        return { ok: false, code: 'unknown' };
      } finally {
        if (Platform.OS === 'android') WebBrowser.coolDownAsync().catch(() => undefined);
      }
    } catch {
      return { ok: false, code: 'network' };
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { ok: false, code: 'not_configured' };
    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) return { ok: false, code: 'invalid_email' };
    // No redirectTo: the link goes to the Site URL, where detectSessionInUrl
    // (web) creates a recovery session and PASSWORD_RECOVERY routes the user
    // to /reset-password.
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
    return error ? { ok: false, code: mapError(error) } : { ok: true };
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { ok: false, code: 'not_configured' };
    if (password.length < 8) return { ok: false, code: 'weak_password' };
    const { error } = await supabase.auth.updateUser({ password });
    return error ? { ok: false, code: mapError(error) } : { ok: true };
  }, []);

  const setDisplayName = useCallback(
    async (name: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return { ok: false, code: 'not_configured' };
      const trimmed = name.trim();
      const uid = session?.user.id;
      if (!uid || !trimmed) return { ok: false, code: 'unknown' };
      const { error } = await supabase.from('profiles').update({ name: trimmed }).eq('id', uid);
      if (error) return { ok: false, code: mapError(error) };
      // The fetch effect delivers the canonical row; this keeps the UI instant.
      setProfile((prev) => (prev ? { ...prev, name: trimmed } : prev));
      return { ok: true };
    },
    [session],
  );

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
      signUpWithPassword,
      signInWithPassword,
      signInWithOAuth,
      oauthError,
      clearOAuthError,
      requestPasswordReset,
      updatePassword,
      setDisplayName,
      signOut,
    }),
    [session, profile, status, oauthError, clearOAuthError, signInWithPhone, verifyOtp, signUpWithPassword, signInWithPassword, signInWithOAuth, requestPasswordReset, updatePassword, setDisplayName, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
