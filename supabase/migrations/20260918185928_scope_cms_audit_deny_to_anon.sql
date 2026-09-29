drop policy if exists "deny_public_audit_log" on public.cms_audit_log;
drop policy if exists "deny_anon_audit_log" on public.cms_audit_log;

create policy "deny_anon_audit_log"
  on public.cms_audit_log
  for all
  to anon
  using (false)
  with check (false);