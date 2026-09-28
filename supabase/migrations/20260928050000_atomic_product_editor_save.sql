-- Make Dashboard product-editor saves atomic across the product row, its single/default
-- variant, primary image metadata, and collection membership.
--
-- Storage object uploads remain separate by design: PostgreSQL cannot transactionally
-- roll back an external Storage upload. The media manager already compensates failed
-- Storage/database writes independently.

create or replace function public.save_store_product_editor(
  p_product_id uuid,
  p_title text,
  p_description text,
  p_brand_id uuid,
  p_category_id uuid,
  p_status text,
  p_price numeric,
  p_compare_at_price numeric,
  p_sku text,
  p_barcode text,
  p_stock integer,
  p_image_url text,
  p_seo_title text,
  p_seo_description text,
  p_collection_ids uuid[]
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_product public.store_products%rowtype;
  v_variant public.store_product_variants%rowtype;
  v_product_id uuid;
  v_category_name text;
  v_variant_count integer := 0;
  v_variant_delta integer := 0;
  v_base_handle text;
  v_handle text;
  v_suffix integer := 2;
  v_image_id uuid;
  v_normalized_image_url text;
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  if nullif(btrim(coalesce(p_title, '')), '') is null then
    raise exception 'product title is required';
  end if;
  if char_length(btrim(p_title)) > 180 then
    raise exception 'product title is too long';
  end if;
  if p_status not in ('active', 'draft', 'archived') then
    raise exception 'invalid product status';
  end if;
  if p_price is null or p_price <= 0 then
    raise exception 'price must be greater than zero';
  end if;
  if p_compare_at_price is not null and p_compare_at_price < p_price then
    raise exception 'compare-at price cannot be lower than price';
  end if;
  if p_stock is null or p_stock < 0 then
    raise exception 'stock cannot be negative';
  end if;

  if p_brand_id is not null
     and not exists (select 1 from public.cms_brands where id = p_brand_id) then
    raise exception 'selected brand no longer exists';
  end if;

  if p_category_id is not null then
    select category.name
      into v_category_name
    from public.store_categories as category
    where category.id = p_category_id;

    if v_category_name is null then
      raise exception 'selected category no longer exists';
    end if;
  end if;

  if p_product_id is not null then
    select *
      into v_product
    from public.store_products
    where id = p_product_id
    for update;

    if not found then
      raise exception 'product not found';
    end if;

    v_product_id := v_product.id;

    select count(*)
      into v_variant_count
    from public.store_product_variants
    where product_id = v_product_id;

    update public.store_products
    set
      title = btrim(p_title),
      description = btrim(coalesce(p_description, '')),
      brand_id = p_brand_id,
      category_id = p_category_id,
      product_type = v_category_name,
      status = p_status,
      currency = 'USD',
      track_inventory = true,
      sku = case
        when v_variant_count <= 1 then nullif(btrim(coalesce(p_sku, '')), '')
        else v_product.sku
      end,
      barcode = case
        when v_variant_count <= 1 then nullif(btrim(coalesce(p_barcode, '')), '')
        else v_product.barcode
      end,
      seo_title = nullif(btrim(coalesce(p_seo_title, '')), ''),
      seo_description = nullif(btrim(coalesce(p_seo_description, '')), ''),
      published_at = case
        when p_status = 'active' then coalesce(v_product.published_at, now())
        else null
      end
    where id = v_product_id
    returning * into v_product;
  else
    v_product_id := gen_random_uuid();

    v_base_handle := lower(btrim(p_title));
    v_base_handle := regexp_replace(v_base_handle, '[^a-z0-9]+', '-', 'g');
    v_base_handle := btrim(v_base_handle, '-');
    if v_base_handle = '' then
      v_base_handle := 'product';
    end if;

    -- Serialize handle allocation for the same base slug so two simultaneous
    -- creates cannot both choose the same unique handle.
    perform pg_advisory_xact_lock(hashtextextended(v_base_handle, 0));

    v_handle := v_base_handle;
    while exists (
      select 1
      from public.store_products
      where handle = v_handle
    ) loop
      v_handle := left(v_base_handle, 170) || '-' || v_suffix::text;
      v_suffix := v_suffix + 1;
    end loop;

    insert into public.store_products (
      id,
      title,
      handle,
      description,
      brand_id,
      category_id,
      product_type,
      status,
      currency,
      base_price,
      compare_at_price,
      sku,
      barcode,
      stock_quantity,
      track_inventory,
      seo_title,
      seo_description,
      published_at
    ) values (
      v_product_id,
      btrim(p_title),
      v_handle,
      btrim(coalesce(p_description, '')),
      p_brand_id,
      p_category_id,
      v_category_name,
      p_status,
      'USD',
      p_price,
      p_compare_at_price,
      nullif(btrim(coalesce(p_sku, '')), ''),
      nullif(btrim(coalesce(p_barcode, '')), ''),
      p_stock,
      true,
      nullif(btrim(coalesce(p_seo_title, '')), ''),
      nullif(btrim(coalesce(p_seo_description, '')), ''),
      case when p_status = 'active' then now() else null end
    )
    returning * into v_product;

    v_variant_count := 0;
  end if;

  -- The compact product editor owns pricing/inventory only while the product has
  -- zero or one variant. Multi-variant products stay fully managed by Variant Manager.
  if v_variant_count <= 1 then
    select *
      into v_variant
    from public.store_product_variants
    where product_id = v_product_id
    order by sort_order, created_at
    limit 1
    for update;

    if v_variant.id is null then
      insert into public.store_product_variants (
        product_id,
        title,
        sku,
        barcode,
        price,
        compare_at_price,
        stock_quantity,
        track_inventory,
        allow_backorder,
        options,
        image_url,
        sort_order,
        is_active
      ) values (
        v_product_id,
        'Default',
        nullif(btrim(coalesce(p_sku, '')), ''),
        nullif(btrim(coalesce(p_barcode, '')), ''),
        p_price,
        p_compare_at_price,
        p_stock,
        true,
        false,
        '{}'::jsonb,
        null,
        0,
        true
      )
      returning * into v_variant;

      if v_variant.stock_quantity <> 0 then
        insert into public.store_inventory_movements (
          product_id,
          variant_id,
          movement_type,
          quantity_delta,
          reference_type,
          note,
          created_by
        ) values (
          v_product_id,
          v_variant.id,
          'adjustment',
          v_variant.stock_quantity,
          'product_editor',
          'Initial product-editor stock',
          auth.uid()
        );
      end if;
    else
      v_variant_delta := p_stock - v_variant.stock_quantity;

      update public.store_product_variants
      set
        title = coalesce(nullif(btrim(v_variant.title), ''), 'Default'),
        sku = nullif(btrim(coalesce(p_sku, '')), ''),
        barcode = nullif(btrim(coalesce(p_barcode, '')), ''),
        price = p_price,
        compare_at_price = p_compare_at_price,
        stock_quantity = p_stock,
        track_inventory = true,
        allow_backorder = v_variant.allow_backorder,
        options = v_variant.options,
        image_url = v_variant.image_url,
        sort_order = v_variant.sort_order,
        is_active = true,
        updated_at = now()
      where id = v_variant.id
      returning * into v_variant;

      if v_variant_delta <> 0 then
        insert into public.store_inventory_movements (
          product_id,
          variant_id,
          movement_type,
          quantity_delta,
          reference_type,
          note,
          created_by
        ) values (
          v_product_id,
          v_variant.id,
          'adjustment',
          v_variant_delta,
          'product_editor',
          'Product editor stock change',
          auth.uid()
        );
      end if;
    end if;
  end if;

  -- Collection membership is part of the same SQL transaction. Any invalid
  -- collection raises inside this call and rolls the product/variant changes back.
  perform public.set_store_product_collections(
    v_product_id,
    coalesce(p_collection_ids, '{}'::uuid[])
  );

  -- Product media files are uploaded separately, but the primary image database
  -- metadata can still be committed atomically with the editor save.
  v_normalized_image_url := nullif(btrim(coalesce(p_image_url, '')), '');
  if v_normalized_image_url is not null then
    select image.id
      into v_image_id
    from public.store_product_images as image
    where image.product_id = v_product_id
      and image.url = v_normalized_image_url
    order by image.is_primary desc, image.sort_order, image.created_at
    limit 1
    for update;

    if v_image_id is null then
      select image.id
        into v_image_id
      from public.store_product_images as image
      where image.product_id = v_product_id
      order by image.is_primary desc, image.sort_order, image.created_at
      limit 1
      for update;
    end if;

    update public.store_product_images
    set is_primary = false
    where product_id = v_product_id
      and is_primary = true
      and (v_image_id is null or id <> v_image_id);

    if v_image_id is null then
      insert into public.store_product_images (
        product_id,
        url,
        alt_text,
        sort_order,
        is_primary
      ) values (
        v_product_id,
        v_normalized_image_url,
        btrim(p_title),
        0,
        true
      )
      returning id into v_image_id;
    else
      update public.store_product_images
      set
        url = v_normalized_image_url,
        alt_text = btrim(p_title),
        is_primary = true
      where id = v_image_id;
    end if;
  end if;

  select *
    into v_product
  from public.store_products
  where id = v_product_id;

  return jsonb_build_object(
    'id', v_product.id,
    'handle', v_product.handle,
    'variant_managed_separately', v_variant_count > 1
  );
end;
$$;

revoke all on function public.save_store_product_editor(
  uuid,text,text,uuid,uuid,text,numeric,numeric,text,text,integer,text,text,text,uuid[]
) from public, anon;

grant execute on function public.save_store_product_editor(
  uuid,text,text,uuid,uuid,text,numeric,numeric,text,text,integer,text,text,text,uuid[]
) to authenticated;

comment on function public.save_store_product_editor(
  uuid,text,text,uuid,uuid,text,numeric,numeric,text,text,integer,text,text,text,uuid[]
) is
  'Atomically saves the Dashboard product editor core: product, default/single variant, primary image metadata, and collection membership.';
