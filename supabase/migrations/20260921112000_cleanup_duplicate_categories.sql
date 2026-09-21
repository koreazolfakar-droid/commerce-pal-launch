-- Consolidate duplicate top-level categories into a clean canonical taxonomy.
-- Product assignments are preserved and legacy storefront slugs redirect in app code.

do $$
declare
  v_smartphone uuid;
  v_tablet uuid;
  v_charger uuid;
  v_cable uuid;
begin
  select id into v_smartphone from public.store_categories where slug = 'smartphone';
  select id into v_tablet from public.store_categories where slug = 'tablet';
  select id into v_charger from public.store_categories where slug = 'charger';
  select id into v_cable from public.store_categories where slug = 'cable';

  if v_smartphone is null or v_tablet is null or v_charger is null or v_cable is null then
    raise exception 'Canonical category missing; category cleanup aborted';
  end if;

  -- Preserve Arabic localization on the canonical smartphone category instead
  -- of keeping a second Arabic-only top-level category.
  update public.store_categories
  set name_ar = coalesce(nullif(name_ar, ''), 'هواتف ذكية'),
      updated_at = now()
  where id = v_smartphone;

  -- Smartphone aliases/subtypes that were being presented as duplicate
  -- top-level categories.
  update public.store_products
  set category_id = v_smartphone,
      product_type = 'Smartphone',
      updated_at = now()
  where category_id in (
    select id from public.store_categories
    where slug in ('mobile-phones', 'foldable-smartphone', 'smartphone-bundle')
       or (slug = '' and name = 'هواتف ذكية')
  );

  -- Device subtype belongs under the canonical Tablet category.
  update public.store_products
  set category_id = v_tablet,
      product_type = 'Tablet',
      updated_at = now()
  where category_id in (
    select id from public.store_categories where slug = 'gaming-tablet'
  );

  -- Accessory aliases.
  update public.store_products
  set category_id = v_charger,
      product_type = 'Charger',
      updated_at = now()
  where category_id in (
    select id from public.store_categories where slug = 'wall-charger'
  );

  update public.store_products
  set category_id = v_cable,
      product_type = 'Cable',
      updated_at = now()
  where category_id in (
    select id from public.store_categories where slug = 'charging-cable'
  );

  delete from public.store_categories
  where slug in (
    'mobile-phones',
    'foldable-smartphone',
    'smartphone-bundle',
    'gaming-tablet',
    'wall-charger',
    'charging-cable'
  )
  or (slug = '' and name = 'هواتف ذكية');

  -- Normalize the remaining mixed-language category into one bilingual row.
  update public.store_categories
  set name = 'Used Phone',
      name_ar = 'هاتف مستعمل',
      slug = 'used-phone',
      updated_at = now()
  where name = 'هاتف مستعمل' or slug = 'هاتف-مستعمل';

  update public.store_products p
  set product_type = c.name,
      updated_at = now()
  from public.store_categories c
  where p.category_id = c.id
    and c.slug = 'used-phone'
    and p.product_type is distinct from c.name;

  -- Re-number top-level ordering after consolidation.
  with ordered as (
    select id, row_number() over (order by sort_order asc, name asc) as new_order
    from public.store_categories
  )
  update public.store_categories c
  set sort_order = ordered.new_order,
      updated_at = now()
  from ordered
  where c.id = ordered.id
    and c.sort_order is distinct from ordered.new_order;
end;
$$;

alter table public.store_categories
  drop constraint if exists store_categories_slug_not_blank,
  drop constraint if exists store_categories_slug_format;

alter table public.store_categories
  add constraint store_categories_slug_not_blank
  check (btrim(slug) <> ''),
  add constraint store_categories_slug_format
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

create unique index if not exists store_categories_slug_lower_uidx
  on public.store_categories (lower(slug));
