-- Keep order inventory movements consistent with the stock that actually changed.
-- Backorders may exceed on-hand stock, so only the on-hand portion is decremented
-- and later released on cancellation. Historical non-backorder orders continue
-- to restore their exact sale movement quantity.

CREATE OR REPLACE FUNCTION public.create_store_order_internal(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_items jsonb;
  v_item jsonb;
  v_customer jsonb;
  v_order_id uuid;
  v_order_number bigint;
  v_product_id uuid;
  v_variant_id uuid;
  v_qty integer;
  v_title text;
  v_variant_title text;
  v_sku text;
  v_options jsonb;
  v_price numeric(12,2);
  v_currency text;
  v_order_currency text := null;
  v_stock integer;
  v_track boolean;
  v_backorder boolean;
  v_subtotal numeric(12,2) := 0;
  v_shipping_total numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_delivery_type text := 'free';
  v_payment text;
  v_name text;
  v_phone text;
  v_email text;
  v_address text;
  v_city text;
  v_notes text;
  v_reference text;
  v_idempotency_key text;
  v_payload_fingerprint text;
  v_location jsonb;
  v_expected_subtotal numeric(12,2);
  v_expected_delivery_fee numeric(12,2);
  v_delivery_fee_text text;
  v_existing public.store_orders%rowtype;
  v_stock_decrement integer := 0;
begin
  if payload is null or pg_catalog.jsonb_typeof(payload) <> 'object' then
    raise exception 'invalid_payload';
  end if;

  v_items := payload -> 'items';
  v_customer := coalesce(payload -> 'customer', '{}'::jsonb);

  if v_items is null
    or pg_catalog.jsonb_typeof(v_items) <> 'array'
    or pg_catalog.jsonb_array_length(v_items) < 1
    or pg_catalog.jsonb_array_length(v_items) > 50 then
    raise exception 'invalid_items';
  end if;

  v_idempotency_key := pg_catalog.left(
    pg_catalog.btrim(coalesce(payload ->> 'idempotency_key', '')),
    128
  );
  if pg_catalog.length(v_idempotency_key) < 16 then
    raise exception 'idempotency_key_required';
  end if;

  v_payload_fingerprint := pg_catalog.md5(
    pg_catalog.jsonb_build_object(
      'customer', payload -> 'customer',
      'items', payload -> 'items',
      'payment_method', payload -> 'payment_method',
      'notes', payload -> 'notes'
    )::text
  );

  -- Serialize requests that reuse the same checkout key before checking whether
  -- an order already exists. This prevents duplicate stock deduction.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_idempotency_key, 0)
  );

  select *
  into v_existing
  from public.store_orders
  where idempotency_key = v_idempotency_key
  limit 1;

  if found then
    if v_existing.idempotency_fingerprint is distinct from v_payload_fingerprint then
      raise exception 'idempotency_key_conflict';
    end if;

    return pg_catalog.jsonb_build_object(
      'order_id', v_existing.id,
      'order_number', v_existing.order_number,
      'currency', v_existing.currency,
      'subtotal', v_existing.subtotal,
      'shipping_total', v_existing.shipping_total,
      'delivery_type', v_existing.delivery_type,
      'total', v_existing.total,
      'status', v_existing.status,
      'version', v_existing.version,
      'replayed', true
    );
  end if;

  v_name := pg_catalog.left(
    pg_catalog.btrim(coalesce(v_customer ->> 'name', '')),
    120
  );
  v_phone := pg_catalog.left(
    pg_catalog.regexp_replace(
      coalesce(v_customer ->> 'phone', ''),
      '[^0-9+]',
      '',
      'g'
    ),
    32
  );
  v_email := nullif(
    pg_catalog.left(pg_catalog.btrim(coalesce(v_customer ->> 'email', '')), 200),
    ''
  );
  v_address := nullif(
    pg_catalog.left(pg_catalog.btrim(coalesce(v_customer ->> 'address', '')), 500),
    ''
  );
  v_city := nullif(
    pg_catalog.left(pg_catalog.btrim(coalesce(v_customer ->> 'city', '')), 120),
    ''
  );
  v_notes := nullif(
    pg_catalog.left(pg_catalog.btrim(coalesce(payload ->> 'notes', '')), 1000),
    ''
  );
  v_reference := nullif(
    pg_catalog.left(pg_catalog.btrim(coalesce(payload ->> 'reference', '')), 120),
    ''
  );
  v_payment := coalesce(nullif(payload ->> 'payment_method', ''), 'cash');
  v_location := payload -> 'delivery_location';

  if pg_catalog.length(v_name) < 2 then
    raise exception 'customer_name_required';
  end if;
  if pg_catalog.length(v_phone) < 7 then
    raise exception 'customer_phone_required';
  end if;
  if v_city is null or pg_catalog.length(v_city) < 2 then
    raise exception 'customer_city_required';
  end if;
  if v_address is null or pg_catalog.length(v_address) < 2 then
    raise exception 'customer_address_required';
  end if;

  begin
    v_expected_subtotal := (payload ->> 'expected_subtotal')::numeric(12,2);
    v_expected_delivery_fee := (payload ->> 'expected_delivery_fee')::numeric(12,2);
  exception when others then
    raise exception 'invalid_expected_pricing';
  end;

  if v_expected_subtotal < 0 or v_expected_subtotal > 1000000000 then
    raise exception 'invalid_expected_subtotal';
  end if;
  if v_expected_delivery_fee < 0 or v_expected_delivery_fee > 10000 then
    raise exception 'invalid_expected_delivery_fee';
  end if;

  if v_payment not in ('cash', 'whish') then
    raise exception 'invalid_payment_method';
  end if;

  if v_location is not null then
    if pg_catalog.jsonb_typeof(v_location) <> 'object'
      or not (v_location ? 'latitude')
      or not (v_location ? 'longitude')
      or (v_location ->> 'latitude')::numeric not between -90 and 90
      or (v_location ->> 'longitude')::numeric not between -180 and 180 then
      raise exception 'invalid_delivery_location';
    end if;
  end if;

  -- Validate all identifiers and quantities before acquiring product locks.
  for v_item in
    select value from pg_catalog.jsonb_array_elements(v_items)
  loop
    begin
      v_product_id := (v_item ->> 'product_id')::uuid;
      v_variant_id := (v_item ->> 'variant_id')::uuid;
      v_qty := (v_item ->> 'quantity')::integer;
    exception when others then
      raise exception 'invalid_item_identifier';
    end;

    if v_qty < 1 or v_qty > 99 then
      raise exception 'invalid_quantity';
    end if;
  end loop;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(v_items) as duplicate_item
    group by duplicate_item ->> 'variant_id'
    having pg_catalog.count(*) > 1
  ) then
    raise exception 'duplicate_variant';
  end if;

  -- Lock requested variants in deterministic UUID order. Competing checkouts
  -- for the same stock therefore serialize instead of overselling or deadlocking.
  perform 1
  from public.store_product_variants as locked_variant
  where locked_variant.id in (
    select distinct (requested_item ->> 'variant_id')::uuid
    from pg_catalog.jsonb_array_elements(v_items) as requested_item
  )
  order by locked_variant.id
  for update;

  for v_item in
    select value from pg_catalog.jsonb_array_elements(v_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_variant_id := (v_item ->> 'variant_id')::uuid;
    v_qty := (v_item ->> 'quantity')::integer;

    select
      product.title,
      variant.title,
      variant.sku,
      variant.options,
      variant.price,
      product.currency,
      variant.stock_quantity,
      variant.track_inventory,
      variant.allow_backorder
    into
      v_title,
      v_variant_title,
      v_sku,
      v_options,
      v_price,
      v_currency,
      v_stock,
      v_track,
      v_backorder
    from public.store_product_variants as variant
    join public.store_products as product on product.id = variant.product_id
    where variant.id = v_variant_id
      and variant.product_id = v_product_id
      and variant.is_active = true
      and product.status = 'active'
      and (product.published_at is null or product.published_at <= pg_catalog.now());

    if not found then
      raise exception 'product_or_variant_unavailable';
    end if;
    if v_track and not v_backorder and v_stock < v_qty then
      raise exception 'insufficient_stock';
    end if;

    if v_order_currency is null then
      v_order_currency := v_currency;
    elsif v_order_currency <> v_currency then
      raise exception 'mixed_currency_order';
    end if;

    v_subtotal := v_subtotal + (v_price * v_qty);
  end loop;

  select setting.value_text
  into v_delivery_fee_text
  from public.cms_site_settings as setting
  where setting.key = 'delivery_fee'
  limit 1;

  if v_delivery_fee_text is null
    or v_delivery_fee_text !~ '^[0-9]+([.][0-9]{1,2})?$' then
    raise exception 'invalid_delivery_fee_config';
  end if;

  v_shipping_total := v_delivery_fee_text::numeric(12,2);
  if v_shipping_total < 0 or v_shipping_total > 10000 then
    raise exception 'invalid_delivery_fee_config';
  end if;

  -- Price-consent barrier: the browser sends only the amounts the shopper saw.
  -- The database remains authoritative and recalculates both values itself.
  if v_expected_subtotal is distinct from v_subtotal
    or v_expected_delivery_fee is distinct from v_shipping_total then
    raise exception 'pricing_changed';
  end if;

  v_delivery_type := case when v_shipping_total = 0 then 'free' else 'paid' end;
  v_total := v_subtotal + v_shipping_total;

  insert into public.store_orders (
    status,
    payment_status,
    payment_method,
    customer_name,
    customer_phone,
    customer_email,
    delivery_address,
    city,
    notes,
    customer_reference,
    currency,
    subtotal,
    shipping_total,
    discount_total,
    total,
    source,
    idempotency_key,
    idempotency_fingerprint,
    delivery_type,
    delivery_location,
    version
  ) values (
    'new',
    'unpaid',
    v_payment,
    v_name,
    v_phone,
    v_email,
    v_address,
    v_city,
    v_notes,
    v_reference,
    coalesce(v_order_currency, 'USD'),
    v_subtotal,
    v_shipping_total,
    0,
    v_total,
    'web',
    v_idempotency_key,
    v_payload_fingerprint,
    v_delivery_type,
    v_location,
    1
  )
  returning id, order_number into v_order_id, v_order_number;

  for v_item in
    select value from pg_catalog.jsonb_array_elements(v_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_variant_id := (v_item ->> 'variant_id')::uuid;
    v_qty := (v_item ->> 'quantity')::integer;

    select
      product.title,
      variant.title,
      variant.sku,
      variant.options,
      variant.price,
      variant.stock_quantity,
      variant.track_inventory,
      variant.allow_backorder
    into
      v_title,
      v_variant_title,
      v_sku,
      v_options,
      v_price,
      v_stock,
      v_track,
      v_backorder
    from public.store_product_variants as variant
    join public.store_products as product on product.id = variant.product_id
    where variant.id = v_variant_id
      and variant.product_id = v_product_id;

    insert into public.store_order_items (
      order_id,
      product_id,
      variant_id,
      title,
      variant_title,
      sku,
      unit_price,
      quantity,
      line_total,
      options
    ) values (
      v_order_id,
      v_product_id,
      v_variant_id,
      v_title,
      v_variant_title,
      v_sku,
      v_price,
      v_qty,
      v_price * v_qty,
      coalesce(v_options, '{}'::jsonb)
    );

    if v_track then
      v_stock_decrement := least(greatest(v_stock, 0), v_qty);

      if v_stock_decrement > 0 then
        update public.store_product_variants
        set
          stock_quantity = stock_quantity - v_stock_decrement,
          updated_at = pg_catalog.now()
        where id = v_variant_id;

        insert into public.store_inventory_movements (
          product_id,
          variant_id,
          movement_type,
          quantity_delta,
          reference_type,
          reference_id,
          note
        ) values (
          v_product_id,
          v_variant_id,
          'sale',
          -v_stock_decrement,
          'order',
          v_order_id::text,
          'Reserved by web order #' || v_order_number::text
        );
      end if;
    end if;
  end loop;

  insert into public.store_order_audit_log (
    order_id,
    action,
    from_state,
    to_state,
    actor_kind,
    request_key
  ) values (
    v_order_id,
    'created',
    '{}'::jsonb,
    pg_catalog.jsonb_build_object(
      'status', 'new',
      'payment_status', 'unpaid',
      'delivery_type', v_delivery_type,
      'subtotal', v_subtotal,
      'shipping_total', v_shipping_total,
      'total', v_total,
      'version', 1
    ),
    'system',
    v_idempotency_key
  );

  return pg_catalog.jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'currency', coalesce(v_order_currency, 'USD'),
    'subtotal', v_subtotal,
    'shipping_total', v_shipping_total,
    'delivery_type', v_delivery_type,
    'total', v_total,
    'status', 'new',
    'version', 1,
    'replayed', false
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_store_order_status(p_order_id uuid, p_status text, p_expected_version integer DEFAULT NULL::integer)
 RETURNS store_orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
        coalesce((
          select -pg_catalog.sum(movement.quantity_delta)
          from public.store_inventory_movements as movement
          where movement.reference_type = 'order'
            and movement.reference_id = p_order_id::text
            and movement.variant_id = order_item.variant_id
            and movement.movement_type = 'sale'
            and movement.quantity_delta < 0
        ), 0)::integer as quantity_to_release
      from public.store_order_items as order_item
      where order_item.order_id = p_order_id
      order by order_item.variant_id
    loop
      if v_item.variant_id is not null
        and v_item.quantity_to_release > 0 then
        update public.store_product_variants
        set
          stock_quantity = stock_quantity + v_item.quantity_to_release,
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
          v_item.quantity_to_release,
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
$function$
;

revoke all on function public.create_store_order_internal(jsonb) from public, anon, authenticated;
grant execute on function public.create_store_order_internal(jsonb) to service_role;

revoke all on function public.update_store_order_status(uuid, text, integer) from public, anon;
grant execute on function public.update_store_order_status(uuid, text, integer) to authenticated;
