-- Enforce AAL2 as the authorization boundary for all Space Call dashboard staff.
-- The mfa_required column remains useful UI/state metadata, but it is no longer
-- consulted to decide whether staff/admin access is permitted.

alter table public.user_roles
  alter column mfa_required set default true;

update public.user_roles
set mfa_required = true
where role in ('admin', 'editor')
  and mfa_required is distinct from true;

alter table public.user_roles
  drop constraint if exists user_roles_mfa_required_true;

alter table public.user_roles
  add constraint user_roles_mfa_required_true
  check (mfa_required = true);

create or replace function private.is_dashboard_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.has_dashboard_aal2())
    and exists (
      select 1
      from public.user_roles
      where user_id = (select auth.uid())
        and role in ('admin', 'editor')
    );
$$;

create or replace function private.is_dashboard_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.has_dashboard_aal2())
    and exists (
      select 1
      from public.user_roles
      where user_id = (select auth.uid())
        and role = 'admin'
    );
$$;

revoke all on function private.is_dashboard_staff() from public, anon;
revoke all on function private.is_dashboard_admin() from public, anon;
grant execute on function private.is_dashboard_staff() to authenticated;
grant execute on function private.is_dashboard_admin() to authenticated;

comment on function private.is_dashboard_staff() is
  'Dashboard staff authorization boundary: requires admin/editor role and AAL2 on every request.';

comment on function private.is_dashboard_admin() is
  'Dashboard admin authorization boundary: requires admin role and AAL2 on every request.';
