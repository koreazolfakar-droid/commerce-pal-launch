-- Prevent privilege escalation through the legacy first-user bootstrap.
-- Existing admins/editors keep their roles; this function is now a read-only
-- compatibility check and can no longer create an admin row.

create or replace function public.claim_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return false;
  end if;

  return public.has_role(uid, 'admin');
end;
$$;

revoke all on function public.claim_admin() from public, anon;
grant execute on function public.claim_admin() to authenticated;

-- Ensure unauthenticated/authenticated callers cannot bypass RLS through direct
-- table ownership-style grants. Staff access remains controlled by the existing
-- RLS policies and the authenticated role's normal table privileges.
revoke insert, update, delete on public.user_roles from anon;
