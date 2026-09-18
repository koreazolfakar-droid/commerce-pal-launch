create or replace function public.update_store_order_status(
  p_order_id uuid,
  p_status text
)
returns public.store_orders
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_order public.store_orders%rowtype;
  v_item record;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  select *
    into v_order
  from public.store_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if p_status not in ('pending','confirmed','processing','shipped','delivered','cancelled') then
    raise exception 'invalid order status';
  end if;

  if p_status = v_order.status then
    return v_order;
  end if;

  if v_order.status in ('delivered','cancelled') then
    raise exception 'final order status cannot be changed';
  end if;

  if not (
    (v_order.status = 'pending' and p_status in ('confirmed','cancelled')) or
    (v_order.status = 'confirmed' and p_status in ('processing','cancelled')) or
    (v_order.status = 'processing' and p_status in ('shipped','cancelled')) or
    (v_order.status = 'shipped' and p_status = 'delivered')
  ) then
    raise exception 'invalid order status transition';
  end if;

  if p_status = 'cancelled' then
    for v_item in
      select
        oi.product_id,
        oi.variant_id,
        oi.quantity,
        v.track_inventory
      from public.store_order_items oi
      left join public.store_product_variants v on v.id = oi.variant_id
      where oi.order_id = p_order_id
    loop
      if v_item.variant_id is not null and coalesce(v_item.track_inventory, false) then
        update public.store_product_variants
        set stock_quantity = stock_quantity + v_item.quantity,
            updated_at = now()
        where id = v_item.variant_id;

        insert into public.store_inventory_movements (
          product_id,
          variant_id,
          movement_type,
          quantity_delta,
          reference_type,
          reference_id,
          note,
          created_by
        ) values (
          v_item.product_id,
          v_item.variant_id,
          'release',
          v_item.quantity,
          'order_cancel',
          p_order_id::text,
          'Released after cancellation of order #' || v_order.order_number::text,
          auth.uid()
        );
      end if;
    end loop;

    update public.store_products p
    set stock_quantity = (
          select coalesce(sum(v.stock_quantity), 0)::integer
          from public.store_product_variants v
          where v.product_id = p.id
        ),
        updated_at = now()
    where p.id in (
      select distinct product_id
      from public.store_order_items
      where order_id = p_order_id
        and product_id is not null
    );
  end if;

  update public.store_orders
  set status = p_status
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.update_store_order_status(uuid, text) from public, anon;
grant execute on function public.update_store_order_status(uuid, text) to authenticated;

create or replace function public.update_store_order_payment_status(
  p_order_id uuid,
  p_payment_status text
)
returns public.store_orders
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_order public.store_orders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  if p_payment_status not in ('unpaid','paid','refunded','partially_refunded') then
    raise exception 'invalid payment status';
  end if;

  update public.store_orders
  set payment_status = p_payment_status
  where id = p_order_id
  returning * into v_order;

  if v_order.id is null then
    raise exception 'order not found';
  end if;

  return v_order;
end;
$$;

revoke all on function public.update_store_order_payment_status(uuid, text) from public, anon;
grant execute on function public.update_store_order_payment_status(uuid, text) to authenticated;
