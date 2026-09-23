-- Add a first-class READY stage between preparation and delivery.
-- Keeps the existing version checks, cancellation stock release, audit trail,
-- and DONE -> Sales invariants unchanged.

alter table public.store_orders
  drop constraint if exists store_orders_status_check;

alter table public.store_orders
  add constraint store_orders_status_check
  check (status in (
    'new',
    'confirmed',
    'processing',
    'ready',
    'out_for_delivery',
    'delivered',
    'done',
    'cancelled'
  ));

create or replace function public.update_store_order_status(
  p_order_id uuid,
  p_status text,
  p_expected_version integer default null
)
returns public.store_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.store_orders%rowtype;
  v_after public.store_orders%rowtype;
  v_item record;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  select *
  into v_before
  from public.store_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if p_expected_version is not null and p_expected_version <> v_before.version then
    raise exception 'order_version_conflict';
  end if;

  if p_status not in (
    'new',
    'confirmed',
    'processing',
    'ready',
    'out_for_delivery',
    'delivered',
    'done',
    'cancelled'
  ) then
    raise exception 'invalid order status';
  end if;

  if p_status = v_before.status then
    return v_before;
  end if;

  if v_before.status in ('done', 'cancelled') then
    raise exception 'final order status cannot be changed';
  end if;

  if not (
    (v_before.status = 'new' and p_status in ('confirmed', 'cancelled'))
    or (v_before.status = 'confirmed' and p_status in ('processing', 'cancelled'))
    or (v_before.status = 'processing' and p_status in ('ready', 'out_for_delivery', 'cancelled'))
    or (v_before.status = 'ready' and p_status in ('out_for_delivery', 'cancelled'))
    or (v_before.status = 'out_for_delivery' and p_status in ('delivered', 'cancelled'))
    or (v_before.status = 'delivered' and p_status = 'done')
  ) then
    raise exception 'invalid order status transition';
  end if;

  if p_status = 'done' and v_before.payment_status = 'unpaid' then
    raise exception 'order_payment_required_before_done';
  end if;

  if p_status = 'cancelled' then
    for v_item in
      select
        order_item.product_id,
        order_item.variant_id,
        order_item.quantity,
        variant.track_inventory
      from public.store_order_items as order_item
      left join public.store_product_variants as variant
        on variant.id = order_item.variant_id
      where order_item.order_id = p_order_id
      order by order_item.variant_id
    loop
      if v_item.variant_id is not null
        and coalesce(v_item.track_inventory, false) then
        update public.store_product_variants
        set
          stock_quantity = stock_quantity + v_item.quantity,
          updated_at = pg_catalog.now()
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
          'Released after cancellation of order #' || v_before.order_number::text,
          auth.uid()
        );
      end if;
    end loop;
  end if;

  update public.store_orders
  set
    status = p_status,
    version = version + 1,
    completed_at = case
      when p_status = 'done' then coalesce(completed_at, pg_catalog.now())
      else completed_at
    end
  where id = p_order_id
  returning * into v_after;

  if p_status = 'done' then
    insert into public.store_sales (
      order_id,
      order_number,
      customer_name,
      customer_phone,
      payment_method,
      payment_status,
      currency,
      subtotal,
      shipping_total,
      discount_total,
      total,
      completed_at
    ) values (
      v_after.id,
      v_after.order_number,
      v_after.customer_name,
      v_after.customer_phone,
      v_after.payment_method,
      v_after.payment_status,
      v_after.currency,
      v_after.subtotal,
      v_after.shipping_total,
      v_after.discount_total,
      v_after.total,
      coalesce(v_after.completed_at, pg_catalog.now())
    )
    on conflict (order_id) do nothing;
  end if;

  insert into public.store_order_audit_log (
    order_id,
    action,
    from_state,
    to_state,
    actor_user_id,
    actor_kind
  ) values (
    p_order_id,
    'status_changed',
    pg_catalog.jsonb_build_object(
      'status', v_before.status,
      'version', v_before.version
    ),
    pg_catalog.jsonb_build_object(
      'status', v_after.status,
      'version', v_after.version
    ),
    auth.uid(),
    'staff'
  );

  return v_after;
end;
$$;

revoke all on function public.update_store_order_status(uuid, text, integer)
  from public, anon;
grant execute on function public.update_store_order_status(uuid, text, integer)
  to authenticated;
