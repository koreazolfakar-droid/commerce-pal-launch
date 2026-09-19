drop policy if exists "dashboard_roles_self_mfa_activate" on public.user_roles;

create policy "dashboard_roles_self_mfa_activate"
  on public.user_roles
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select auth.jwt() ->> 'aal') = 'aal2'
  )
  with check (
    user_id = (select auth.uid())
    and (select auth.jwt() ->> 'aal') = 'aal2'
  );

create or replace function private.guard_dashboard_role_self_mfa_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  if private.is_dashboard_admin() then
    return new;
  end if;

  if old.user_id <> v_uid or new.user_id <> old.user_id then
    raise exception 'dashboard role update not allowed';
  end if;

  if new.role is distinct from old.role
     or new.created_at is distinct from old.created_at then
    raise exception 'only MFA activation fields may be changed';
  end if;

  if old.mfa_required = true and new.mfa_required = false then
    raise exception 'MFA cannot be disabled from the client';
  end if;

  if new.mfa_required is not true or new.mfa_enrolled_at is null then
    raise exception 'MFA activation must enable enforcement with an enrollment timestamp';
  end if;

  if old.mfa_enrolled_at is not null
     and new.mfa_enrolled_at is distinct from old.mfa_enrolled_at then
    raise exception 'MFA enrollment timestamp is immutable';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_dashboard_role_self_mfa_update() from public;

drop trigger if exists guard_dashboard_role_self_mfa_update on public.user_roles;
create trigger guard_dashboard_role_self_mfa_update
before update on public.user_roles
for each row
execute function private.guard_dashboard_role_self_mfa_update();

create or replace function public.activate_dashboard_mfa()
returns table (
  role text,
  mfa_required boolean,
  mfa_enrolled_at timestamptz
)
language plpgsql
security invoker
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
    from public.user_roles r
    where r.user_id = v_uid
      and r.role in ('admin', 'editor')
  ) then
    raise exception 'dashboard staff required';
  end if;

  update public.user_roles r
  set
    mfa_required = true,
    mfa_enrolled_at = coalesce(r.mfa_enrolled_at, now())
  where r.user_id = v_uid;

  return query
  select r.role, r.mfa_required, r.mfa_enrolled_at
  from public.user_roles r
  where r.user_id = v_uid;
end;
$$;

revoke all on function public.activate_dashboard_mfa() from public, anon;
grant execute on function public.activate_dashboard_mfa() to authenticated;