# Security hardening — 2026-09-20

Scope: Space Call Dashboard authentication, Supabase RLS/privileges, and pre-auth Edge Function surface.

## Applied

- Revoked `TRUNCATE`, `TRIGGER`, and `REFERENCES` from the browser `authenticated` role on:
  - `public.user_roles`
  - `public.dashboard_security_events`
- Restricted `dashboard-auth-throttle` browser CORS to Space Call production origins and local development origins.
- Added regression assertions for both controls.
- Fixed the existing dashboard security regression test newline syntax so the test file can execute.

## Production verification

- The privilege-revocation migration was applied to the production Supabase project.
- A follow-up privilege query returned no remaining `TRUNCATE`, `TRIGGER`, or `REFERENCES` grants for `authenticated` on the two sensitive tables.
- RLS remains enabled on `user_roles`, `dashboard_security_events`, and `dashboard_login_throttle`.
- `dashboard-auth-throttle` production Edge Function was deployed as v7 and its live source no longer uses wildcard CORS.

## Follow-up

- Supabase Security Advisor still reports Leaked Password Protection Disabled.
- Legacy `space-call-cms-admin` remains a separate privileged trust boundary; see GitHub issue #207 before retiring or re-authenticating it.
