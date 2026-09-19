-- Atomic procurement workflows for Space Call.
-- These RPCs are SECURITY DEFINER only because approval must transition protected
-- rows and mutate stock/audit state in one transaction. Every entry point performs
-- an explicit authenticated dashboard-staff check, uses an empty search_path, and
-- is revoked from PUBLIC/anon.

create or replace function public.create_store_purchase_order(
  p_supplier_id uuid,
  p_po_number text,
  p_currency text default 'USD',
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_po_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_variant_product_id uuid;
  v_expected integer;
  v_unit_cost numeric(12,2);
  v_product_title text;
  v_variant_title text;
  v_sku text;
begin
  if v_actor is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  if not exists (
    select 1 from public.store_suppliers
    where id = p_supplier_id and is_active
  ) then
    raise exception 'active supplier not found';
  end if;

  if btrim(coalesce(p_po_number, '')) = '' then
    raise exception 'PO number is required';
  end if;

  if char_length(coalesce(p_currency, '')) <> 3 then
    raise exception 'currency must be a 3-letter code';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'purchase order requires at least one item';
  end if;

  insert into public.store_purchase_orders (
    supplier_id, po_number, status, currency, notes, created_by
  ) values (
    p_supplier_id,
    btrim(p_po_number),
    'draft',
    upper(p_currency),
    nullif(btrim(coalesce(p_notes, '')), ''),
    v_actor
  )
  returning id into v_po_id;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := nullif(v_item->>'product_id', '')::uuid;
      v_variant_id := nullif(v_item->>'variant_id', '')::uuid;
      v_expected := (v_item->>'expected_quantity')::integer;
      v_unit_cost := (v_item->>'unit_cost')::numeric(12,2);
    exception when others then
      raise exception 'invalid purchase order item payload';
    end;

    if v_product_id is null or v_expected is null or v_expected <= 0 then
      raise exception 'each PO item needs a product and positive expected quantity';
    end if;
    if v_unit_cost is null or v_unit_cost < 0 then
      raise exception 'unit cost must be zero or greater';
    end if;

    select title
      into v_product_title
    from public.store_products
    where id = v_product_id
      and track_inventory
      and status <> 'archived';

    if v_product_title is null then
      raise exception 'tracked product not found or archived';
    end if;

    if v_variant_id is not null then
      select product_id, title, sku
        into v_variant_product_id, v_variant_title, v_sku
      from public.store_product_variants
      where id = v_variant_id
        and is_active
        and track_inventory;

      if v_variant_product_id is null then
        raise exception 'tracked active variant not found';
      end if;
      if v_variant_product_id <> v_product_id then
        raise exception 'product and variant mismatch';
      end if;
    else
      if exists (
        select 1
        from public.store_product_variants
        where product_id = v_product_id
      ) then
        raise exception 'variant id is required for products with variants';
      end if;
      v_variant_title := null;
      select sku into v_sku
      from public.store_products
      where id = v_product_id;
    end if;

    insert into public.store_purchase_order_items (
      purchase_order_id,
      product_id,
      variant_id,
      sku_snapshot,
      title_snapshot,
      expected_quantity,
      unit_cost
    ) values (
      v_po_id,
      v_product_id,
      v_variant_id,
      nullif(btrim(coalesce(v_sku, '')), ''),
      case
        when nullif(btrim(coalesce(v_variant_title, '')), '') is null then v_product_title
        else v_product_title || ' · ' || v_variant_title
      end,
      v_expected,
      v_unit_cost
    );
  end loop;

  insert into public.store_procurement_events (
    purchase_order_id, event_type, details, actor_id
  ) values (
    v_po_id,
    'purchase_order_created',
    jsonb_build_object(
      'po_number', btrim(p_po_number),
      'item_count', jsonb_array_length(p_items),
      'currency', upper(p_currency)
    ),
    v_actor
  );

  return v_po_id;
end;
$$;

revoke all on function public.create_store_purchase_order(uuid,text,text,text,jsonb) from public, anon;
grant execute on function public.create_store_purchase_order(uuid,text,text,text,jsonb) to authenticated;


create or replace function public.submit_store_purchase_order(
  p_purchase_order_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_po_number text;
begin
  if v_actor is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  select status, po_number
    into v_status, v_po_number
  from public.store_purchase_orders
  where id = p_purchase_order_id
  for update;

  if v_status is null then
    raise exception 'purchase order not found';
  end if;
  if v_status <> 'draft' then
    raise exception 'only draft purchase orders can be submitted';
  end if;
  if not exists (
    select 1 from public.store_purchase_order_items
    where purchase_order_id = p_purchase_order_id
  ) then
    raise exception 'purchase order requires at least one item';
  end if;

  update public.store_purchase_orders
  set status = 'ordered',
      ordered_at = coalesce(ordered_at, now()),
      updated_at = now()
  where id = p_purchase_order_id;

  insert into public.store_procurement_events (
    purchase_order_id, event_type, details, actor_id
  ) values (
    p_purchase_order_id,
    'purchase_order_submitted',
    jsonb_build_object('po_number', v_po_number),
    v_actor
  );

  return 'ordered';
end;
$$;

revoke all on function public.submit_store_purchase_order(uuid) from public, anon;
grant execute on function public.submit_store_purchase_order(uuid) to authenticated;


create or replace function public.create_store_receiving(
  p_purchase_order_id uuid,
  p_invoice_number text,
  p_receiving_employee_label text default null,
  p_notes text default null,
  p_lines jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_po_status text;
  v_receiving_id uuid;
  v_line jsonb;
  v_po_item_id uuid;
  v_seen uuid[] := '{}'::uuid[];
  v_expected integer;
  v_already_received integer;
  v_remaining integer;
  v_received integer;
  v_damaged integer;
  v_delivered integer;
  v_unit_cost numeric(12,2);
  v_default_cost numeric(12,2);
  v_confirmed boolean;
  v_reason text;
begin
  if v_actor is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  if btrim(coalesce(p_invoice_number, '')) = '' then
    raise exception 'invoice number is required';
  end if;

  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'receiving requires at least one line';
  end if;

  select status
    into v_po_status
  from public.store_purchase_orders
  where id = p_purchase_order_id
  for update;

  if v_po_status is null then
    raise exception 'purchase order not found';
  end if;
  if v_po_status not in ('ordered', 'partially_received') then
    raise exception 'purchase order is not open for receiving';
  end if;

  insert into public.store_receivings (
    purchase_order_id,
    invoice_number,
    status,
    received_by,
    receiving_employee_label,
    received_at,
    notes
  ) values (
    p_purchase_order_id,
    btrim(p_invoice_number),
    'draft',
    v_actor,
    nullif(btrim(coalesce(p_receiving_employee_label, '')), ''),
    now(),
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning id into v_receiving_id;

  for v_line in
    select value from jsonb_array_elements(p_lines)
  loop
    begin
      v_po_item_id := nullif(v_line->>'purchase_order_item_id', '')::uuid;
      v_received := coalesce((v_line->>'received_quantity')::integer, 0);
      v_damaged := coalesce((v_line->>'damaged_quantity')::integer, 0);
      v_confirmed := coalesce((v_line->>'overage_confirmed')::boolean, false);
      v_reason := nullif(btrim(coalesce(v_line->>'overage_reason', '')), '');
    exception when others then
      raise exception 'invalid receiving line payload';
    end;

    if v_po_item_id is null then
      raise exception 'purchase order item is required';
    end if;
    if v_po_item_id = any(v_seen) then
      raise exception 'duplicate purchase order item in receiving';
    end if;
    v_seen := array_append(v_seen, v_po_item_id);

    select expected_quantity, unit_cost
      into v_expected, v_default_cost
    from public.store_purchase_order_items
    where id = v_po_item_id
      and purchase_order_id = p_purchase_order_id
    for update;

    if v_expected is null then
      raise exception 'purchase order item not found';
    end if;

    begin
      v_unit_cost := coalesce(nullif(v_line->>'unit_cost', '')::numeric(12,2), v_default_cost);
    exception when others then
      raise exception 'invalid unit cost';
    end;

    if v_received < 0 or v_damaged < 0 then
      raise exception 'receiving quantities cannot be negative';
    end if;
    if v_received::bigint + v_damaged::bigint > 2147483647 then
      raise exception 'receiving quantity exceeds stock limit';
    end if;
    v_delivered := v_received + v_damaged;
    if v_delivered <= 0 then
      raise exception 'each receiving line requires at least one received or damaged unit';
    end if;
    if v_unit_cost is null or v_unit_cost < 0 then
      raise exception 'unit cost must be zero or greater';
    end if;

    select coalesce(sum(ri.received_quantity), 0)::integer
      into v_already_received
    from public.store_receiving_items ri
    join public.store_receivings r on r.id = ri.receiving_id
    where ri.purchase_order_item_id = v_po_item_id
      and r.status = 'approved';

    v_remaining := greatest(0, v_expected - v_already_received);

    if v_delivered > v_remaining then
      if not v_confirmed or v_reason is null then
        raise exception 'excess delivery requires confirmation and a reason';
      end if;
      if char_length(v_reason) > 500 then
        raise exception 'excess delivery reason must be 500 characters or fewer';
      end if;
    else
      v_confirmed := false;
      v_reason := null;
    end if;

    insert into public.store_receiving_items (
      receiving_id,
      purchase_order_item_id,
      expected_quantity_snapshot,
      remaining_quantity_before,
      received_quantity,
      damaged_quantity,
      unit_cost,
      overage_confirmed,
      overage_reason
    ) values (
      v_receiving_id,
      v_po_item_id,
      v_expected,
      v_remaining,
      v_received,
      v_damaged,
      v_unit_cost,
      v_confirmed,
      v_reason
    );
  end loop;

  insert into public.store_procurement_events (
    purchase_order_id, receiving_id, event_type, details, actor_id
  ) values (
    p_purchase_order_id,
    v_receiving_id,
    'receiving_draft_created',
    jsonb_build_object(
      'invoice_number', btrim(p_invoice_number),
      'line_count', jsonb_array_length(p_lines)
    ),
    v_actor
  );

  return v_receiving_id;
end;
$$;

revoke all on function public.create_store_receiving(uuid,text,text,text,jsonb) from public, anon;
grant execute on function public.create_store_receiving(uuid,text,text,text,jsonb) to authenticated;


create or replace function public.approve_store_receiving(
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
    select 1 from public.store_receiving_items
    where receiving_id = p_receiving_id
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

revoke all on function public.approve_store_receiving(uuid) from public, anon;
grant execute on function public.approve_store_receiving(uuid) to authenticated;
