-- Public storefront CMS data is served only through the public-cms Edge Function.
-- Remove direct PostgREST access so draft/unpublished CMS rows cannot be probed
-- with a publishable key, even if a future RLS policy is accidentally weakened.

drop policy if exists "public_read_visible_brands" on public.cms_brands;
drop policy if exists "public_read_published_hero" on public.cms_hero_slides;
drop policy if exists "public_read_visible_navigation" on public.cms_navigation_items;
drop policy if exists "public_read_visible_sections" on public.cms_sections;
drop policy if exists "public_read_cms_seo" on public.cms_seo_pages;
drop policy if exists "public_read_cms_settings" on public.cms_site_settings;

revoke select on public.cms_brands from anon, authenticated;
revoke select on public.cms_hero_slides from anon, authenticated;
revoke select on public.cms_navigation_items from anon, authenticated;
revoke select on public.cms_sections from anon, authenticated;
revoke select on public.cms_seo_pages from anon, authenticated;
revoke select on public.cms_site_settings from anon, authenticated;

create policy "deny_direct_public_cms_brands"
  on public.cms_brands for select to public using (false);
create policy "deny_direct_public_cms_hero"
  on public.cms_hero_slides for select to public using (false);
create policy "deny_direct_public_cms_navigation"
  on public.cms_navigation_items for select to public using (false);
create policy "deny_direct_public_cms_sections"
  on public.cms_sections for select to public using (false);
create policy "deny_direct_public_cms_seo"
  on public.cms_seo_pages for select to public using (false);
create policy "deny_direct_public_cms_settings"
  on public.cms_site_settings for select to public using (false);
