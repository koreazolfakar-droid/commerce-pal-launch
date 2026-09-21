-- Preserve taxonomy provenance and subtype detail after duplicate-category cleanup.
-- The cleanup migration keeps a lean top-level category grid; this follow-up
-- makes that consolidation auditable and preserves useful subtype information
-- on the affected products without reintroducing duplicate categories.

do $$
begin
  -- Keep canonical category localization complete.
  update public.store_categories
  set
    name_ar = case
      when slug='smartphone' then coalesce(nullif(trim(name_ar),''),'هواتف ذكية')
      when slug='charger' then coalesce(nullif(trim(name_ar),''),'شواحن')
      when slug='cable' then coalesce(nullif(trim(name_ar),''),'كابلات')
      when slug='used-phone' then coalesce(nullif(trim(name_ar),''),'هاتف مستعمل')
      else name_ar
    end,
    updated_at = now()
  where slug in ('smartphone','charger','cable','used-phone');

  -- Preserve former subcategory identity as product tags so future filtered
  -- landing pages can still distinguish these products without top-level clutter.
  update public.store_products
  set
    tags = case
      when id in (
        '8908d346-1b2a-4abd-a630-3d231bee1992'::uuid,
        '4cd1646b-cae3-4010-a9c9-7550692ebcb7'::uuid,
        'bb79e2e2-aa4a-4a1a-9d75-dda665da6298'::uuid
      ) then case
        when 'foldable-smartphone'=any(coalesce(tags,'{}'::text[]))
          then coalesce(tags,'{}'::text[])
        else array_append(coalesce(tags,'{}'::text[]),'foldable-smartphone')
      end
      when id='d4a8a5c8-c996-4110-a3fa-85ea4201d5a6'::uuid then case
        when 'smartphone-bundle'=any(coalesce(tags,'{}'::text[]))
          then coalesce(tags,'{}'::text[])
        else array_append(coalesce(tags,'{}'::text[]),'smartphone-bundle')
      end
      when id in (
        '9f951932-90c0-4abe-bf59-6d4ea451c1e3'::uuid,
        '4fba4595-5c3e-4df6-b703-5cd525a5821b'::uuid
      ) then case
        when 'gaming-tablet'=any(coalesce(tags,'{}'::text[]))
          then coalesce(tags,'{}'::text[])
        else array_append(coalesce(tags,'{}'::text[]),'gaming-tablet')
      end
      else tags
    end,
    updated_at = now()
  where id in (
    '8908d346-1b2a-4abd-a630-3d231bee1992'::uuid,
    '4cd1646b-cae3-4010-a9c9-7550692ebcb7'::uuid,
    'bb79e2e2-aa4a-4a1a-9d75-dda665da6298'::uuid,
    'd4a8a5c8-c996-4110-a3fa-85ea4201d5a6'::uuid,
    '9f951932-90c0-4abe-bf59-6d4ea451c1e3'::uuid,
    '4fba4595-5c3e-4df6-b703-5cd525a5821b'::uuid
  );

  -- Record every merge once. These rows also document where legacy slugs moved.
  insert into public.cms_audit_log(actor_email,action,entity_type,entity_id,details)
  select 'system@spacecall.local','category_merged','store_category',v.entity_id,v.details
  from (
    values
      ('3f67d6d1-1829-4f5a-bea8-80461c267da0',jsonb_build_object('source_name','Mobile Phones','source_slug','mobile-phones','target_name','Smartphone','target_slug','smartphone','moved_products',1,'reason','deduplicate_storefront_taxonomy')),
      ('b23a2c94-ba4a-40ce-a6f3-15fad4f5c21b',jsonb_build_object('source_name','هواتف ذكية','source_slug','','target_name','Smartphone','target_slug','smartphone','moved_products',6,'reason','deduplicate_storefront_taxonomy')),
      ('bc0f6c41-d10b-4d25-8244-074dc5c581c8',jsonb_build_object('source_name','Foldable Smartphone','source_slug','foldable-smartphone','target_name','Smartphone','target_slug','smartphone','moved_products',3,'preserved_as_tag','foldable-smartphone','reason','consolidate_top_level_storefront_taxonomy')),
      ('43ceeb2d-3273-4bef-a960-aafdf1e6b309',jsonb_build_object('source_name','Smartphone Bundle','source_slug','smartphone-bundle','target_name','Smartphone','target_slug','smartphone','moved_products',1,'preserved_as_tag','smartphone-bundle','reason','consolidate_top_level_storefront_taxonomy')),
      ('18a027bf-5a9b-422e-9ee7-41b39650f5bf',jsonb_build_object('source_name','Gaming Tablet','source_slug','gaming-tablet','target_name','Tablet','target_slug','tablet','moved_products',2,'preserved_as_tag','gaming-tablet','reason','consolidate_top_level_storefront_taxonomy')),
      ('8540a193-80d8-416f-86be-18aaf8e114b8',jsonb_build_object('source_name','Wall Charger','source_slug','wall-charger','target_name','Charger','target_slug','charger','moved_products',1,'reason','deduplicate_storefront_taxonomy')),
      ('85276e56-b050-4a85-a2b6-b43eeab125d6',jsonb_build_object('source_name','Charging Cable','source_slug','charging-cable','target_name','Cable','target_slug','cable','moved_products',1,'reason','deduplicate_storefront_taxonomy'))
  ) as v(entity_id,details)
  where not exists (
    select 1
    from public.cms_audit_log a
    where a.action='category_merged'
      and a.entity_type='store_category'
      and a.entity_id=v.entity_id
  );

  insert into public.cms_audit_log(actor_email,action,entity_type,entity_id,details)
  select
    'system@spacecall.local',
    'category_normalized',
    'store_category',
    '8a5fb10a-78cb-4813-939c-39bbf0e94b22',
    jsonb_build_object(
      'source_name','هاتف مستعمل',
      'source_slug','هاتف-مستعمل',
      'target_name','Used Phone',
      'target_slug','used-phone',
      'reason','normalize_bilingual_top_level_taxonomy'
    )
  where not exists (
    select 1
    from public.cms_audit_log a
    where a.action='category_normalized'
      and a.entity_type='store_category'
      and a.entity_id='8a5fb10a-78cb-4813-939c-39bbf0e94b22'
  );
end;
$$;
