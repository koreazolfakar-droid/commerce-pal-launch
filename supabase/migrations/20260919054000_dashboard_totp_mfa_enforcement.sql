alter table public.user_roles
  add column if not exists mfa_required boolean not null default false,
  add column if not exists mfa_enrolled_at timestamptz;

create or replace function private.has_dashboard_aal2()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

revoke all on function private.has_dashboard_aal2() from public;

create or replace function private.is_dashboard_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role in ('admin', 'editor')
      and (
        mfa_required = false
        or (select private.has_dashboard_aal2())
      )
  );
$$;

create or replace function private.is_dashboard_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
      and (
        mfa_required = false
        or (select private.has_dashboard_aal2())
      )
  );
$$;

create or replace function public.activate_dashboard_mfa()
returns table (
  role text,
  mfa_required boolean,
  mfa_enrolled_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  if not private.has_dashboard_aal2() then
    raise exception 'aal2 authentication required';
  end if;

  if not exists (
    select 1
    from public.user_roles
    where user_id = v_uid
      and role in ('admin', 'editor')
  ) then
    raise exception 'dashboard staff required';
  end if;

  update public.user_roles
  set
    mfa_required = true,
    mfa_enrolled_at = coalesce(public.user_roles.mfa_enrolled_at, now())
  where user_id = v_uid;

  return query
  select r.role, r.mfa_required, r.mfa_enrolled_at
  from public.user_roles r
  where r.user_id = v_uid;
end;
$$;

revoke all on function public.activate_dashboard_mfa() from public, anon;
grant execute on function public.activate_dashboard_mfa() to authenticated;