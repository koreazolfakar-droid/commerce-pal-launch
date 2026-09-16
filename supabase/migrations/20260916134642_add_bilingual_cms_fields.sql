-- Add non-destructive bilingual content fields to the storefront CMS.
-- Legacy columns remain in place as fallbacks so existing content and integrations
-- continue to work while editors populate English and Arabic copies.

alter table if exists public.cms_hero_slides
  add column if not exists title_en text,
  add column if not exists title_ar text,
  add column if not exists subtitle_en text,
  add column if not exists subtitle_ar text,
  add column if not exists button_label_en text,
  add column if not exists button_label_ar text;

alter table if exists public.cms_sections
  add column if not exists title_en text,
  add column if not exists title_ar text,
  add column if not exists subtitle_en text,
  add column if not exists subtitle_ar text,
  add column if not exists content_en jsonb,
  add column if not exists content_ar jsonb;

alter table if exists public.cms_navigation_items
  add column if not exists label_en text,
  add column if not exists label_ar text;

alter table if exists public.cms_seo_pages
  add column if not exists title_en text,
  add column if not exists title_ar text,
  add column if not exists description_en text,
  add column if not exists description_ar text;

comment on column public.cms_hero_slides.title_en is 'English storefront hero title';
comment on column public.cms_hero_slides.title_ar is 'Arabic storefront hero title';
comment on column public.cms_sections.content_en is 'English section JSON content';
comment on column public.cms_sections.content_ar is 'Arabic section JSON content';
comment on column public.cms_navigation_items.label_en is 'English navigation label';
comment on column public.cms_navigation_items.label_ar is 'Arabic navigation label';
comment on column public.cms_seo_pages.title_en is 'English SEO title';
comment on column public.cms_seo_pages.title_ar is 'Arabic SEO title';
