alter table public.cms_brands
  add column if not exists description text not null default '',
  add column if not exists cover_image_url text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists seo_title text,
  add column if not exists seo_description text;

create index if not exists cms_brands_featured_sort_idx
  on public.cms_brands(is_featured desc, sort_order asc, name asc);
