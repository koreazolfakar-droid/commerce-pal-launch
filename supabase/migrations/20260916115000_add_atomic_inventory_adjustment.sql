create or replace function public.adjust_store_inventory(
  p_product_id uuid,
  p_variant_id uuid default null,
  p_quantity_delta integer default 0,
  p_note text default null
)
returns table(new_stock integer, movement_id uuid)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_product_id uuid;
  v_current_stock integer;
  v_new_stock integer;
  v_movement_id uuid;
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'not authorized';
  end if;

  if p_quantity_delta = 0 then
    raise exception 'quantity delta cannot be zero';
  end if;

  if p_variant_id is not null then
    select product_id, stock_quantity
      into v_product_id, v_current_stock
    from public.store_product_variants
    where id = p_variant_id
    for update;

    if v_product_id is null then
      raise exception 'variant not found';
    end if;

    if p_product_id is not null and p_product_id <> v_product_id then
      raise exception 'product and variant mismatch';
    end if;

    v_new_stock := v_current_stock + p_quantity_delta;
    if v_new_stock < 0 then
      raise exception 'insufficient stock';
    end if;

    update public.store_product_variants
    set stock_quantity = v_new_stock,
        updated_at = now()
    where id = p_variant_id;
  else
    select id, stock_quantity
      into v_product_id, v_current_stock
    from public.store_products
    where id = p_product_id
    for update;

    if v_product_id is null then
      raise exception 'product not found';
    end if;

    v_new_stock := v_current_stock + p_quantity_delta;
    if v_new_stock < 0 then
      raise exception 'insufficient stock';
    end if;

    update public.store_products
    set stock_quantity = v_new_stock,
        updated_at = now()
    where id = v_product_id;
  end if;

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
    p_variant_id,
    'adjustment',
    p_quantity_delta,
    'manual_dashboard',
    nullif(btrim(coalesce(p_note, '')), ''),
    auth.uid()
  )
  returning id into v_movement_id;

  return query select v_new_stock, v_movement_id;
end;
$$;

revoke all on function public.adjust_store_inventory(uuid, uuid, integer, text) from public, anon;
grant execute on function public.adjust_store_inventory(uuid, uuid, integer, text) to authenticated;
