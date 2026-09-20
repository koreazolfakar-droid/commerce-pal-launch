alter table public.cms_site_settings
  add column if not exists label text,
  add column if not exists group_name text;

alter table public.cms_seo_pages
  add column if not exists canonical_url text;