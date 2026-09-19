alter table public.dashboard_security_events
  drop constraint if exists dashboard_security_events_type_check;

alter table public.dashboard_security_events
  add constraint dashboard_security_events_type_check check (
    event_type in (
      'login_success',
      'mfa_verified',
      'mfa_enabled',
      'password_changed',
      'signout_local',
      'signout_others',
      'signout_global',
      'passkey_registered',
      'passkey_renamed',
      'passkey_deleted'
    )
  );

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

  if not private.is_dashboard_staff() then
    raise exception 'aal2 dashboard staff required';
  end if;

  if p_event_type not in (
    'login_success',
    'mfa_verified',
    'mfa_enabled',
    'password_changed',
    'signout_local',
    'signout_others',
    'signout_global',
    'passkey_registered',
    'passkey_renamed',
    'passkey_deleted'
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
