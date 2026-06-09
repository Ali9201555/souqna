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
- [ ] Apply migrations + `seed.sql` to a Supabase project
      (`supabase db push` / SQL editor)
- [ ] Swap `ListingsProvider` internals to query Supabase (listings feed,
      single listing, create listing) — keep the same hook surface so screens
      don't change
- [ ] Upload listing photos to the `listing-images` storage bucket from the
      Sell screen (replace the picsum placeholder URLs)
- [ ] Loading / empty / error states for network calls

## Phase 2 — Auth (phone / OTP)

- [ ] Phone sign-in flow (Supabase OTP) behind the Profile "sign in" button
- [ ] Profile auto-created via the `handle_new_user` trigger; edit name/photo
- [ ] Gate Sell + starting a chat behind auth; show sign-in prompt otherwise
- [ ] Persist session (AsyncStorage) and restore on launch

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
- [ ] Seller verification badge driven by `is_phone_verified`
- [ ] Rate-limit posting / reporting; basic content checks

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
