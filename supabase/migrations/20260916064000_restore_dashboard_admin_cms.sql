-- Repair the live dashboard security model after the public-CMS hardening pass.
-- Public storefront reads remain gateway-only; authenticated dashboard staff
-- regain CRUD through RLS, and the very first account can bootstrap admin once.

-- One-time bootstrap: only works while user_roles is completely empty.
-- The advisory transaction lock prevents two simultaneous first-user claims.
create or replace function public.claim_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return false;
  end if;

  if public.has_role(uid, 'admin') then
    return true;
  end if;

  perform pg_advisory_xact_lock(739281004);

  if exists (select 1 from public.user_roles) then
    return false;
  end if;

  insert into public.user_roles (user_id, role)
  values (uid, 'admin')
  on conflict (user_id, role) do nothing;

  return public.has_role(uid, 'admin');
end;
$$;

revoke all on function public.claim_admin() from public, anon;
grant execute on function public.claim_admin() to authenticated;

-- The public storefront must use the public-cms Edge Function. Anonymous direct
-- PostgREST access stays disabled for both reads and writes.
revoke all on public.cms_settings from anon;
revoke all on public.cms_hero_slides from anon;
revoke all on public.cms_sections from anon;
revoke all on public.cms_navigation from anon;
revoke all on public.cms_brands from anon;
revoke all on public.cms_seo_pages from anon;

-- Table grants allow RLS to decide which authenticated users are staff.
grant select, insert, update, delete on public.cms_settings to authenticated;
grant select, insert, update, delete on public.cms_hero_slides to authenticated;
grant select, insert, update, delete on public.cms_sections to authenticated;
grant select, insert, update, delete on public.cms_navigation to authenticated;
grant select, insert, update, delete on public.cms_brands to authenticated;
grant select, insert, update, delete on public.cms_seo_pages to authenticated;

-- Remove any public-read policies left by earlier migrations.
drop policy if exists "settings public read" on public.cms_settings;
drop policy if exists "hero public read" on public.cms_hero_slides;
drop policy if exists "sections public read" on public.cms_sections;
drop policy if exists "nav public read" on public.cms_navigation;
drop policy if exists "brands public read" on public.cms_brands;
drop policy if exists "seo public read" on public.cms_seo_pages;

-- Rebuild staff policies explicitly so dashboard reads/writes work while ordinary
-- authenticated accounts remain blocked by RLS.
drop policy if exists "settings staff read" on public.cms_settings;
drop policy if exists "settings staff write" on public.cms_settings;
create policy "settings staff read"
  on public.cms_settings for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "settings staff write"
  on public.cms_settings for all to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

drop policy if exists "hero staff read" on public.cms_hero_slides;
drop policy if exists "hero staff write" on public.cms_hero_slides;
create policy "hero staff read"
  on public.cms_hero_slides for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "hero staff write"
  on public.cms_hero_slides for all to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

drop policy if exists "sections staff read" on public.cms_sections;
drop policy if exists "sections staff write" on public.cms_sections;
create policy "sections staff read"
  on public.cms_sections for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "sections staff write"
  on public.cms_sections for all to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

drop policy if exists "nav staff read" on public.cms_navigation;
drop policy if exists "nav staff write" on public.cms_navigation;
create policy "nav staff read"
  on public.cms_navigation for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "nav staff write"
  on public.cms_navigation for all to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

drop policy if exists "brands staff read" on public.cms_brands;
drop policy if exists "brands staff write" on public.cms_brands;
create policy "brands staff read"
  on public.cms_brands for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "brands staff write"
  on public.cms_brands for all to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

drop policy if exists "seo staff read" on public.cms_seo_pages;
drop policy if exists "seo staff write" on public.cms_seo_pages;
create policy "seo staff read"
  on public.cms_seo_pages for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "seo staff write"
  on public.cms_seo_pages for all to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- Ensure the dashboard media bucket exists and is private.
insert into storage.buckets (id, name, public)
values ('cms-media', 'cms-media', false)
on conflict (id) do update set public = false;

drop policy if exists "cms media staff read" on storage.objects;
drop policy if exists "cms media staff insert" on storage.objects;
drop policy if exists "cms media staff update" on storage.objects;
drop policy if exists "cms media staff delete" on storage.objects;

create policy "cms media staff read"
  on storage.objects for select to authenticated
  using (bucket_id = 'cms-media' and public.is_staff(auth.uid()));
create policy "cms media staff insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'cms-media' and public.is_staff(auth.uid()));
create policy "cms media staff update"
  on storage.objects for update to authenticated
  using (bucket_id = 'cms-media' and public.is_staff(auth.uid()))
  with check (bucket_id = 'cms-media' and public.is_staff(auth.uid()));
create policy "cms media staff delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'cms-media' and public.is_staff(auth.uid()));
