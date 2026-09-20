create table if not exists public.dashboard_passkey_stepup_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  password_session_id uuid not null,
  baseline_last_used_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  consumed_at timestamptz,
  constraint dashboard_passkey_stepup_ticket_expiry_check check (expires_at > created_at)
);

create index if not exists dashboard_passkey_stepup_tickets_user_session_idx
  on public.dashboard_passkey_stepup_tickets (user_id, password_session_id, expires_at desc);

alter table public.dashboard_passkey_stepup_tickets enable row level security;
revoke all on table public.dashboard_passkey_stepup_tickets from public, anon, authenticated;
grant select, insert, update, delete on table public.dashboard_passkey_stepup_tickets to service_role;

create table if not exists public.dashboard_passkey_session_assurance (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null,
  passkey_last_used_at timestamptz not null,
  constraint dashboard_passkey_session_assurance_expiry_check check (expires_at > verified_at)
);

create index if not exists dashboard_passkey_session_assurance_user_idx
  on public.dashboard_passkey_session_assurance (user_id, expires_at desc);

alter table public.dashboard_passkey_session_assurance enable row level security;
revoke all on table public.dashboard_passkey_session_assurance from public, anon, authenticated;
grant select, insert, update, delete on table public.dashboard_passkey_session_assurance to service_role;

create or replace function private.has_dashboard_passkey_stepup()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.dashboard_passkey_session_assurance assurance
    where assurance.user_id = (select auth.uid())
      and assurance.session_id = nullif((select auth.jwt() ->> 'session_id'), '')::uuid
      and assurance.expires_at > now()
  );
$$;

revoke all on function private.has_dashboard_passkey_stepup() from public, anon;
grant execute on function private.has_dashboard_passkey_stepup() to authenticated;

create or replace function public.dashboard_passkey_stepup_ready()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_dashboard_passkey_stepup();
$$;

revoke all on function public.dashboard_passkey_stepup_ready() from public, anon;
grant execute on function public.dashboard_passkey_stepup_ready() to authenticated;

create or replace function private.is_dashboard_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      (select private.has_dashboard_aal2())
      or
      (select private.has_dashboard_passkey_stepup())
    )
    and exists (
      select 1
      from public.user_roles
      where user_id = (select auth.uid())
        and role in ('admin', 'editor')
    );
$$;

create or replace function private.is_dashboard_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      (select private.has_dashboard_aal2())
      or
      (select private.has_dashboard_passkey_stepup())
    )
    and exists (
      select 1
      from public.user_roles
      where user_id = (select auth.uid())
        and role = 'admin'
    );
$$;

revoke all on function private.is_dashboard_staff() from public, anon;
revoke all on function private.is_dashboard_admin() from public, anon;
grant execute on function private.is_dashboard_staff() to authenticated;
grant execute on function private.is_dashboard_admin() to authenticated;

comment on function private.has_dashboard_passkey_stepup() is
  'Checks whether the current password-backed dashboard session completed a recent server-verified WebAuthn passkey step-up.';

comment on function public.dashboard_passkey_stepup_ready() is
  'Returns whether the current authenticated session has active server-verified dashboard passkey assurance.';

comment on function private.is_dashboard_staff() is
  'Dashboard staff authorization boundary: requires admin/editor role plus either native AAL2 or server-verified passkey step-up.';

comment on function private.is_dashboard_admin() is
  'Dashboard admin authorization boundary: requires admin role plus either native AAL2 or server-verified passkey step-up.';
