create table if not exists public.dashboard_login_throttle (
  key_hash text primary key,
  failure_count integer not null default 0 check (failure_count >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  last_attempt_at timestamptz not null default now()
);

alter table public.dashboard_login_throttle enable row level security;

revoke all on public.dashboard_login_throttle from anon, authenticated;

create index if not exists dashboard_login_throttle_last_attempt_idx
  on public.dashboard_login_throttle (last_attempt_at);

comment on table public.dashboard_login_throttle is
  'Opaque IP+email hash buckets used by the dashboard pre-auth throttle. Raw IPs/emails are never stored.';