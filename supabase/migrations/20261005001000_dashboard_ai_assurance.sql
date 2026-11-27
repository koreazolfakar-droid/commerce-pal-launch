-- Verify the exact same role and native-MFA/passkey policy as Dashboard RLS.
create or replace function public.dashboard_staff_access_ready()
returns boolean language sql stable security invoker
set search_path = ''
as $$ select private.is_dashboard_staff() $$;
revoke all on function public.dashboard_staff_access_ready() from public, anon;
grant execute on function public.dashboard_staff_access_ready() to authenticated;
