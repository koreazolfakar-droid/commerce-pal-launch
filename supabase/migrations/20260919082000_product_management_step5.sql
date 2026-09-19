-- Step 5: atomic product management operations for the Space Call dashboard.
-- Existing tables and RLS remain the source of truth; these functions run with caller permissions.

create or replace function public.set_store_product_collections(
  p_product_id uuid,
  p_collection_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_missing integer;
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  if not exists (select 1 from public.store_products where id = p_product_id) then
    raise exception 'product not found';
  end if;

  select count(*) into v_missing
  from (
    select distinct collection_id
    from unnest(coalesce(p_collection_ids, '{}'::uuid[])) as ids(collection_id)
  ) requested
  left join public.store_collections c on c.id = requested.collection_id
  where c.id is null;

  if v_missing > 0 then
    raise exception 'one or more collections do not exist';
  end if;

  delete from public.store_collection_products
  where product_id = p_product_id
    and collection_id <> all(coalesce(p_collection_ids, '{}'::uuid[]));

  insert into public.store_collection_products(collection_id, product_id, sort_order)
  select collection_id, p_product_id, ordinality::integer - 1
  from unnest(coalesce(p_collection_ids, '{}'::uuid[]))
    with ordinality as ids(collection_id, ordinality)
  on conflict (collection_id, product_id) do update
    set sort_order = excluded.sort_order;
end;
$$;

create or replace function public.set_store_products_status(
  p_product_ids uuid[],
  p_status text
)
returns integer
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_count integer;
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  if p_status not in ('active','draft','archived') then
    raise exception 'invalid product status';
  end if;

  update public.store_products
  set status = p_status,
      published_at = case
        when p_status = 'active' then coalesce(published_at, now())
        else null
      end,
      updated_at = now()
  where id = any(coalesce(p_product_ids, '{}'::uuid[]));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.duplicate_store_product(p_product_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_source public.store_products%rowtype;
  v_new_id uuid;
  v_base_handle text;
  v_handle text;
  v_suffix integer := 2;
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  select * into v_source
  from public.store_products
  where id = p_product_id;

  if v_source.id is null then
    raise exception 'product not found';
  end if;

  v_base_handle := left(v_source.handle || '-copy', 180);
  v_handle := v_base_handle;
  while exists (select 1 from public.store_products where handle = v_handle) loop
    v_handle := left(v_base_handle, 170) || '-' || v_suffix::text;
    v_suffix := v_suffix + 1;
  end loop;

  insert into public.store_products(
    title,title_ar,handle,description,description_ar,description_html,
    brand_id,category_id,product_type,status,currency,base_price,compare_at_price,
    sku,barcode,stock_quantity,track_inventory,allow_backorder,featured,best_seller,
    tags,specifications,seo_title,seo_description,sort_order,published_at
  ) values (
    v_source.title || ' Copy',
    case when v_source.title_ar is null then null else v_source.title_ar || ' (نسخة)' end,
    v_handle,
    v_source.description,v_source.description_ar,v_source.description_html,
    v_source.brand_id,v_source.category_id,v_source.product_type,'draft',v_source.currency,
    v_source.base_price,v_source.compare_at_price,
    null,null,0,v_source.track_inventory,v_source.allow_backorder,false,false,
    v_source.tags,v_source.specifications,v_source.seo_title,v_source.seo_description,
    v_source.sort_order,null
  )
  returning id into v_new_id;

  insert into public.store_product_variants(
    product_id,title,sku,barcode,price,compare_at_price,stock_quantity,
    track_inventory,allow_backorder,options,image_url,sort_order,is_active
  )
  select
    v_new_id,title,null,null,price,compare_at_price,0,
    track_inventory,allow_backorder,options,image_url,sort_order,is_active
  from public.store_product_variants
  where product_id = p_product_id
  order by sort_order,created_at;

  insert into public.store_product_images(product_id,url,alt_text,sort_order,is_primary)
  select v_new_id,url,alt_text,sort_order,is_primary
  from public.store_product_images
  where product_id = p_product_id
  order by sort_order,created_at;

  insert into public.store_collection_products(collection_id,product_id,sort_order)
  select collection_id,v_new_id,sort_order
  from public.store_collection_products
  where product_id = p_product_id
  on conflict do nothing;

  return v_new_id;
end;
$$;

create or replace function public.create_store_product_variant(
  p_product_id uuid,
  p_title text,
  p_sku text,
  p_barcode text,
  p_price numeric,
  p_compare_at_price numeric,
  p_stock integer,
  p_track_inventory boolean,
  p_allow_backorder boolean,
  p_options jsonb,
  p_image_url text,
  p_sort_order integer,
  p_is_active boolean
)
returns public.store_product_variants
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_variant public.store_product_variants%rowtype;
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;
  if not exists (select 1 from public.store_products where id=p_product_id) then
    raise exception 'product not found';
  end if;
  if coalesce(p_price,0) < 0 then raise exception 'price cannot be negative'; end if;
  if p_compare_at_price is not null and p_compare_at_price < 0 then
    raise exception 'compare-at price cannot be negative';
  end if;
  if coalesce(p_stock,0) < 0 then raise exception 'stock cannot be negative'; end if;

  insert into public.store_product_variants(
    product_id,title,sku,barcode,price,compare_at_price,stock_quantity,
    track_inventory,allow_backorder,options,image_url,sort_order,is_active
  ) values (
    p_product_id,
    coalesce(nullif(btrim(p_title),''),'Default'),
    nullif(btrim(coalesce(p_sku,'')),''),
    nullif(btrim(coalesce(p_barcode,'')),''),
    coalesce(p_price,0),
    p_compare_at_price,
    coalesce(p_stock,0),
    coalesce(p_track_inventory,true),
    coalesce(p_allow_backorder,false),
    coalesce(p_options,'{}'::jsonb),
    nullif(btrim(coalesce(p_image_url,'')),''),
    greatest(0,coalesce(p_sort_order,0)),
    coalesce(p_is_active,true)
  )
  returning * into v_variant;

  if v_variant.stock_quantity <> 0 then
    insert into public.store_inventory_movements(
      product_id,variant_id,movement_type,quantity_delta,reference_type,note,created_by
    ) values (
      p_product_id,v_variant.id,'adjustment',v_variant.stock_quantity,
      'variant_manager','Initial variant stock',auth.uid()
    );
  end if;

  return v_variant;
end;
$$;

create or replace function public.update_store_product_variant(
  p_variant_id uuid,
  p_title text,
  p_sku text,
  p_barcode text,
  p_price numeric,
  p_compare_at_price numeric,
  p_stock integer,
  p_track_inventory boolean,
  p_allow_backorder boolean,
  p_options jsonb,
  p_image_url text,
  p_sort_order integer,
  p_is_active boolean
)
returns public.store_product_variants
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_before public.store_product_variants%rowtype;
  v_after public.store_product_variants%rowtype;
  v_delta integer;
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  select * into v_before
  from public.store_product_variants
  where id=p_variant_id
  for update;

  if v_before.id is null then raise exception 'variant not found'; end if;
  if coalesce(p_price,0) < 0 then raise exception 'price cannot be negative'; end if;
  if p_compare_at_price is not null and p_compare_at_price < 0 then
    raise exception 'compare-at price cannot be negative';
  end if;
  if coalesce(p_stock,0) < 0 then raise exception 'stock cannot be negative'; end if;

  update public.store_product_variants
  set title=coalesce(nullif(btrim(p_title),''),'Default'),
      sku=nullif(btrim(coalesce(p_sku,'')),''),
      barcode=nullif(btrim(coalesce(p_barcode,'')),''),
      price=coalesce(p_price,0),
      compare_at_price=p_compare_at_price,
      stock_quantity=coalesce(p_stock,0),
      track_inventory=coalesce(p_track_inventory,true),
      allow_backorder=coalesce(p_allow_backorder,false),
      options=coalesce(p_options,'{}'::jsonb),
      image_url=nullif(btrim(coalesce(p_image_url,'')),''),
      sort_order=greatest(0,coalesce(p_sort_order,0)),
      is_active=coalesce(p_is_active,true),
      updated_at=now()
  where id=p_variant_id
  returning * into v_after;

  v_delta := v_after.stock_quantity - v_before.stock_quantity;
  if v_delta <> 0 then
    insert into public.store_inventory_movements(
      product_id,variant_id,movement_type,quantity_delta,reference_type,note,created_by
    ) values (
      v_after.product_id,v_after.id,'adjustment',v_delta,
      'variant_manager','Variant Manager stock change',auth.uid()
    );
  end if;

  return v_after;
end;
$$;

create or replace function public.reorder_store_product_variants(p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_item jsonb;
  v_product_id uuid;
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'items must be an array'; end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if v_product_id is null then
      select product_id into v_product_id
      from public.store_product_variants
      where id=(v_item->>'id')::uuid;
    end if;

    update public.store_product_variants
    set sort_order=greatest(0,coalesce((v_item->>'sort_order')::integer,0)),
        updated_at=now()
    where id=(v_item->>'id')::uuid
      and product_id=v_product_id;
  end loop;
end;
$$;

create or replace function public.delete_store_product_safe(p_product_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_stock integer;
begin
  if auth.uid() is null or not private.is_dashboard_admin() then
    raise exception 'dashboard admin required';
  end if;

  select stock_quantity into v_stock from public.store_products where id=p_product_id;
  if v_stock is null then raise exception 'product not found'; end if;
  if v_stock <> 0 then raise exception 'product still has stock; archive it instead'; end if;

  if exists (select 1 from public.store_order_items where product_id = p_product_id)
     or exists (select 1 from public.store_inventory_movements where product_id = p_product_id) then
    raise exception 'product has order or inventory history; archive it instead';
  end if;

  delete from public.store_products where id = p_product_id;
end;
$$;

create or replace function public.delete_store_product_variant_safe(p_variant_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_product_id uuid;
  v_stock integer;
  v_variant_count integer;
begin
  if auth.uid() is null or not private.is_dashboard_admin() then
    raise exception 'dashboard admin required';
  end if;

  select product_id,stock_quantity into v_product_id,v_stock
  from public.store_product_variants
  where id=p_variant_id;

  if v_product_id is null then raise exception 'variant not found'; end if;
  if v_stock <> 0 then raise exception 'variant still has stock; set it to zero or deactivate it instead'; end if;

  select count(*) into v_variant_count
  from public.store_product_variants
  where product_id=v_product_id;

  if v_variant_count <= 1 then
    raise exception 'cannot delete the only variant; deactivate or edit it instead';
  end if;

  if exists (select 1 from public.store_order_items where variant_id=p_variant_id)
     or exists (select 1 from public.store_inventory_movements where variant_id=p_variant_id) then
    raise exception 'variant has order or inventory history; deactivate it instead';
  end if;

  delete from public.store_product_variants where id=p_variant_id;
end;
$$;

revoke all on function public.set_store_product_collections(uuid,uuid[]) from public,anon;
revoke all on function public.set_store_products_status(uuid[],text) from public,anon;
revoke all on function public.duplicate_store_product(uuid) from public,anon;
revoke all on function public.create_store_product_variant(uuid,text,text,text,numeric,numeric,integer,boolean,boolean,jsonb,text,integer,boolean) from public,anon;
revoke all on function public.update_store_product_variant(uuid,text,text,text,numeric,numeric,integer,boolean,boolean,jsonb,text,integer,boolean) from public,anon;
revoke all on function public.reorder_store_product_variants(jsonb) from public,anon;
revoke all on function public.delete_store_product_safe(uuid) from public,anon;
revoke all on function public.delete_store_product_variant_safe(uuid) from public,anon;

grant execute on function public.set_store_product_collections(uuid,uuid[]) to authenticated;
grant execute on function public.set_store_products_status(uuid[],text) to authenticated;
grant execute on function public.duplicate_store_product(uuid) to authenticated;
grant execute on function public.create_store_product_variant(uuid,text,text,text,numeric,numeric,integer,boolean,boolean,jsonb,text,integer,boolean) to authenticated;
grant execute on function public.update_store_product_variant(uuid,text,text,text,numeric,numeric,integer,boolean,boolean,jsonb,text,integer,boolean) to authenticated;
grant execute on function public.reorder_store_product_variants(jsonb) to authenticated;
grant execute on function public.delete_store_product_safe(uuid) to authenticated;
grant execute on function public.delete_store_product_variant_safe(uuid) to authenticated;
