-- Public storefront CMS data is served through the public-cms Edge Function.
-- Remove anonymous PostgREST reads, but preserve authenticated staff access;
-- RLS remains the authority for admin/editor dashboard reads and writes.

drop policy if exists "brands public read" on public.cms_brands;
drop policy if exists "hero public read" on public.cms_hero_slides;
drop policy if exists "nav public read" on public.cms_navigation;
drop policy if exists "sections public read" on public.cms_sections;
drop policy if exists "seo public read" on public.cms_seo_pages;
drop policy if exists "settings public read" on public.cms_settings;

revoke select on public.cms_brands from anon;
revoke select on public.cms_hero_slides from anon;
revoke select on public.cms_navigation from anon;
revoke select on public.cms_sections from anon;
revoke select on public.cms_seo_pages from anon;
revoke select on public.cms_settings from anon;

-- Authenticated access is intentionally retained. Existing staff-only RLS
-- policies prevent ordinary signed-in accounts from reading or mutating CMS data.
grant select, insert, update, delete on public.cms_brands to authenticated;
grant select, insert, update, delete on public.cms_hero_slides to authenticated;
grant select, insert, update, delete on public.cms_navigation to authenticated;
grant select, insert, update, delete on public.cms_sections to authenticated;
grant select, insert, update, delete on public.cms_seo_pages to authenticated;
grant select, insert, update, delete on public.cms_settings to authenticated;
