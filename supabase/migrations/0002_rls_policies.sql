-- Souqna marketplace — Row Level Security
-- Run after 0001_initial_schema.sql.
-- Note: the service_role key bypasses RLS, so back-office/admin tooling is unaffected.

alter table profiles        enable row level security;
alter table categories      enable row level security;
alter table governorates    enable row level security;
alter table listings        enable row level security;
alter table listing_images  enable row level security;
alter table favorites       enable row level security;
alter table chat_threads    enable row level security;
alter table messages        enable row level security;
alter table reports         enable row level security;

-- ── profiles ──────────────────────────────────────────────────────────────────
-- Public marketplace: anyone may read seller profiles; users edit only their own.
create policy "profiles are viewable by everyone"
  on profiles for select using (true);

create policy "users insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "users update their own profile"
  on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ── Reference data (read-only to clients; writes via service_role only) ────────
create policy "categories are viewable by everyone"
  on categories for select using (true);

create policy "governorates are viewable by everyone"
  on governorates for select using (true);

-- ── listings ──────────────────────────────────────────────────────────────────
create policy "active listings are public; owners see their own"
  on listings for select
  using (status = 'active' or seller_id = auth.uid());

create policy "users create listings as themselves"
  on listings for insert
  with check (seller_id = auth.uid());

create policy "owners update their listings"
  on listings for update
  using (seller_id = auth.uid()) with check (seller_id = auth.uid());

create policy "owners delete their listings"
  on listings for delete
  using (seller_id = auth.uid());

-- ── listing_images ────────────────────────────────────────────────────────────
create policy "images of visible listings are readable"
  on listing_images for select
  using (
    exists (
      select 1 from listings l
      where l.id = listing_images.listing_id
        and (l.status = 'active' or l.seller_id = auth.uid())
    )
  );

create policy "owners manage their listing images"
  on listing_images for all
  using (
    exists (select 1 from listings l
            where l.id = listing_images.listing_id and l.seller_id = auth.uid())
  )
  with check (
    exists (select 1 from listings l
            where l.id = listing_images.listing_id and l.seller_id = auth.uid())
  );

-- ── favorites ───────────────────────────────────────────────────────────────────
create policy "users manage their own favorites"
  on favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── chat_threads ────────────────────────────────────────────────────────────────
create policy "participants read their threads"
  on chat_threads for select
  using (auth.uid() in (buyer_id, seller_id));

create policy "buyers open threads"
  on chat_threads for insert
  with check (buyer_id = auth.uid());

create policy "participants update their threads"
  on chat_threads for update
  using (auth.uid() in (buyer_id, seller_id))
  with check (auth.uid() in (buyer_id, seller_id));

-- ── messages ────────────────────────────────────────────────────────────────────
create policy "participants read thread messages"
  on messages for select
  using (
    exists (
      select 1 from chat_threads t
      where t.id = messages.thread_id and auth.uid() in (t.buyer_id, t.seller_id)
    )
  );

create policy "participants send messages as themselves"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from chat_threads t
      where t.id = messages.thread_id and auth.uid() in (t.buyer_id, t.seller_id)
    )
  );

-- ── reports ───────────────────────────────────────────────────────────────────
-- Anyone signed in may file a report; reading/triage is service_role-only.
create policy "users file reports as themselves"
  on reports for insert
  with check (reporter_id = auth.uid());
