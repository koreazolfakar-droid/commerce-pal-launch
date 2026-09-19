create or replace function private.guard_dashboard_role_self_mfa_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- Trusted database/service operations do not carry an end-user auth.uid().
  -- RLS/table grants still protect anonymous browser callers.
  if v_uid is null then
    return new;
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