-- Native push tokens for Capacitor (FCM/APNs)
create table if not exists native_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now()
);

create unique index idx_native_push_tokens_token on native_push_tokens(token);
create index idx_native_push_tokens_user_id on native_push_tokens(user_id);

alter table native_push_tokens enable row level security;

create policy "Users can manage own tokens"
  on native_push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
