-- Consolidate narrow subcategories that were cluttering the top-level category grid.
-- Their subtype is preserved as a product tag so future filtered landing pages can
-- still distinguish foldables, bundles and gaming tablets without duplicating
-- top-level storefront categories.

do $$
declare
  v_remaining integer;
begin
  if not exists (
    select 1 from public.store_categories
    where id='3909c4ac-4dd1-484c-97ff-451f4ee5a06c'::uuid and slug='smartphone'
  ) then
    raise exception 'canonical Smartphone category missing';
  end if;

  if not exists (
    select 1 from public.store_categories
    where id='f3bf4104-a3a0-468d-ba7e-331e7cf41b10'::uuid and slug='tablet'
  ) then
    raise exception 'canonical Tablet category missing';
  end if;

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
        select count(*) from public.store_products p where p.category_id=source.id
      ),
      'preserved_as_tag', plan.preserved_tag,
      'reason', 'consolidate_top_level_storefront_taxonomy'
    )
  from public.store_categories source
  join (
    values
      ('bc0f6c41-d10b-4d25-8244-074dc5c581c8'::uuid, '3909c4ac-4dd1-484c-97ff-451f4ee5a06c'::uuid, 'Smartphone', 'smartphone', 'foldable-smartphone'),
      ('43ceeb2d-3273-4bef-a960-aafdf1e6b309'::uuid, '3909c4ac-4dd1-484c-97ff-451f4ee5a06c'::uuid, 'Smartphone', 'smartphone', 'smartphone-bundle'),
      ('18a027bf-5a9b-422e-9ee7-41b39650f5bf'::uuid, 'f3bf4104-a3a0-468d-ba7e-331e7cf41b10'::uuid, 'Tablet', 'tablet', 'gaming-tablet')
  ) as plan(source_id,target_id,target_name,target_slug,preserved_tag)
    on source.id=plan.source_id;

  update public.store_products p
  set
    tags = case
      when p.category_id='bc0f6c41-d10b-4d25-8244-074dc5c581c8'::uuid
        then case when 'foldable-smartphone'=any(coalesce(p.tags,'{}'::text[]))
          then coalesce(p.tags,'{}'::text[])
          else array_append(coalesce(p.tags,'{}'::text[]),'foldable-smartphone') end
      when p.category_id='43ceeb2d-3273-4bef-a960-aafdf1e6b309'::uuid
        then case when 'smartphone-bundle'=any(coalesce(p.tags,'{}'::text[]))
          then coalesce(p.tags,'{}'::text[])
          else array_append(coalesce(p.tags,'{}'::text[]),'smartphone-bundle') end
      when p.category_id='18a027bf-5a9b-422e-9ee7-41b39650f5bf'::uuid
        then case when 'gaming-tablet'=any(coalesce(p.tags,'{}'::text[]))
          then coalesce(p.tags,'{}'::text[])
          else array_append(coalesce(p.tags,'{}'::text[]),'gaming-tablet') end
      else p.tags
    end,
    category_id = case
      when p.category_id in (
        'bc0f6c41-d10b-4d25-8244-074dc5c581c8'::uuid,
        '43ceeb2d-3273-4bef-a960-aafdf1e6b309'::uuid
      ) then '3909c4ac-4dd1-484c-97ff-451f4ee5a06c'::uuid
      when p.category_id='18a027bf-5a9b-422e-9ee7-41b39650f5bf'::uuid
        then 'f3bf4104-a3a0-468d-ba7e-331e7cf41b10'::uuid
      else p.category_id
    end,
    product_type = case
      when p.category_id in (
        'bc0f6c41-d10b-4d25-8244-074dc5c581c8'::uuid,
        '43ceeb2d-3273-4bef-a960-aafdf1e6b309'::uuid
      ) then 'Smartphone'
      when p.category_id='18a027bf-5a9b-422e-9ee7-41b39650f5bf'::uuid
        then 'Tablet'
      else p.product_type
    end,
    updated_at=now()
  where p.category_id in (
    'bc0f6c41-d10b-4d25-8244-074dc5c581c8'::uuid,
    '43ceeb2d-3273-4bef-a960-aafdf1e6b309'::uuid,
    '18a027bf-5a9b-422e-9ee7-41b39650f5bf'::uuid
  );

  select count(*) into v_remaining
  from public.store_products
  where category_id in (
    'bc0f6c41-d10b-4d25-8244-074dc5c581c8'::uuid,
    '43ceeb2d-3273-4bef-a960-aafdf1e6b309'::uuid,
    '18a027bf-5a9b-422e-9ee7-41b39650f5bf'::uuid
  );

  if v_remaining <> 0 then
    raise exception 'subcategory consolidation left % products on source categories', v_remaining;
  end if;

  delete from public.store_categories
  where id in (
    'bc0f6c41-d10b-4d25-8244-074dc5c581c8'::uuid,
    '43ceeb2d-3273-4bef-a960-aafdf1e6b309'::uuid,
    '18a027bf-5a9b-422e-9ee7-41b39650f5bf'::uuid
  );
end;
$$;
