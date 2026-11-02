-- Additive RPC; keeps all existing editor signatures and their stock/ledger rules.
create or replace function public.save_store_product_editor_details(
  p_editor jsonb,
  p_details jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_result jsonb;
  v_previous_description text;
  v_id uuid := nullif(p_editor ->> 'p_product_id', '')::uuid;
  v_updated_id uuid;
  v_tags text[];
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;
  if jsonb_typeof(p_editor) is distinct from 'object'
     or jsonb_typeof(p_details) is distinct from 'object' then
    raise exception 'product editor and details must be objects';
  end if;
  if char_length(coalesce(p_details ->> 'productType', '')) > 120
     or char_length(coalesce(p_details ->> 'titleAr', '')) > 180
     or char_length(coalesce(p_details ->> 'descriptionAr', '')) > 5000 then
    raise exception 'product organization or translation exceeds its field limit';
  end if;
  if jsonb_typeof(p_details -> 'tags') is distinct from 'array' then
    raise exception 'product tags must be an array';
  end if;
  if jsonb_array_length(p_details -> 'tags') > 250 or exists (
    select 1 from jsonb_array_elements(p_details -> 'tags') as tag(value)
    where jsonb_typeof(tag.value) <> 'string' or char_length(tag.value #>> '{}') > 255
  ) then
    raise exception 'product tags require at most 250 strings of 255 characters';
  end if;
  select coalesce(array_agg(tag order by tag), '{}'::text[]) into v_tags
  from (
    select distinct btrim(value) as tag
    from jsonb_array_elements_text(p_details -> 'tags')
    where btrim(value) <> ''
  ) as normalized;

  if v_id is not null then
    select description into v_previous_description
    from public.store_products where id = v_id for update;
  end if;
  v_result := public.save_store_product_editor(
    p_product_id => v_id,
    p_title => p_editor ->> 'p_title',
    p_description => p_editor ->> 'p_description',
    p_brand_id => nullif(p_editor ->> 'p_brand_id', '')::uuid,
    p_category_id => nullif(p_editor ->> 'p_category_id', '')::uuid,
    p_status => p_editor ->> 'p_status',
    p_price => (p_editor ->> 'p_price')::numeric,
    p_compare_at_price => (p_editor ->> 'p_compare_at_price')::numeric,
    p_sku => p_editor ->> 'p_sku',
    p_barcode => p_editor ->> 'p_barcode',
    p_stock => (p_editor ->> 'p_stock')::integer,
    -- Existing media is owned by its separate atomic media operations. A stale
    -- form snapshot must never resurrect a deleted URL or replace another image.
    p_image_url => case when v_id is null then p_editor ->> 'p_image_url' else '' end,
    p_seo_title => p_editor ->> 'p_seo_title',
    p_seo_description => p_editor ->> 'p_seo_description',
    p_specifications => p_editor -> 'p_specifications',
    p_collection_ids => array(select value::uuid from jsonb_array_elements_text(p_editor -> 'p_collection_ids')),
    p_expected_stock => (p_editor ->> 'p_expected_stock')::integer
  );
  v_id := (v_result ->> 'id')::uuid;
  update public.store_products
  set product_type = nullif(btrim(p_details ->> 'productType'), ''),
      tags = v_tags,
      title_ar = nullif(btrim(p_details ->> 'titleAr'), ''),
      description_ar = nullif(btrim(p_details ->> 'descriptionAr'), ''),
      -- Old HTML otherwise masks a newly edited plain description on the storefront.
      description_html = case
        when btrim(coalesce(v_previous_description, '')) is distinct from btrim(coalesce(p_editor ->> 'p_description', ''))
        then null else description_html end
  where id = v_id returning id into v_updated_id;
  if v_updated_id is null then raise exception 'product details were not saved'; end if;
  return v_result;
end;
$$;
revoke all on function public.save_store_product_editor_details(jsonb,jsonb) from public, anon;
grant execute on function public.save_store_product_editor_details(jsonb,jsonb) to authenticated;
