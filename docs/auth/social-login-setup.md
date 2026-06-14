# Souqna — Enable Social Sign-In (Google / Apple / Facebook)

**Supabase project:** `ajquupvfctyoktremvhu` · URL `https://ajquupvfctyoktremvhu.supabase.co`
**App scheme:** `souqna` · **iOS/Android bundle:** `com.souqna.app`

> The code is already correct — `signInWithOAuth` in `src/data/AuthProvider.tsx` drives
> the whole flow. Nothing below is a code change; it's all dashboard/console config.
> The buttons show "coming soon" only until a provider is enabled in Supabase.

## TL;DR — what works where

- **Web works the moment you finish Step 0 + Step 1 (Google).** No build, no extra packages.
- **Native (the button on a phone) needs a DEV BUILD, not Expo Go** — the OAuth redirect
  targets the `souqna://` scheme, which only resolves in a compiled binary. See Step 4.
- The **only** redirect URL that goes into each provider's console is the Supabase callback —
  never `souqna://`, never your app origin:

  ```
  https://ajquupvfctyoktremvhu.supabase.co/auth/v1/callback
  ```

---

## Step 0 — Supabase URL Configuration (do this once, first)

Supabase Dashboard → **Authentication → URL Configuration**:

1. **Site URL** → your production web origin (replace the default `http://localhost:3000`).
   No prod origin yet? Use your main dev origin, e.g. `http://localhost:8081`.
2. **Redirect URLs** → add all of these (shared by every provider; `**` is a glob wildcard):

   ```
   http://localhost:8081
   http://localhost:8081/**
   http://localhost:8092
   http://localhost:8092/**
   http://localhost:8093
   http://localhost:8093/**
   souqna://
   souqna:///
   souqna://**
   exp://**
   https://YOUR_PRODUCTION_ORIGIN
   https://YOUR_PRODUCTION_ORIGIN/**
   ```

   > **Native redirect is `souqna:///` (TRIPLE slash)** — that's the verified output of
   > `Linking.createURL('/')` for a custom-scheme dev build. We allowlist `souqna://`,
   > `souqna:///`, and `souqna://**` to be safe. Confirm the exact value by logging
   > `Linking.createURL('/')` once in your dev build. (`exp://` covers Expo Go, which still
   > won't complete the round-trip — Expo Go is for non-OAuth testing only.)

3. **Live env must have real keys.** `isSupabaseConfigured` is `false` whenever the URL
   contains `your-project-ref`. The `souqna-be` worktree `.env` is a **placeholder** (demo
   mode — that's why it shows seed data and "coming soon"). Real auth runs in the **`souqna`**
   checkout, whose `.env` has the live `https://ajquupvfctyoktremvhu.supabase.co` URL +
   `sb_publishable_…` key. Test social login there (or paste real keys into `souqna-be/.env`).

---

## Step 1 — Google  ·  Easy · free · web works immediately after this

**Google Cloud Console** (`https://console.cloud.google.com`):

1. Select/create a project (e.g. "Souqna").
2. **Google Auth Platform** (formerly OAuth consent screen): User type = **External**;
   App name = Souqna; set support + developer contact email; Save.
3. **Audience**: keep Publishing status = **Testing** and add your own Google account under
   **Test users** (only listed testers can sign in while in Testing). **Publish app** later —
   basic email/profile scopes need no Google review.
4. **Clients → Create client → Application type = Web application** (e.g. "Souqna Supabase Web").
5. **Authorized redirect URIs** → add EXACTLY the Supabase callback (the only one Google needs):

   ```
   https://ajquupvfctyoktremvhu.supabase.co/auth/v1/callback
   ```

6. **Authorized JavaScript origins** *(optional for this flow — add only your web origins, no
   paths, no custom scheme):* `http://localhost:8081`, `…:8092`, `…:8093`, `https://YOUR_PRODUCTION_ORIGIN`.
7. **Create** → copy the **Client ID** (`…apps.googleusercontent.com`) and **Client secret**.

**Supabase → Authentication → Providers → Google:** toggle **ON**, paste the Web
**Client ID** + **Client Secret**, leave **Skip nonce check** OFF, **Save**.

**Test now (web):** tap **Continue with Google** → redirect to Google → consent → back to your
origin with `#access_token=…` → app auto-redirects home, signed in.

> Pitfalls: pasting the app origin (not the Supabase callback) into "Authorized redirect URIs"
> → `redirect_uri_mismatch`. In Testing mode, non-test-users get `access_blocked`. If Metro
> picked a port other than 8081, add that exact origin to the Supabase Redirect URLs too.

---

## Step 2 — Facebook  ·  Medium

**Meta for Developers** (`https://developers.facebook.com`):

1. **My Apps → Create App** → use case "Authenticate and request data from users with Facebook
   Login". Name = Souqna; attach/create a Business portfolio.
2. Add the **Facebook Login** product (skip the quickstart).
3. **Facebook Login → Settings** → **Valid OAuth Redirect URIs** = the Supabase callback above;
   ensure **Client OAuth login** + **Web OAuth login** are ON; Save.
4. **Settings → Basic** → App domains = `ajquupvfctyoktremvhu.supabase.co`; add a Privacy Policy
   URL and a **Data Deletion** URL (both required to go Live). Copy **App ID** + **App secret**.

**Supabase → Authentication → Providers → Facebook:** enable, **Client ID** = App ID,
**Client Secret** = App secret, **Save**.

> ⚠️ **Email needs App Review.** Until you complete **Business Verification + App Review for the
> `email` permission**, only users with an app role (admin/developer/tester) can sign in — real
> users will FAIL because Supabase requires an email to create the account. Budget several days
> for review before launch, and add testers under **App Roles → Roles** meanwhile.

---

## Step 3 — Apple  ·  Hard · needs Apple Developer Program ($99/yr)

> Required for the iOS App Store (Guideline 4.8: offering Google/Facebook means you must offer
> Sign in with Apple). The welcome screen already hides Apple on Android.

**Apple Developer → Certificates, Identifiers & Profiles** (`https://developer.apple.com/account`):

1. **Identifiers → + → App IDs → App**: Bundle ID (Explicit) = `com.souqna.app`; enable
   **Sign in with Apple**; Register.
2. **Identifiers → + → Services IDs**: Identifier = `com.souqna.app.web` (this string is the
   Supabase "Client ID" for the web flow); Register.
3. Open the Services ID → **Sign in with Apple → Configure**: Primary App ID = `com.souqna.app`;
   **Domains and Subdomains** = `ajquupvfctyoktremvhu.supabase.co` (bare host, no `https://`/path);
   **Return URLs** = `https://ajquupvfctyoktremvhu.supabase.co/auth/v1/callback`; Save.
4. **Keys → +**: enable **Sign in with Apple**, Primary App ID = `com.souqna.app`, Register,
   **DOWNLOAD the `.p8` now** (one-time) and record the **Key ID**.
5. Record your **Team ID**, the **Key ID**, and the **.p8** contents.

**Supabase → Authentication → Providers → Apple:** enable; **Client IDs** = `com.souqna.app.web`
(add `,com.souqna.app` if you ship native iOS); generate the **Secret Key (for OAuth)** JWT with
the secret-generator linked on the Supabase Apple page (Team ID, Service ID `com.souqna.app.web`,
Key ID, `.p8` contents) and paste the resulting JWT; **Save**.

> ⚠️ **The Apple secret generator does NOT work in Safari** (known Supabase limitation,
> supabase/supabase #20301). On a Mac, Safari is the default — open it in **Firefox or a
> Chromium browser (Chrome/Edge/Brave)** or you'll get a silent/invalid result → `invalid_client`.
>
> Other gotchas: the secret JWT **expires every 6 months** — keep the `.p8` backed up (it can't
> be re-downloaded) and set a reminder to regenerate. The **Services ID** (`…web`), not the bundle
> ID, is the "Client ID". Apple rejects `http`/`localhost` return URLs — you can only test through
> the Supabase callback.

---

## Step 4 — Native dev build (to test the buttons on a phone)

Native social login **cannot** run in Expo Go. From the `souqna` checkout (real keys):

```bash
npx expo install expo-dev-client     # currently missing; eas.json already expects it
eas build --profile development --platform ios    # or android / both
# install the build on a device/simulator, then:
npx expo start --dev-client
```

On the device: tap **Continue with Google/Apple** → in-app browser opens → completes →
redirects back to `souqna:///` → session created. If you see **"redirect_to is not allowed"**,
the emitted redirect isn't in the Supabase allowlist — log `Linking.createURL('/')` and add that
exact string.

> For a polished App Store iOS build, add native Sign in with Apple later
> (`expo-apple-authentication` + `supabase.auth.signInWithIdToken`) instead of the browser flow.

---

## Verification checklist

- [ ] Web: **Continue with Google** lands home, signed in.
- [ ] Web silent failure? The welcome screen now shows **"Sign-in failed: …"** with the
      `error_description` (it used to fail silently) — almost always an origin/Site-URL/allowlist
      mismatch. Fix the exact origin (including dev port) in Supabase Redirect URLs.
- [ ] Native dev build: each enabled provider completes and redirects to `souqna:///`.
- [ ] `souqna://`, `souqna:///` present in Supabase Redirect URLs.
