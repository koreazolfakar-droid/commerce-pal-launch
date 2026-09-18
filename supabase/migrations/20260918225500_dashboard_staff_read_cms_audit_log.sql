drop policy if exists "dashboard_staff_read_audit_log" on public.cms_audit_log;

create policy "dashboard_staff_read_audit_log"
  on public.cms_audit_log
  for select
  to authenticated
  using ((select private.is_dashboard_staff()));

grant select on public.cms_audit_log to authenticated;