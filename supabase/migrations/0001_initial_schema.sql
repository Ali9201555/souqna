-- Souqna marketplace — core schema
-- Postgres / Supabase. Run order: 0001 (this) → 0002_rls_policies → 0003_storage.
-- Reference data (categories, governorates) is loaded separately from supabase/seed.sql.

set check_function_bodies = off;

create extension if not exists pgcrypto;

-- ── Enums ────────────────────────────────────────────────────────────────────
create type listing_condition as enum ('new', 'used');
create type listing_status as enum ('active', 'sold', 'removed');
create type report_status as enum ('open', 'reviewed', 'dismissed');

-- ── Shared trigger: keep updated_at current ───────────────────────────────────
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── profiles ──────────────────────────────────────────────────────────────────
-- One row per authenticated user; id mirrors auth.users.id.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  phone text,
  avatar_color text not null default '#0E8F6E',
  rating_avg numeric(2,1) not null default 0,
  rating_count integer not null default 0,
  is_phone_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row when a user signs up (phone/OTP auth).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone, is_phone_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.phone,
    new.phone is not null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Reference data: categories & governorates ─────────────────────────────────
-- Text ids match the client constants in src/data/categories.ts and
-- src/data/governorates.ts, so existing screens keep working unchanged.
create table categories (
  id text primary key,
  icon text not null,            -- Ionicons glyph name
  name_ar text not null,
  name_ku text not null,
  name_en text not null,
  sort_order integer not null default 0
);

create table governorates (
  id text primary key,
  name_ar text not null,
  name_ku text not null,
  name_en text not null,
  sort_order integer not null default 0
);

-- ── listings ──────────────────────────────────────────────────────────────────
create table listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  price_iqd bigint not null default 0,          -- 0 means "contact for price"
  negotiable boolean not null default false,
  category_id text not null references categories (id),
  governorate_id text not null references governorates (id),
  condition listing_condition not null default 'used',
  status listing_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_non_negative check (price_iqd >= 0)
);

create index listings_seller_idx on listings (seller_id);
create index listings_category_idx on listings (category_id) where status = 'active';
create index listings_governorate_idx on listings (governorate_id) where status = 'active';
create index listings_active_created_idx on listings (created_at desc) where status = 'active';

create trigger listings_set_updated_at
  before update on listings
  for each row execute function set_updated_at();

-- ── listing_images ────────────────────────────────────────────────────────────
create table listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index listing_images_listing_idx on listing_images (listing_id, sort_order);

-- ── favorites ───────────────────────────────────────────────────────────────────
create table favorites (
  user_id uuid not null references profiles (id) on delete cascade,
  listing_id uuid not null references listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index favorites_listing_idx on favorites (listing_id);

-- ── chat_threads ────────────────────────────────────────────────────────────────
-- One thread per (listing, buyer). Unread counts are kept per participant.
create table chat_threads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  buyer_id uuid not null references profiles (id) on delete cascade,
  seller_id uuid not null references profiles (id) on delete cascade,
  last_message text,
  last_message_at timestamptz,
  buyer_unread integer not null default 0,
  seller_unread integer not null default 0,
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id),
  constraint buyer_is_not_seller check (buyer_id <> seller_id)
);

create index chat_threads_buyer_idx on chat_threads (buyer_id, last_message_at desc);
create index chat_threads_seller_idx on chat_threads (seller_id, last_message_at desc);

-- ── messages ────────────────────────────────────────────────────────────────────
create table messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references chat_threads (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index messages_thread_idx on messages (thread_id, created_at);

-- On new message: update the thread preview and bump the recipient's unread count.
create or replace function on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update chat_threads t
  set last_message = new.body,
      last_message_at = new.created_at,
      buyer_unread  = t.buyer_unread  + (case when new.sender_id = t.seller_id then 1 else 0 end),
      seller_unread = t.seller_unread + (case when new.sender_id = t.buyer_id  then 1 else 0 end)
  where t.id = new.thread_id;
  return new;
end;
$$;

create trigger messages_after_insert
  after insert on messages
  for each row execute function on_message_insert();

-- ── reports ───────────────────────────────────────────────────────────────────
create table reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  reporter_id uuid not null references profiles (id) on delete cascade,
  reason text not null,
  details text,
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);

create index reports_listing_idx on reports (listing_id);
