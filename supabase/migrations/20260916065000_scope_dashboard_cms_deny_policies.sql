-- The storefront reads CMS through public-cms. Keep direct anonymous reads
-- denied, but avoid attaching the deny policy to every role via PostgreSQL
-- PUBLIC because authenticated staff and the legacy AdminJS role have their own
-- explicit RLS policies.

drop policy if exists "deny_direct_public_cms_brands" on public.cms_brands;
create policy "deny_direct_public_cms_brands"
  on public.cms_brands for select to anon using (false);

drop policy if exists "deny_direct_public_cms_hero" on public.cms_hero_slides;
create policy "deny_direct_public_cms_hero"
  on public.cms_hero_slides for select to anon using (false);

drop policy if exists "deny_direct_public_cms_navigation" on public.cms_navigation_items;
create policy "deny_direct_public_cms_navigation"
  on public.cms_navigation_items for select to anon using (false);

drop policy if exists "deny_direct_public_cms_sections" on public.cms_sections;
create policy "deny_direct_public_cms_sections"
  on public.cms_sections for select to anon using (false);

drop policy if exists "deny_direct_public_cms_seo" on public.cms_seo_pages;
create policy "deny_direct_public_cms_seo"
  on public.cms_seo_pages for select to anon using (false);

drop policy if exists "deny_direct_public_cms_settings" on public.cms_site_settings;
create policy "deny_direct_public_cms_settings"
  on public.cms_site_settings for select to anon using (false);
