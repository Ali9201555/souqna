-- Souqna marketplace — revoke write grants on profiles_public
-- Run after 0005_storage_limits.sql.
--
-- Supabase's default privileges grant ALL on new objects in public to
-- anon/authenticated, and a simple single-table view is auto-updatable in
-- Postgres. Because profiles_public is SECURITY DEFINER (0004, intentional —
-- it hides `phone`), those inherited write grants let any anon-key holder
-- INSERT/UPDATE/DELETE profiles *through the view*, bypassing RLS — e.g.
-- faking is_phone_verified. Found via the dashboard security advisor;
-- write path confirmed blocked (42501) after this fix.
--
-- Lesson for future migrations: every new VIEW in public needs this same
-- revoke; RLS does not apply to definer views and grants are the only gate.

revoke insert, update, delete, references, trigger, truncate
  on public.profiles_public
  from anon, authenticated, public;

grant select on public.profiles_public to anon, authenticated;
