-- Souqna marketplace — lock down profiles PII
-- Run after 0003_storage.sql.
--
-- RLS is row-level, not column-level: the original "viewable by everyone"
-- SELECT policy exposed every column of profiles — including `phone` — to any
-- anon-key holder, allowing bulk harvesting of users' real mobile numbers.
-- Fix: the base table becomes owner-readable only, and public consumers (seller
-- cards, chat headers) read the column-safe `profiles_public` view instead.

drop policy "profiles are viewable by everyone" on profiles;

create policy "users read their own profile"
  on profiles for select
  using (auth.uid() = id);

-- Public seller-facing projection WITHOUT phone. security_invoker=false (the
-- default, stated explicitly) makes the view run as its owner, which bypasses
-- the base table's owner-only RLS — that is intentional: these columns are the
-- public surface.
create view public.profiles_public
with (security_invoker = false) as
  select id, name, avatar_color, rating_avg, rating_count, is_phone_verified, created_at
  from profiles;

comment on view public.profiles_public is
  'Column-safe public projection of profiles (no phone). Use this for seller cards/chat headers; the base table is owner-only.';

grant select on public.profiles_public to anon, authenticated;
