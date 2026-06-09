# Working on Souqna (agents & humans)

Souqna is an Arabic-first marketplace app for Iraq. Read [README.md](README.md)
for the product overview and structure, and [ROADMAP.md](ROADMAP.md) for what to
build next. This file is the contract for *how* to work here.

## Expo HAS CHANGED — read the docs first

This project is on **Expo SDK 56** (React Native 0.85, React 19). APIs differ
from older tutorials and from your training data. Before writing or changing
any code, read the exact versioned docs at
**https://docs.expo.dev/versions/v56.0.0/**. In particular:

- **expo-router** tabs come from `expo-router/js-tabs` (the bare `Tabs` export
  from `expo-router` is deprecated). We deliberately use the classic Tabs/Stack,
  not the experimental NativeTabs.
- **React 19 context**: read with `use(Context)`, provide with
  `<Context value={...}>` — there is no `.Provider`.

## Conventions (do not break these)

- **Arabic-first / RTL.** Default language is `ar`. Lay out with explicit
  `isRTL` styling (`flexDirection: isRTL ? 'row-reverse' : 'row'`,
  `textAlign: isRTL ? 'right' : 'left'`). Do not depend on `I18nManager` alone.
- **All user-facing text goes through i18n.** Add keys to `en` first in
  `src/i18n/translations.ts` (it is the source-of-truth key set), then `ar`
  (required for launch), then `ku` (best-effort). Never hardcode strings in
  components.
- **Data access goes through `useListings()`** (`src/data/ListingsProvider.tsx`).
  Keep its return shapes matching the Supabase schema in `supabase/migrations/`
  so screens don't change when the backend is wired. If you add a field, add it
  in `src/types/index.ts`, the provider, AND the SQL migration.
- **Money** is `priceIqd: number` (integer IQD). `0` = "contact for price".
- **Theme tokens only.** Use `Colors`/`Spacing`/`Radius` from
  `src/constants/theme.ts` and `useTheme()`. No raw hex or magic numbers in
  components (one-off `rgba()` overlays excepted).
- **Comments**: only when the *why* is non-obvious. No narration.

## Verification gate (must pass before committing)

```bash
npm run typecheck                 # tsc --noEmit — zero errors
npx expo export --platform web    # whole module graph must bundle
```

If you touched UI, also run `npx expo start` and exercise the screen. The
`typecheck` step needs Expo's generated `expo-env.d.ts`; running any `expo`
command once creates it (it is git-ignored on purpose).

## Git & PR workflow (multi-agent safe)

Several agents and a human operator share this repo. To avoid stepping on each
other:

- **One branch per task**, named `feat/<area>-<short-desc>` or
  `fix/<short-desc>`. Never commit straight to `master`.
- **Stage explicitly** — `git add <specific paths>`. Never `git add -A` or
  `git add .` (avoids committing secrets, editor folders, or another agent's
  in-progress files).
- **Never** `push --force`, `reset --hard` shared history, or push to `master`.
- **Never** commit secrets (`.env*`, service-role keys, signing keys).
- Open a **PR** describing what changed and how you verified it. The human
  operator reviews and merges. Don't merge your own PR.
- Keep commits scoped to one task; write messages explaining the *why*.

## Task tracking

Work is tracked as discrete tasks (see ROADMAP.md). Claim a task before starting,
keep it small, and mark it done only when the verification gate passes. If you
discover follow-up work, file it as a new task rather than expanding scope.
