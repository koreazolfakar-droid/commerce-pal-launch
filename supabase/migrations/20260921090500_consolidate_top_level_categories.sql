-- Consolidate narrow subcategories that clutter the top-level category grid.
-- The migration is intentionally idempotent and repairs partially-moved rows:
-- subtype identity is preserved as a tag, products move to canonical categories,
-- source categories are removed, and every merge is audit logged.

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

  -- Preserve subtype identity even if a previous partial run already moved the
  -- category_id. Explicit product IDs make this repair safe and deterministic.
  update public.store_products p
  set
    tags = case
      when p.id in (
        '8908d346-1b2a-4abd-a630-3d231bee1992'::uuid,
        '4cd1646b-cae3-4010-a9c9-7550692ebcb7'::uuid,
        'bb79e2e2-aa4a-4a1a-9d75-dda665da6298'::uuid
      ) then case
        when 'foldable-smartphone'=any(coalesce(p.tags,'{}'::text[]))
          then coalesce(p.tags,'{}'::text[])
        else array_append(coalesce(p.tags,'{}'::text[]),'foldable-smartphone')
      end
      when p.id='d4a8a5c8-c996-4110-a3fa-85ea4201d5a6'::uuid then case
        when 'smartphone-bundle'=any(coalesce(p.tags,'{}'::text[]))
          then coalesce(p.tags,'{}'::text[])
        else array_append(coalesce(p.tags,'{}'::text[]),'smartphone-bundle')
      end
      when p.id in (
        '9f951932-90c0-4abe-bf59-6d4ea451c1e3'::uuid,
        '4fba4595-5c3e-4df6-b703-5cd525a5821b'::uuid
      ) then case
        when 'gaming-tablet'=any(coalesce(p.tags,'{}'::text[]))
          then coalesce(p.tags,'{}'::text[])
        else array_append(coalesce(p.tags,'{}'::text[]),'gaming-tablet')
      end
      else p.tags
    end,
    category_id = case
      when p.id in (
        '8908d346-1b2a-4abd-a630-3d231bee1992'::uuid,
        '4cd1646b-cae3-4010-a9c9-7550692ebcb7'::uuid,
        'bb79e2e2-aa4a-4a1a-9d75-dda665da6298'::uuid,
        'd4a8a5c8-c996-4110-a3fa-85ea4201d5a6'::uuid
      ) then '3909c4ac-4dd1-484c-97ff-451f4ee5a06c'::uuid
      when p.id in (
        '9f951932-90c0-4abe-bf59-6d4ea451c1e3'::uuid,
        '4fba4595-5c3e-4df6-b703-5cd525a5821b'::uuid
      ) then 'f3bf4104-a3a0-468d-ba7e-331e7cf41b10'::uuid
      else p.category_id
    end,
    product_type = case
      when p.id in (
        '8908d346-1b2a-4abd-a630-3d231bee1992'::uuid,
        '4cd1646b-cae3-4010-a9c9-7550692ebcb7'::uuid,
        'bb79e2e2-aa4a-4a1a-9d75-dda665da6298'::uuid,
        'd4a8a5c8-c996-4110-a3fa-85ea4201d5a6'::uuid
      ) then 'Smartphone'
      when p.id in (
        '9f951932-90c0-4abe-bf59-6d4ea451c1e3'::uuid,
        '4fba4595-5c3e-4df6-b703-5cd525a5821b'::uuid
      ) then 'Tablet'
      else p.product_type
    end,
    updated_at=now()
  where p.id in (
    '8908d346-1b2a-4abd-a630-3d231bee1992'::uuid,
    '4cd1646b-cae3-4010-a9c9-7550692ebcb7'::uuid,
    'bb79e2e2-aa4a-4a1a-9d75-dda665da6298'::uuid,
    'd4a8a5c8-c996-4110-a3fa-85ea4201d5a6'::uuid,
    '9f951932-90c0-4abe-bf59-6d4ea451c1e3'::uuid,
    '4fba4595-5c3e-4df6-b703-5cd525a5821b'::uuid
  );

  -- Audit rows are deterministic and inserted once, even if source rows were
  -- already removed by an interrupted prior run.
  insert into public.cms_audit_log(actor_email,action,entity_type,entity_id,details)
  select 'system@spacecall.local','category_merged','store_category',v.entity_id,v.details
  from (
    values
      (
        'bc0f6c41-d10b-4d25-8244-074dc5c581c8',
        jsonb_build_object('source_name','Foldable Smartphone','source_slug','foldable-smartphone','target_id','3909c4ac-4dd1-484c-97ff-451f4ee5a06c','target_name','Smartphone','target_slug','smartphone','moved_products',3,'preserved_as_tag','foldable-smartphone','reason','consolidate_top_level_storefront_taxonomy')
      ),
      (
        '43ceeb2d-3273-4bef-a960-aafdf1e6b309',
        jsonb_build_object('source_name','Smartphone Bundle','source_slug','smartphone-bundle','target_id','3909c4ac-4dd1-484c-97ff-451f4ee5a06c','target_name','Smartphone','target_slug','smartphone','moved_products',1,'preserved_as_tag','smartphone-bundle','reason','consolidate_top_level_storefront_taxonomy')
      ),
      (
        '18a027bf-5a9b-422e-9ee7-41b39650f5bf',
        jsonb_build_object('source_name','Gaming Tablet','source_slug','gaming-tablet','target_id','f3bf4104-a3a0-468d-ba7e-331e7cf41b10','target_name','Tablet','target_slug','tablet','moved_products',2,'preserved_as_tag','gaming-tablet','reason','consolidate_top_level_storefront_taxonomy')
      )
  ) as v(entity_id,details)
  where not exists (
    select 1 from public.cms_audit_log a
    where a.action='category_merged'
      and a.entity_type='store_category'
      and a.entity_id=v.entity_id
  );

  delete from public.store_categories
  where id in (
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
end;
$$;
