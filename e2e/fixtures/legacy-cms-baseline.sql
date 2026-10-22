-- Test-only schema prerequisites created outside the repository's early history.
-- These four empty CMS tables are present in production but have no CREATE TABLE
-- migration in this repository. Never apply this fixture to a remote project.
alter table public.cms_hero_slides
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists is_published boolean not null default true;
alter table public.cms_seo_pages
  add column if not exists page_slug text,
  add column if not exists canonical_url text,
  add column if not exists robots text not null default 'index,follow',
  add column if not exists json_ld jsonb not null default '{}'::jsonb,
  add column if not exists is_public boolean not null default true,
  alter column path drop not null;
create unique index if not exists test_cms_seo_page_slug on public.cms_seo_pages(page_slug);
create table public.cms_navigation_items (
  id uuid primary key default gen_random_uuid(),
  area text not null, label text not null,
  icon_type text not null default 'lucide', icon_value text, href text,
  sort_order integer not null default 0, is_visible boolean not null default true,
  updated_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table public.cms_site_settings (
  key text primary key, value_text text, value_json jsonb,
  value_type text not null default 'text', label text,
  group_name text not null default 'general', is_public boolean not null default true,
  updated_at timestamptz not null default now()
);
create table public.cms_media_assets (
  id uuid primary key default gen_random_uuid(), bucket_id text not null default 'cms-media',
  object_path text not null, file_name text not null, mime_type text, size_bytes bigint, alt_text text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(bucket_id, object_path)
);
create table public.cms_audit_log (
  id uuid primary key default gen_random_uuid(), actor_email text, action text not null,
  entity_type text not null, entity_id text, details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.cms_navigation_items enable row level security;
alter table public.cms_site_settings enable row level security;
alter table public.cms_media_assets enable row level security;
alter table public.cms_audit_log enable row level security;
grant all on public.cms_navigation_items, public.cms_site_settings,
  public.cms_media_assets, public.cms_audit_log to service_role;
