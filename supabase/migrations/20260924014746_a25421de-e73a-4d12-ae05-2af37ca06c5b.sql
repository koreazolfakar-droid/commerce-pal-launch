create or replace function public.dashboard_staff_email_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.user_roles r on r.user_id = u.id
    where lower(u.email) = lower(p_email)
      and r.role in ('admin', 'editor')
  );
$$;

revoke all on function public.dashboard_staff_email_exists(text) from public, anon, authenticated;
grant execute on function public.dashboard_staff_email_exists(text) to service_role;