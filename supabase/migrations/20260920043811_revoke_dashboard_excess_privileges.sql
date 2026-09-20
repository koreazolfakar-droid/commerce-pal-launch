-- Least-privilege hardening for sensitive dashboard tables.
-- RLS does not protect TRUNCATE, and browser-authenticated users never need
-- TRIGGER or REFERENCES privileges on these security-sensitive relations.

revoke truncate, trigger, references
on table public.user_roles
from authenticated;

revoke truncate, trigger, references
on table public.dashboard_security_events
from authenticated;
