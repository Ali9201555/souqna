-- Souqna marketplace — home-cook storefronts ("kitchens")
-- Run after 0008_realtime_chat.sql.
--
-- A kitchen is a cook's Etsy-style storefront: one per user. A kitchen's dishes
-- are simply that owner's food listings (listings.seller_id = kitchens.owner_id
-- with category_id = 'food'), so no extra FK on listings is needed. Public-read,
-- owner-write — same posture as profiles_public + listings.

create table kitchens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references profiles (id) on delete cascade,
  name text not null,
  bio text not null default '',
  cover_url text,
  cuisines text[] not null default '{}',
  governorate_id text references governorates (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index kitchens_owner_idx on kitchens (owner_id);

create trigger kitchens_set_updated_at
  before update on kitchens
  for each row execute function set_updated_at();

alter table kitchens enable row level security;

create policy "kitchens are viewable by everyone"
  on kitchens for select using (true);

create policy "users create their own kitchen"
  on kitchens for insert with check (owner_id = auth.uid());

create policy "owners update their kitchen"
  on kitchens for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
