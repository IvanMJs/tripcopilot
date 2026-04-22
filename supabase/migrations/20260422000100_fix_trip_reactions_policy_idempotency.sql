begin;

alter table public.trip_reactions enable row level security;
revoke all on table public.trip_reactions from public;

drop policy if exists "Public read trip reactions" on public.trip_reactions;
drop policy if exists "Public insert trip reactions" on public.trip_reactions;
drop policy if exists "Public update trip reactions" on public.trip_reactions;

create policy "Public read trip reactions"
  on public.trip_reactions
  for select
  to anon, authenticated
  using (true);

create policy "Public insert trip reactions"
  on public.trip_reactions
  for insert
  to anon, authenticated
  with check (char_length(user_fingerprint) between 1 and 128);

create policy "Public update trip reactions"
  on public.trip_reactions
  for update
  to anon, authenticated
  using (char_length(user_fingerprint) between 1 and 128)
  with check (char_length(user_fingerprint) between 1 and 128);

commit;