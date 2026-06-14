-- Souqna marketplace — enable Realtime for chat
-- Run after 0007_listing_attributes.sql.
--
-- Postgres Changes only stream from tables in the `supabase_realtime`
-- publication. RLS still applies to the stream automatically (participants-only
-- message/thread SELECT policies from 0002), so no extra realtime-auth setup is
-- needed — just publish the tables.

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chat_threads;
