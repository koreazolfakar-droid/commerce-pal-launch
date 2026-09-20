update public.cms_seo_pages set page_slug = coalesce(page_slug, path, 'home') where page_slug is null;
update public.cms_seo_pages set robots = 'index,follow' where robots is null;
alter table public.cms_seo_pages alter column path drop not null;
alter table public.cms_seo_pages alter column robots set not null;
alter table public.cms_seo_pages alter column page_slug set not null;
create unique index if not exists cms_seo_pages_page_slug_key on public.cms_seo_pages (page_slug);