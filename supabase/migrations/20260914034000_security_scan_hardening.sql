-- Security hardening for Lovable/Supabase scan warnings.
-- Keep public storefront access limited to publishable content while ensuring
-- hidden CMS rows and private media are visible only to admin/editor staff.

-- SEO metadata marked noindex is treated as unpublished/private CMS metadata.
-- Staff can still read/manage it through the existing staff policy.
drop policy if exists "seo public read" on public.cms_seo_pages;
create policy "seo public read"
  on public.cms_seo_pages
  for select
  to anon
  using (not noindex);

-- Authenticated users must be actual dashboard staff to read hidden CMS data.
drop policy if exists "settings staff read" on public.cms_settings;
create policy "settings staff read"
  on public.cms_settings
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

drop policy if exists "hero staff read" on public.cms_hero_slides;
create policy "hero staff read"
  on public.cms_hero_slides
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

drop policy if exists "sections staff read" on public.cms_sections;
create policy "sections staff read"
  on public.cms_sections
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

drop policy if exists "nav staff read" on public.cms_navigation;
create policy "nav staff read"
  on public.cms_navigation
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

drop policy if exists "brands staff read" on public.cms_brands;
create policy "brands staff read"
  on public.cms_brands
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

-- Private CMS media must not be enumerable by every signed-in account.
drop policy if exists "cms media staff read" on storage.objects;
create policy "cms media staff read"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'cms-media' and public.is_staff(auth.uid()));
