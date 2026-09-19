create or replace function private.approve_store_receiving_internal(
  p_receiving_id uuid
)
returns table(
  receiving_id uuid,
  purchase_order_id uuid,
  purchase_order_status text,
  stock_units_added integer,
  damaged_units_recorded integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_po_id uuid;
  v_receiving_status text;
  v_invoice_number text;
  v_po_status text;
  v_po_number text;
  v_line record;
  v_already_received integer;
  v_remaining integer;
  v_delivered integer;
  v_variant_product_id uuid;
  v_current_stock integer;
  v_total_received integer := 0;
  v_total_damaged integer := 0;
  v_complete boolean;
begin
  if v_actor is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  select r.purchase_order_id, r.status, r.invoice_number
    into v_po_id, v_receiving_status, v_invoice_number
  from public.store_receivings r
  where r.id = p_receiving_id
  for update;

  if v_po_id is null then
    raise exception 'receiving not found';
  end if;
  if v_receiving_status <> 'draft' then
    raise exception 'receiving is not a draft';
  end if;

  select po.status, po.po_number
    into v_po_status, v_po_number
  from public.store_purchase_orders po
  where po.id = v_po_id
  for update;

  if v_po_status not in ('ordered', 'partially_received') then
    raise exception 'purchase order is not open for receiving';
  end if;

  if not exists (
    select 1
    from public.store_receiving_items check_item
    where check_item.receiving_id = p_receiving_id
  ) then
    raise exception 'receiving has no lines';
  end if;

  for v_line in
    select
      ri.id,
      ri.purchase_order_item_id,
      ri.expected_quantity_snapshot,
      ri.remaining_quantity_before,
      ri.received_quantity,
      ri.damaged_quantity,
      ri.unit_cost,
      ri.overage_confirmed,
      ri.overage_reason,
      poi.product_id,
      poi.variant_id,
      poi.expected_quantity
    from public.store_receiving_items ri
    join public.store_purchase_order_items poi
      on poi.id = ri.purchase_order_item_id
    where ri.receiving_id = p_receiving_id
      and poi.purchase_order_id = v_po_id
    order by ri.purchase_order_item_id
    for update of ri, poi
  loop
    select coalesce(sum(prev_ri.received_quantity), 0)::integer
      into v_already_received
    from public.store_receiving_items prev_ri
    join public.store_receivings prev_r on prev_r.id = prev_ri.receiving_id
    where prev_ri.purchase_order_item_id = v_line.purchase_order_item_id
      and prev_r.status = 'approved';

    v_remaining := greatest(0, v_line.expected_quantity - v_already_received);
    v_delivered := v_line.received_quantity + v_line.damaged_quantity;

    if v_line.expected_quantity_snapshot <> v_line.expected_quantity
       or v_line.remaining_quantity_before <> v_remaining then
      raise exception 'receiving is stale; refresh the PO quantities and create a new receipt';
    end if;

    if v_delivered > v_remaining then
      if v_line.overage_confirmed is not true
         or btrim(coalesce(v_line.overage_reason, '')) = '' then
        raise exception 'excess delivery requires confirmation and a reason';
      end if;
    end if;

    if v_line.received_quantity > 0 then
      if v_line.variant_id is not null then
        select v.product_id, v.stock_quantity
          into v_variant_product_id, v_current_stock
        from public.store_product_variants v
        where v.id = v_line.variant_id
          and v.is_active
          and v.track_inventory
        for update;

        if v_variant_product_id is null then
          raise exception 'tracked active variant not found';
        end if;
        if v_variant_product_id <> v_line.product_id then
          raise exception 'product and variant mismatch';
        end if;
        if v_current_stock::bigint + v_line.received_quantity::bigint > 2147483647 then
          raise exception 'stock limit exceeded';
        end if;

        update public.store_product_variants
        set stock_quantity = stock_quantity + v_line.received_quantity,
            updated_at = now()
        where id = v_line.variant_id;

        update public.store_products p
        set stock_quantity = (
              select coalesce(sum(v.stock_quantity), 0)::integer
              from public.store_product_variants v
              where v.product_id = v_line.product_id
            ),
            updated_at = now()
        where p.id = v_line.product_id;
      else
        if exists (
          select 1
          from public.store_product_variants
          where product_id = v_line.product_id
        ) then
          raise exception 'variant id is required for products with variants';
        end if;

        select p.stock_quantity
          into v_current_stock
        from public.store_products p
        where p.id = v_line.product_id
          and p.track_inventory
          and p.status <> 'archived'
        for update;

        if v_current_stock is null then
          raise exception 'tracked product not found or archived';
        end if;
        if v_current_stock::bigint + v_line.received_quantity::bigint > 2147483647 then
          raise exception 'stock limit exceeded';
        end if;

        update public.store_products
        set stock_quantity = stock_quantity + v_line.received_quantity,
            updated_at = now()
        where id = v_line.product_id;
      end if;

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
        v_line.product_id,
        v_line.variant_id,
        'purchase',
        v_line.received_quantity,
        'receiving',
        p_receiving_id::text,
        'PO ' || v_po_number || ' · Invoice ' || v_invoice_number,
        v_actor
      );

      v_total_received := v_total_received + v_line.received_quantity;
    end if;

    v_total_damaged := v_total_damaged + v_line.damaged_quantity;
  end loop;

  update public.store_receivings
  set status = 'approved',
      approved_by = v_actor,
      approved_at = now(),
      updated_at = now()
  where id = p_receiving_id
    and status = 'draft';

  select not exists (
    select 1
    from public.store_purchase_order_items poi
    where poi.purchase_order_id = v_po_id
      and (
        select coalesce(sum(ri.received_quantity), 0)
        from public.store_receiving_items ri
        join public.store_receivings r on r.id = ri.receiving_id
        where ri.purchase_order_item_id = poi.id
          and r.status = 'approved'
      ) < poi.expected_quantity
  )
  into v_complete;

  update public.store_purchase_orders
  set status = case when v_complete then 'received' else 'partially_received' end,
      updated_at = now()
  where id = v_po_id;

  v_po_status := case when v_complete then 'received' else 'partially_received' end;

  insert into public.store_procurement_events (
    purchase_order_id,
    receiving_id,
    event_type,
    details,
    actor_id
  ) values (
    v_po_id,
    p_receiving_id,
    'receiving_approved',
    jsonb_build_object(
      'po_number', v_po_number,
      'invoice_number', v_invoice_number,
      'stock_units_added', v_total_received,
      'damaged_units_recorded', v_total_damaged,
      'purchase_order_status', v_po_status
    ),
    v_actor
  );

  return query
  select p_receiving_id, v_po_id, v_po_status, v_total_received, v_total_damaged;
end;
$$;


revoke all on function private.approve_store_receiving_internal(uuid) from public, anon;
grant execute on function private.approve_store_receiving_internal(uuid) to authenticated;
