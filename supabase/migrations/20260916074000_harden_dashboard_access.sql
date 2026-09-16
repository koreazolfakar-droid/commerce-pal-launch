-- Harden the Supabase-authenticated dashboard.
-- Public/self-service role bootstrap is removed. Dashboard roles can only be
-- granted by an existing admin through the application, or provisioned once
-- from a trusted SQL/service-role context for the very first administrator.

-- Remove the previous first-user self-bootstrap path.
drop trigger if exists guard_dashboard_role_insert on public.user_roles;
drop function if exists private.guard_dashboard_role_insert();

-- Only an existing dashboard admin may grant roles through the authenticated API.
drop policy if exists "dashboard_roles_insert" on public.user_roles;
create policy "dashboard_roles_insert"
  on public.user_roles for insert to authenticated
  with check ((select private.is_dashboard_admin()));

-- Keep role changes admin-only.
drop policy if exists "dashboard_roles_update" on public.user_roles;
create policy "dashboard_roles_update"
  on public.user_roles for update to authenticated
  using ((select private.is_dashboard_admin()))
  with check ((select private.is_dashboard_admin()));

drop policy if exists "dashboard_roles_delete" on public.user_roles;
create policy "dashboard_roles_delete"
  on public.user_roles for delete to authenticated
  using ((select private.is_dashboard_admin()));

-- Prevent an authenticated dashboard admin from accidentally removing or
-- demoting the final remaining admin. Trusted SQL/service-role recovery stays
-- possible because auth.uid() is null outside a user-authenticated request.
create or replace function private.guard_last_dashboard_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if old.role = 'admin'
     and (
       tg_op = 'DELETE'
       or (tg_op = 'UPDATE' and new.role <> 'admin')
       or (tg_op = 'UPDATE' and new.user_id <> old.user_id)
     )
     and not exists (
       select 1
       from public.user_roles
       where role = 'admin'
         and user_id <> old.user_id
     ) then
    raise exception 'dashboard_last_admin_protected' using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.guard_last_dashboard_admin() from public, anon;
grant execute on function private.guard_last_dashboard_admin() to authenticated;

drop trigger if exists guard_last_dashboard_admin on public.user_roles;
create trigger guard_last_dashboard_admin
before update or delete on public.user_roles
for each row execute function private.guard_last_dashboard_admin();

comment on table public.user_roles is
  'Dashboard authorization roles. Initial admin must be provisioned from a trusted backend/SQL context; subsequent role changes require an existing admin.';
