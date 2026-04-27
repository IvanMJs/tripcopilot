-- Analytics events table for beta funnel tracking
create table if not exists analytics_events (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users(id) on delete cascade,
  event      text        not null,
  properties jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_event_idx      on analytics_events(event);
create index if not exists analytics_events_created_at_idx on analytics_events(created_at desc);
create index if not exists analytics_events_user_id_idx    on analytics_events(user_id);

-- RLS: authenticated users can insert their own events only
alter table analytics_events enable row level security;

create policy "Users insert own events"
  on analytics_events for insert
  to authenticated
  with check (auth.uid() = user_id);
