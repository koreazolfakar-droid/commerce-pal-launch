-- Dashboard authorization is deliberately separate from the public CMS tables.
-- There is no automatic "first user becomes admin" flow: the first owner must be
-- explicitly provisioned after signing up, which prevents public self-promotion.

create table if not exists public.dashboard_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboard_roles enable row level security;

-- Dashboard role membership is checked only by the trusted application server
-- using the Supabase service role. Browsers never read or mutate this table.
revoke all on public.dashboard_roles from public, anon, authenticated;
grant all on public.dashboard_roles to service_role;

-- Keep updated_at deterministic when a role is changed by a trusted operator.
create or replace function public.touch_dashboard_role_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.touch_dashboard_role_updated_at() from public, anon, authenticated;
grant execute on function public.touch_dashboard_role_updated_at() to service_role;

drop trigger if exists dashboard_roles_touch on public.dashboard_roles;
create trigger dashboard_roles_touch
before update on public.dashboard_roles
for each row execute function public.touch_dashboard_role_updated_at();

create index if not exists dashboard_roles_role_idx on public.dashboard_roles (role);
