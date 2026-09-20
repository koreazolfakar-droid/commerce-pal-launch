drop function if exists public.dashboard_passkey_stepup_ready();

drop policy if exists dashboard_passkey_stepup_tickets_deny_anon
  on public.dashboard_passkey_stepup_tickets;
create policy dashboard_passkey_stepup_tickets_deny_anon
  on public.dashboard_passkey_stepup_tickets
  as restrictive
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists dashboard_passkey_stepup_tickets_deny_authenticated
  on public.dashboard_passkey_stepup_tickets;
create policy dashboard_passkey_stepup_tickets_deny_authenticated
  on public.dashboard_passkey_stepup_tickets
  as restrictive
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists dashboard_passkey_session_assurance_deny_anon
  on public.dashboard_passkey_session_assurance;
create policy dashboard_passkey_session_assurance_deny_anon
  on public.dashboard_passkey_session_assurance
  as restrictive
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists dashboard_passkey_session_assurance_deny_authenticated
  on public.dashboard_passkey_session_assurance;
create policy dashboard_passkey_session_assurance_deny_authenticated
  on public.dashboard_passkey_session_assurance
  as restrictive
  for all
  to authenticated
  using (false)
  with check (false);
