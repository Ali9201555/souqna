# Souqna — Supabase setup runbook

This is the operator checklist to stand up the backend. The schema lives in
[`migrations/`](migrations) (`0001` core schema · `0002` RLS · `0003` storage)
and reference data in [`seed.sql`](seed.sql). Nothing here runs automatically —
do it once per environment, then drop the keys into `.env` (see
[`../.env.example`](../.env.example)).

> The app runs today on an in-memory store (`src/data/ListingsProvider.tsx`)
> shaped to match this schema, so the UI works before any of this is done.
> Completing the steps below unblocks Phase 1 (wire the feed to Supabase),
> Phase 2 (auth), and beyond.

## 1. Create the project

1. https://supabase.com → **New project**. Pick the region **closest to Iraq**
   (Frankfurt / `eu-central-1` is the usual nearest) for lower latency.
2. Save the database password somewhere safe.

## 2. Apply the schema (migrations, in order)

**Option A — SQL editor (no tooling):** in the dashboard open **SQL Editor**
and run each file's contents in this exact order:

```
migrations/0001_initial_schema.sql
migrations/0002_rls_policies.sql
migrations/0003_storage.sql
```

**Option B — Supabase CLI:** with the CLI installed and the project linked
(`supabase link --project-ref <ref>`), run `supabase db push`.

`0001` enables the `pgcrypto` extension and creates a `handle_new_user`
trigger that auto-inserts a `profiles` row on signup. `0003` creates the public
`listing-images` storage bucket and its per-user write policies — **no manual
bucket creation needed.**

## 3. Load reference data

Run [`seed.sql`](seed.sql) in the SQL editor (categories + governorates). It is
idempotent (upsert) — safe to re-run. Its ids/names mirror
`src/data/categories.ts` and `src/data/governorates.ts`.

## 4. Wire the app to the project

1. **Settings → API**: copy the **Project URL** and the **anon/public** key.
2. Copy `../.env.example` to `../.env` and fill:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
   ```
3. Restart Metro so the new env is inlined: `npx expo start -c`.

The **anon key is safe to ship in the client** — RLS (`0002`) is what protects
the data. Never put the **service-role** key in `.env`/the app or commit it;
`.env*` is git-ignored on purpose.

## 5. Phone auth (Phase 2 — defer until then)

Reading listings (Phase 1) needs nothing more. When you start auth:

- **Authentication → Providers → Phone**: enable it and configure an SMS
  provider (e.g. Twilio). Iraq numbers are `+964…`.
- The `handle_new_user` trigger then creates each new user's `profiles` row
  automatically; the app edits name/photo from there.

## Verify

After step 4, a quick smoke test: query `select count(*) from categories;` in
the SQL editor (expect 11). Once the data layer is swapped to Supabase, the
Home feed should load listings from the `listings` table instead of the seed.
