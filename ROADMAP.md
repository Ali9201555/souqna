# Souqna roadmap

Phased plan from the current MVP to launch. Check items off as they land. Keep
each PR scoped to one item where possible. See [AGENTS.md](AGENTS.md) for the
verification gate and git workflow.

## Phase 0 — Foundation ✅ (done)

- [x] Expo SDK 56 + TypeScript scaffold, path alias `@/*`
- [x] Theme tokens (light/dark Colors, Spacing, Radius) + `useTheme`
- [x] i18n provider (ar / ku / en) with English-fallback + RTL handling
- [x] Domain types (`src/types`) + swappable in-memory data layer
- [x] Tabs (Home, Search, Sell, Chats, Profile) + listing detail route
- [x] Reusable UI: Screen, ListingCard, CategoryStrip, PickerSheet, Avatar
- [x] Supabase schema: profiles, categories, governorates, listings,
      listing_images, favorites, chat_threads, messages, reports + RLS + storage
- [x] Verification: `typecheck` clean, web export bundles all routes

## Phase 1 — Wire the backend (Supabase)

- [x] Add `@supabase/supabase-js`; create `src/lib/supabase.ts` reading
      `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (document in
      `.env.example`, never commit real keys)
- [x] Apply migrations + `seed.sql` to a Supabase project (live: Frankfurt,
      0001–0005 applied; 0004 locks down profiles PII, 0005 caps the bucket)
- [x] Swap `ListingsProvider` internals to query Supabase (listings feed,
      single listing, create listing) — keep the same hook surface so screens
      don't change
- [x] Upload listing photos to the `listing-images` storage bucket from the
      Sell screen (expo-image-picker → ArrayBuffer upload; http(s) URLs pass
      through)
- [x] Loading / empty / error states for network calls (`ListState`)

## Phase 2 — Auth (phone / OTP)

- [x] Phone sign-in flow (Supabase OTP) behind the Profile "sign in" button
      (phone-first; dev email-OTP path until Twilio — e2e pends the
      `{{ .Token }}` email-template step in the dashboard)
- [ ] Profile auto-created via the `handle_new_user` trigger (done); edit
      name/photo UI still to build
- [ ] Gate Sell behind auth (done via `AuthGate`); gate starting a chat when
      chat lands (Phase 3)
- [x] Persist session (AsyncStorage) and restore on launch

## Phase 3 — Chat (realtime)

- [ ] Thread list from `chat_threads`; open a thread from a listing
- [ ] Message view with send; insert into `messages` (trigger updates preview +
      unread)
- [ ] Realtime subscription for incoming messages; mark-as-read clears unread
- [ ] Push notifications for new messages (expo-notifications)

## Phase 4 — Discovery & search

- [ ] Server-side filtering (category, governorate, query) + pagination
- [ ] Sort options (newest, price); consider Postgres full-text on title/desc
- [ ] Favorites synced to the `favorites` table; "Saved" screen in Profile

## Phase 5 — Trust & safety

- [ ] Report flow writes to `reports`; basic admin/triage (service-role tool)
      (local-first flow + triage script landed; remote insert needs routing
      through the shared authed client — currently skips)
- [x] Seller verification badge driven by `is_phone_verified`
- [x] Rate-limit posting / reporting; basic content checks

## Phase 6 — Launch hardening

- [ ] Brand assets: app icon + splash in Souqna green (`#0E8F6E`), replace Expo
      template art; set splash `backgroundColor` to brand
- [x] EAS Build profiles (preview + production) for iOS & Android
- [ ] Store listings in Arabic (screenshots, description, keywords)
- [ ] Kurdish (Sorani) translation review by a native speaker
- [ ] Analytics + crash reporting; performance pass on large lists
- [ ] Privacy policy / terms (required for stores)

## Nice-to-have (later)

- [ ] Saved searches + alerts
- [ ] In-app price suggestions by category
- [ ] Map view / location radius for listings
- [ ] Arabic number formatting option
