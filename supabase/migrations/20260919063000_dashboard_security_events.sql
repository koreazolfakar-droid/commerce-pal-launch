create table if not exists public.dashboard_security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text,
  event_type text not null,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint dashboard_security_events_type_check check (
    event_type in (
      'login_success',
      'mfa_verified',
      'mfa_enabled',
      'password_changed',
      'signout_local',
      'signout_others',
      'signout_global'
    )
  ),
  constraint dashboard_security_events_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

alter table public.dashboard_security_events enable row level security;

create index if not exists dashboard_security_events_user_created_idx
  on public.dashboard_security_events (user_id, created_at desc);

create index if not exists dashboard_security_events_type_created_idx
  on public.dashboard_security_events (event_type, created_at desc);

drop policy if exists "dashboard_security_events_staff_read_own" on public.dashboard_security_events;
create policy "dashboard_security_events_staff_read_own"
  on public.dashboard_security_events
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select private.is_dashboard_staff())
  );

revoke all on public.dashboard_security_events from anon;
revoke insert, update, delete on public.dashboard_security_events from authenticated;
grant select on public.dashboard_security_events to authenticated;

create or replace function public.log_dashboard_security_event(
  p_event_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  v_user_agent text;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.user_roles r
    where r.user_id = v_uid
      and r.role in ('admin','editor')
  ) then
    raise exception 'dashboard staff required';
  end if;

  if p_event_type not in (
    'login_success',
    'mfa_verified',
    'mfa_enabled',
    'password_changed',
    'signout_local',
    'signout_others',
    'signout_global'
  ) then
    raise exception 'unsupported dashboard security event';
  end if;

  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'security event metadata must be an object';
  end if;

  v_user_agent := nullif(left(coalesce(v_headers ->> 'user-agent', ''), 500), '');

  insert into public.dashboard_security_events(
    user_id,
    session_id,
    event_type,
    user_agent,
    metadata
  )
  values (
    v_uid,
    nullif(left(coalesce(auth.jwt() ->> 'session_id', ''), 200), ''),
    p_event_type,
    v_user_agent,
    p_metadata - 'password' - 'token' - 'secret' - 'captchaToken'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.log_dashboard_security_event(text,jsonb) from public, anon;
grant execute on function public.log_dashboard_security_event(text,jsonb) to authenticated;