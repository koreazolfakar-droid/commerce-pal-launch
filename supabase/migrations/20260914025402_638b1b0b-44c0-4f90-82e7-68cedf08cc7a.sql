-- roles
create type public.app_role as enum ('admin','editor');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','editor'))
$$;

create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "admins read all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- one-time owner bootstrap: first signed-in user becomes admin when no admin exists
create or replace function public.claim_admin()
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return false; end if;
  if exists (select 1 from public.user_roles where role = 'admin') then
    return public.has_role(uid, 'admin');
  end if;
  insert into public.user_roles (user_id, role) values (uid, 'admin')
  on conflict do nothing;
  return true;
end;
$$;

revoke all on function public.claim_admin() from public;
grant execute on function public.claim_admin() to authenticated;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- settings
create table public.cms_settings (
  key text primary key,
  value jsonb not null default '""'::jsonb,
  updated_at timestamptz not null default now()
);
grant select on public.cms_settings to anon;
grant select, insert, update, delete on public.cms_settings to authenticated;
grant all on public.cms_settings to service_role;
alter table public.cms_settings enable row level security;
create policy "settings public read" on public.cms_settings for select to anon using (true);
create policy "settings staff read" on public.cms_settings for select to authenticated using (true);
create policy "settings staff write" on public.cms_settings for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger cms_settings_touch before update on public.cms_settings for each row execute function public.touch_updated_at();

-- hero slides
create table public.cms_hero_slides (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  image_url text not null,
  mobile_image_url text,
  button_label text,
  target_type text not null default 'none' check (target_type in ('url','product','collection','none')),
  target_value text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.cms_hero_slides to anon;
grant select, insert, update, delete on public.cms_hero_slides to authenticated;
grant all on public.cms_hero_slides to service_role;
alter table public.cms_hero_slides enable row level security;
create policy "hero public read" on public.cms_hero_slides for select to anon using (is_visible);
create policy "hero staff read" on public.cms_hero_slides for select to authenticated using (true);
create policy "hero staff write" on public.cms_hero_slides for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger cms_hero_touch before update on public.cms_hero_slides for each row execute function public.touch_updated_at();

-- sections
create table public.cms_sections (
  id uuid primary key default gen_random_uuid(),
  page_slug text not null default 'home',
  section_key text not null,
  section_type text not null default 'custom',
  title text,
  subtitle text,
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_slug, section_key)
);
grant select on public.cms_sections to anon;
grant select, insert, update, delete on public.cms_sections to authenticated;
grant all on public.cms_sections to service_role;
alter table public.cms_sections enable row level security;
create policy "sections public read" on public.cms_sections for select to anon using (is_visible);
create policy "sections staff read" on public.cms_sections for select to authenticated using (true);
create policy "sections staff write" on public.cms_sections for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger cms_sections_touch before update on public.cms_sections for each row execute function public.touch_updated_at();

-- navigation
create table public.cms_navigation (
  id uuid primary key default gen_random_uuid(),
  area text not null default 'header' check (area in ('header','bottom','footer','mobile_menu','trust')),
  label text not null,
  icon_type text not null default 'none' check (icon_type in ('lucide','image','svg','none')),
  icon_value text,
  href text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.cms_navigation to anon;
grant select, insert, update, delete on public.cms_navigation to authenticated;
grant all on public.cms_navigation to service_role;
alter table public.cms_navigation enable row level security;
create policy "nav public read" on public.cms_navigation for select to anon using (is_visible);
create policy "nav staff read" on public.cms_navigation for select to authenticated using (true);
create policy "nav staff write" on public.cms_navigation for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger cms_nav_touch before update on public.cms_navigation for each row execute function public.touch_updated_at();

-- brands
create table public.cms_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  collection_handle text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.cms_brands to anon;
grant select, insert, update, delete on public.cms_brands to authenticated;
grant all on public.cms_brands to service_role;
alter table public.cms_brands enable row level security;
create policy "brands public read" on public.cms_brands for select to anon using (is_visible);
create policy "brands staff read" on public.cms_brands for select to authenticated using (true);
create policy "brands staff write" on public.cms_brands for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger cms_brands_touch before update on public.cms_brands for each row execute function public.touch_updated_at();

-- seo per page
create table public.cms_seo_pages (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  title text,
  description text,
  og_image_url text,
  noindex boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.cms_seo_pages to anon;
grant select, insert, update, delete on public.cms_seo_pages to authenticated;
grant all on public.cms_seo_pages to service_role;
alter table public.cms_seo_pages enable row level security;
create policy "seo public read" on public.cms_seo_pages for select to anon using (true);
create policy "seo staff write" on public.cms_seo_pages for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger cms_seo_touch before update on public.cms_seo_pages for each row execute function public.touch_updated_at();

-- audit log
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text not null,
  resource text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.admin_audit_log to authenticated;
grant all on public.admin_audit_log to service_role;
alter table public.admin_audit_log enable row level security;
create policy "audit admin read" on public.admin_audit_log for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "audit staff insert" on public.admin_audit_log for insert to authenticated with check (public.is_staff(auth.uid()));

create index cms_sections_page_idx on public.cms_sections (page_slug, sort_order);
create index cms_nav_area_idx on public.cms_navigation (area, sort_order);
create index admin_audit_created_idx on public.admin_audit_log (created_at desc);