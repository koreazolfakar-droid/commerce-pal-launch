-- Add Supabase Auth-backed dashboard roles without replacing the existing CMS.
-- The storefront remains gateway-only through public-cms and the existing
-- spacecall_adminjs role continues to work unchanged.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;
revoke all on public.user_roles from anon;
grant select, insert, update, delete on public.user_roles to authenticated;

create or replace function private.is_dashboard_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function private.is_dashboard_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role in ('admin', 'editor')
  );
$$;

-- This trigger makes the self-service bootstrap race-safe. Only the very first
-- authenticated user may insert their own admin row. After that, only an
-- existing admin may add or change dashboard roles.
create or replace function private.guard_dashboard_role_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_dashboard_admin() then
    return new;
  end if;

  perform pg_advisory_xact_lock(739281004);

  if exists (select 1 from public.user_roles) then
    raise exception 'dashboard_bootstrap_closed' using errcode = '42501';
  end if;

  if (select auth.uid()) is null
     or new.user_id <> (select auth.uid())
     or new.role <> 'admin' then
    raise exception 'dashboard_bootstrap_forbidden' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.is_dashboard_admin() from public, anon;
revoke all on function private.is_dashboard_staff() from public, anon;
revoke all on function private.guard_dashboard_role_insert() from public, anon;
grant execute on function private.is_dashboard_admin() to authenticated;
grant execute on function private.is_dashboard_staff() to authenticated;
grant execute on function private.guard_dashboard_role_insert() to authenticated;

drop trigger if exists guard_dashboard_role_insert on public.user_roles;
create trigger guard_dashboard_role_insert
before insert on public.user_roles
for each row execute function private.guard_dashboard_role_insert();

drop policy if exists "dashboard_roles_read" on public.user_roles;
drop policy if exists "dashboard_roles_insert" on public.user_roles;
drop policy if exists "dashboard_roles_update" on public.user_roles;
drop policy if exists "dashboard_roles_delete" on public.user_roles;

create policy "dashboard_roles_read"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_dashboard_admin()));

create policy "dashboard_roles_insert"
  on public.user_roles for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and role = 'admin')
    or (select private.is_dashboard_admin())
  );

create policy "dashboard_roles_update"
  on public.user_roles for update to authenticated
  using ((select private.is_dashboard_admin()))
  with check ((select private.is_dashboard_admin()));

create policy "dashboard_roles_delete"
  on public.user_roles for delete to authenticated
  using ((select private.is_dashboard_admin()));

-- Authenticated users need table privileges before RLS can evaluate the staff
-- policy. Anonymous access remains revoked and public-cms continues using the
-- service role for the storefront projection.
grant select, insert, update, delete on public.cms_site_settings to authenticated;
grant select, insert, update, delete on public.cms_hero_slides to authenticated;
grant select, insert, update, delete on public.cms_sections to authenticated;
grant select, insert, update, delete on public.cms_navigation_items to authenticated;
grant select, insert, update, delete on public.cms_brands to authenticated;
grant select, insert, update, delete on public.cms_seo_pages to authenticated;

-- Keep the old AdminJS policies. These additional permissive policies only
-- authorize Supabase Auth users that have an explicit dashboard role.
drop policy if exists "dashboard_staff_site_settings" on public.cms_site_settings;
create policy "dashboard_staff_site_settings"
  on public.cms_site_settings for all to authenticated
  using ((select private.is_dashboard_staff()))
  with check ((select private.is_dashboard_staff()));

drop policy if exists "dashboard_staff_hero" on public.cms_hero_slides;
create policy "dashboard_staff_hero"
  on public.cms_hero_slides for all to authenticated
  using ((select private.is_dashboard_staff()))
  with check ((select private.is_dashboard_staff()));

drop policy if exists "dashboard_staff_sections" on public.cms_sections;
create policy "dashboard_staff_sections"
  on public.cms_sections for all to authenticated
  using ((select private.is_dashboard_staff()))
  with check ((select private.is_dashboard_staff()));

drop policy if exists "dashboard_staff_navigation" on public.cms_navigation_items;
create policy "dashboard_staff_navigation"
  on public.cms_navigation_items for all to authenticated
  using ((select private.is_dashboard_staff()))
  with check ((select private.is_dashboard_staff()));

drop policy if exists "dashboard_staff_brands" on public.cms_brands;
create policy "dashboard_staff_brands"
  on public.cms_brands for all to authenticated
  using ((select private.is_dashboard_staff()))
  with check ((select private.is_dashboard_staff()));

drop policy if exists "dashboard_staff_seo" on public.cms_seo_pages;
create policy "dashboard_staff_seo"
  on public.cms_seo_pages for all to authenticated
  using ((select private.is_dashboard_staff()))
  with check ((select private.is_dashboard_staff()));

-- The existing cms-media bucket is public because its URLs are rendered on the
-- storefront. Keep public reads working, but allow object mutations only for
-- authenticated dashboard staff.
drop policy if exists "dashboard_media_staff_read" on storage.objects;
drop policy if exists "dashboard_media_staff_insert" on storage.objects;
drop policy if exists "dashboard_media_staff_update" on storage.objects;
drop policy if exists "dashboard_media_staff_delete" on storage.objects;

create policy "dashboard_media_staff_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'cms-media' and (select private.is_dashboard_staff()));

create policy "dashboard_media_staff_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'cms-media' and (select private.is_dashboard_staff()));

create policy "dashboard_media_staff_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'cms-media' and (select private.is_dashboard_staff()))
  with check (bucket_id = 'cms-media' and (select private.is_dashboard_staff()));

create policy "dashboard_media_staff_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'cms-media' and (select private.is_dashboard_staff()));
