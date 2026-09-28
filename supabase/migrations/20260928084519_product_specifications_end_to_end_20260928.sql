-- Product specifications end-to-end hardening.
-- Existing category templates and product specification values are preserved.

alter table public.store_categories
  add column if not exists spec_template jsonb not null default '{"sections":[]}'::jsonb;

alter table public.store_products
  add column if not exists specifications jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'store_categories_spec_template_shape'
      and conrelid = 'public.store_categories'::regclass
  ) then
    alter table public.store_categories
      add constraint store_categories_spec_template_shape
      check (
        jsonb_typeof(spec_template) = 'object'
        and spec_template ? 'sections'
        and jsonb_typeof(spec_template -> 'sections') = 'array'
        and jsonb_array_length(spec_template -> 'sections') <= 16
        and pg_column_size(spec_template) <= 65536
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'store_products_specifications_shape'
      and conrelid = 'public.store_products'::regclass
  ) then
    alter table public.store_products
      add constraint store_products_specifications_shape
      check (
        jsonb_typeof(specifications) = 'object'
        and pg_column_size(specifications) <= 65536
      );
  end if;
end;
$$;

create or replace function public.update_store_category_with_spec_template(
  p_category_id uuid,
  p_name text,
  p_slug text,
  p_description text,
  p_image_url text,
  p_icon text,
  p_sort_order integer,
  p_is_active boolean,
  p_is_featured boolean,
  p_seo_title text,
  p_seo_description text,
  p_spec_template jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_template jsonb := coalesce(p_spec_template, '{"sections":[]}'::jsonb);
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  if nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception 'category name is required';
  end if;
  if nullif(btrim(coalesce(p_slug, '')), '') is null
     or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid category slug';
  end if;
  if jsonb_typeof(v_template) <> 'object'
     or not (v_template ? 'sections')
     or jsonb_typeof(v_template -> 'sections') <> 'array' then
    raise exception 'invalid specification template';
  end if;
  if jsonb_array_length(v_template -> 'sections') > 16
     or pg_column_size(v_template) > 65536 then
    raise exception 'specification template is too large';
  end if;

  update public.store_categories
  set name = btrim(p_name),
      slug = btrim(p_slug),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      image_url = nullif(btrim(coalesce(p_image_url, '')), ''),
      icon = nullif(btrim(coalesce(p_icon, '')), ''),
      sort_order = greatest(0, coalesce(p_sort_order, 0)),
      is_active = coalesce(p_is_active, true),
      is_featured = coalesce(p_is_featured, false),
      seo_title = nullif(btrim(coalesce(p_seo_title, '')), ''),
      seo_description = nullif(btrim(coalesce(p_seo_description, '')), ''),
      spec_template = v_template,
      updated_at = now()
  where id = p_category_id;

  if not found then
    raise exception 'category not found';
  end if;

  update public.store_products
  set product_type = btrim(p_name),
      updated_at = now()
  where category_id = p_category_id;
end;
$$;

revoke all on function public.update_store_category_with_spec_template(
  uuid,text,text,text,text,text,integer,boolean,boolean,text,text,jsonb
) from public, anon;

grant execute on function public.update_store_category_with_spec_template(
  uuid,text,text,text,text,text,integer,boolean,boolean,text,text,jsonb
) to authenticated;

-- Public storefront needs only the category template and product specification
-- values, still constrained by the existing public-read RLS policies.
grant select (spec_template) on table public.store_categories to anon, authenticated;
grant select (specifications) on table public.store_products to anon, authenticated;

comment on column public.store_categories.spec_template is
  'Category-owned schema for structured product specification sections and fields.';
comment on column public.store_products.specifications is
  'Verified structured product specification values keyed by the selected category template.';
