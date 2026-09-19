drop policy if exists "dashboard_login_throttle_deny_clients" on public.dashboard_login_throttle;
create policy "dashboard_login_throttle_deny_clients"
  on public.dashboard_login_throttle
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function private.log_dashboard_security_event_internal(
  p_event_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
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

revoke all on function private.log_dashboard_security_event_internal(text,jsonb) from public, anon;
grant execute on function private.log_dashboard_security_event_internal(text,jsonb) to authenticated;

create or replace function public.log_dashboard_security_event(
  p_event_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.log_dashboard_security_event_internal(p_event_type, p_metadata);
$$;

revoke all on function public.log_dashboard_security_event(text,jsonb) from public, anon;
grant execute on function public.log_dashboard_security_event(text,jsonb) to authenticated;

drop policy if exists "dashboard_roles_self_mfa_activate" on public.user_roles;
drop policy if exists "dashboard_roles_update" on public.user_roles;

create policy "dashboard_roles_update"
  on public.user_roles
  for update
  to authenticated
  using (
    (select private.is_dashboard_admin())
    or (
      user_id = (select auth.uid())
      and ((select auth.jwt()) ->> 'aal') = 'aal2'
    )
  )
  with check (
    (select private.is_dashboard_admin())
    or (
      user_id = (select auth.uid())
      and ((select auth.jwt()) ->> 'aal') = 'aal2'
    )
  );