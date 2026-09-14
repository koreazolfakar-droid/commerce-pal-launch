drop policy if exists "deny_public_audit_log" on public.cms_audit_log;
create policy "deny_public_audit_log"
  on public.cms_audit_log
  for all
  to public
  using (false)
  with check (false);

drop policy if exists "deny_public_edge_rate_limits" on public.edge_rate_limits;
create policy "deny_public_edge_rate_limits"
  on public.edge_rate_limits
  for all
  to public
  using (false)
  with check (false);
