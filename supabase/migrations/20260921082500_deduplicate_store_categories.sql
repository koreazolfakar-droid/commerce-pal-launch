-- Consolidate semantically duplicated storefront categories without losing products.
-- Canonical targets:
--   Mobile Phones + هواتف ذكية -> Smartphone
--   Wall Charger              -> Charger
--   Charging Cable            -> Cable
--
-- Product category_id and product_type are migrated together because the
-- storefront currently resolves managed category products by product_type.
-- Legacy route slugs are redirected in the application layer.

do $$
declare
  v_source_count integer;
  v_remaining_products integer;
begin
  -- Guard the canonical rows before changing any product.
  if not exists (
    select 1 from public.store_categories
    where id = '3909c4ac-4dd1-484c-97ff-451f4ee5a06c'::uuid
      and slug = 'smartphone'
  ) then
    raise exception 'canonical Smartphone category missing';
  end if;

  if not exists (
    select 1 from public.store_categories
    where id = '197c73b1-6079-4ea2-a2db-458e4de28ee3'::uuid
      and slug = 'charger'
  ) then
    raise exception 'canonical Charger category missing';
  end if;

  if not exists (
    select 1 from public.store_categories
    where id = '92001a18-d986-47a4-a37d-4c034592c19a'::uuid
      and slug = 'cable'
  ) then
    raise exception 'canonical Cable category missing';
  end if;

  -- Preserve useful localization on the surviving categories.
  update public.store_categories
  set
    name_ar = case
      when id = '3909c4ac-4dd1-484c-97ff-451f4ee5a06c'::uuid
        then coalesce(nullif(trim(name_ar), ''), 'هواتف ذكية')
      when id = '197c73b1-6079-4ea2-a2db-458e4de28ee3'::uuid
        then coalesce(nullif(trim(name_ar), ''), 'شواحن')
      when id = '92001a18-d986-47a4-a37d-4c034592c19a'::uuid
        then coalesce(nullif(trim(name_ar), ''), 'كابلات')
      else name_ar
    end,
    updated_at = now()
  where id in (
    '3909c4ac-4dd1-484c-97ff-451f4ee5a06c'::uuid,
    '197c73b1-6079-4ea2-a2db-458e4de28ee3'::uuid,
    '92001a18-d986-47a4-a37d-4c034592c19a'::uuid
  );

  -- Record exactly what will be merged before deleting source rows.
  insert into public.cms_audit_log(actor_email, action, entity_type, entity_id, details)
  select
    'system@spacecall.local',
    'category_merged',
    'store_category',
    source.id::text,
    jsonb_build_object(
      'source_name', source.name,
      'source_slug', source.slug,
      'target_id', plan.target_id,
      'target_name', plan.target_name,
      'target_slug', plan.target_slug,
      'moved_products', (
        select count(*) from public.store_products p where p.category_id = source.id
      ),
      'reason', 'deduplicate_storefront_taxonomy'
    )
  from public.store_categories source
  join (
    values
      ('3f67d6d1-1829-4f5a-bea8-80461c267da0'::uuid, '3909c4ac-4dd1-484c-97ff-451f4ee5a06c'::uuid, 'Smartphone', 'smartphone'),
      ('b23a2c94-ba4a-40ce-a6f3-15fad4f5c21b'::uuid, '3909c4ac-4dd1-484c-97ff-451f4ee5a06c'::uuid, 'Smartphone', 'smartphone'),
      ('8540a193-80d8-416f-86be-18aaf8e114b8'::uuid, '197c73b1-6079-4ea2-a2db-458e4de28ee3'::uuid, 'Charger', 'charger'),
      ('85276e56-b050-4a85-a2b6-b43eeab125d6'::uuid, '92001a18-d986-47a4-a37d-4c034592c19a'::uuid, 'Cable', 'cable')
  ) as plan(source_id, target_id, target_name, target_slug)
    on source.id = plan.source_id;

  -- Move products atomically and normalize product_type to the canonical name.
  update public.store_products p
  set
    category_id = case
      when p.category_id in (
        '3f67d6d1-1829-4f5a-bea8-80461c267da0'::uuid,
        'b23a2c94-ba4a-40ce-a6f3-15fad4f5c21b'::uuid
      ) then '3909c4ac-4dd1-484c-97ff-451f4ee5a06c'::uuid
      when p.category_id = '8540a193-80d8-416f-86be-18aaf8e114b8'::uuid
        then '197c73b1-6079-4ea2-a2db-458e4de28ee3'::uuid
      when p.category_id = '85276e56-b050-4a85-a2b6-b43eeab125d6'::uuid
        then '92001a18-d986-47a4-a37d-4c034592c19a'::uuid
      else p.category_id
    end,
    product_type = case
      when p.category_id in (
        '3f67d6d1-1829-4f5a-bea8-80461c267da0'::uuid,
        'b23a2c94-ba4a-40ce-a6f3-15fad4f5c21b'::uuid
      ) then 'Smartphone'
      when p.category_id = '8540a193-80d8-416f-86be-18aaf8e114b8'::uuid
        then 'Charger'
      when p.category_id = '85276e56-b050-4a85-a2b6-b43eeab125d6'::uuid
        then 'Cable'
      else p.product_type
    end,
    updated_at = now()
  where p.category_id in (
    '3f67d6d1-1829-4f5a-bea8-80461c267da0'::uuid,
    'b23a2c94-ba4a-40ce-a6f3-15fad4f5c21b'::uuid,
    '8540a193-80d8-416f-86be-18aaf8e114b8'::uuid,
    '85276e56-b050-4a85-a2b6-b43eeab125d6'::uuid
  );

  select count(*)
  into v_remaining_products
  from public.store_products
  where category_id in (
    '3f67d6d1-1829-4f5a-bea8-80461c267da0'::uuid,
    'b23a2c94-ba4a-40ce-a6f3-15fad4f5c21b'::uuid,
    '8540a193-80d8-416f-86be-18aaf8e114b8'::uuid,
    '85276e56-b050-4a85-a2b6-b43eeab125d6'::uuid
  );

  if v_remaining_products <> 0 then
    raise exception 'category merge left % products on source categories', v_remaining_products;
  end if;

  delete from public.store_categories
  where id in (
    '3f67d6d1-1829-4f5a-bea8-80461c267da0'::uuid,
    'b23a2c94-ba4a-40ce-a6f3-15fad4f5c21b'::uuid,
    '8540a193-80d8-416f-86be-18aaf8e114b8'::uuid,
    '85276e56-b050-4a85-a2b6-b43eeab125d6'::uuid
  );

  select count(*)
  into v_source_count
  from public.store_categories
  where id in (
    '3f67d6d1-1829-4f5a-bea8-80461c267da0'::uuid,
    'b23a2c94-ba4a-40ce-a6f3-15fad4f5c21b'::uuid,
    '8540a193-80d8-416f-86be-18aaf8e114b8'::uuid,
    '85276e56-b050-4a85-a2b6-b43eeab125d6'::uuid
  );

  if v_source_count <> 0 then
    raise exception 'duplicate source categories were not fully removed';
  end if;
end;
$$;

-- Prevent the broken blank-slug state from returning.
alter table public.store_categories
  drop constraint if exists store_categories_slug_nonempty;

alter table public.store_categories
  add constraint store_categories_slug_nonempty
  check (length(trim(slug)) > 0);
