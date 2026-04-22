begin;

create or replace function public.check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_max_per_hour integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_window timestamptz := date_trunc('hour', now());
  v_count integer;
begin
  if v_uid is null then
    return false;
  end if;

  if p_user_id is distinct from v_uid then
    raise exception 'forbidden';
  end if;

  insert into public.rate_limits (user_id, endpoint, window_start, count)
  values (v_uid, p_endpoint, v_window, 1)
  on conflict (user_id, endpoint, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_max_per_hour;
end;
$$;

revoke all on function public.check_rate_limit(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(uuid, text, integer) to authenticated;
grant execute on function public.check_rate_limit(uuid, text, integer) to service_role;

alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from public, anon, authenticated;
grant all on table public.rate_limits to service_role;

alter table public.notification_log enable row level security;
revoke all on table public.notification_log from public, anon, authenticated;
grant all on table public.notification_log to service_role;

alter table public.airport_status_cache enable row level security;
revoke all on table public.airport_status_cache from public, anon, authenticated;
grant all on table public.airport_status_cache to service_role;

alter table public.cron_runs enable row level security;
revoke all on table public.cron_runs from public, anon, authenticated;
grant all on table public.cron_runs to service_role;
revoke all on sequence public.cron_runs_id_seq from public, anon, authenticated;
grant all on sequence public.cron_runs_id_seq to service_role;

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