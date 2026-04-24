-- Public share tokens for the TripBoard feature
create table if not exists shared_trips (
  id                 uuid primary key default gen_random_uuid(),
  token              text not null unique default encode(gen_random_bytes(16), 'hex'),
  trip_id            uuid not null references trips(id) on delete cascade,
  owner_id           uuid not null references auth.users(id) on delete cascade,
  owner_display_name text,
  created_at         timestamptz not null default now()
);

-- Only the owner can read/write their own tokens
alter table shared_trips enable row level security;

create policy "owner_select" on shared_trips
  for select using (auth.uid() = owner_id);

create policy "owner_insert" on shared_trips
  for insert with check (auth.uid() = owner_id);

create policy "owner_delete" on shared_trips
  for delete using (auth.uid() = owner_id);

-- Public read by token (used by the server component at /board/[token])
create policy "public_read_by_token" on shared_trips
  for select using (true);
