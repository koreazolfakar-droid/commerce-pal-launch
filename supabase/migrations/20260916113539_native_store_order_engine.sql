alter table public.store_orders
  add column if not exists payment_method text not null default 'cash' check (payment_method in ('cash','whish')),
  add column if not exists customer_reference text;

create or replace function public.create_store_order_internal(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
  v_payment text;
  v_name text;
  v_phone text;
  v_email text;
  v_address text;
  v_city text;
  v_notes text;
  v_reference text;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'invalid_payload';
  end if;

  v_items := payload -> 'items';
  v_customer := coalesce(payload -> 'customer', '{}'::jsonb);

  if v_items is null or jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) < 1 or jsonb_array_length(v_items) > 50 then
    raise exception 'invalid_items';
  end if;

  v_name := left(btrim(coalesce(v_customer ->> 'name', '')), 120);
  v_phone := left(regexp_replace(coalesce(v_customer ->> 'phone', ''), '[^0-9+]', '', 'g'), 32);
  v_email := nullif(left(btrim(coalesce(v_customer ->> 'email', '')), 200), '');
  v_address := nullif(left(btrim(coalesce(v_customer ->> 'address', '')), 500), '');
  v_city := nullif(left(btrim(coalesce(v_customer ->> 'city', '')), 120), '');
  v_notes := nullif(left(btrim(coalesce(payload ->> 'notes', '')), 1000), '');
  v_reference := nullif(left(btrim(coalesce(payload ->> 'reference', '')), 120), '');
  v_payment := coalesce(nullif(payload ->> 'payment_method', ''), 'cash');

  if length(v_name) < 2 then raise exception 'customer_name_required'; end if;
  if length(v_phone) < 6 then raise exception 'customer_phone_required'; end if;
  if v_payment not in ('cash','whish') then raise exception 'invalid_payment_method'; end if;

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    begin
      v_product_id := (v_item ->> 'product_id')::uuid;
      v_variant_id := (v_item ->> 'variant_id')::uuid;
      v_qty := (v_item ->> 'quantity')::integer;
    exception when others then
      raise exception 'invalid_item_identifier';
    end;

    if v_qty < 1 or v_qty > 99 then raise exception 'invalid_quantity'; end if;

    select
      p.title,
      v.title,
      v.sku,
      v.options,
      v.price,
      p.currency,
      v.stock_quantity,
      v.track_inventory,
      v.allow_backorder
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
    from public.store_product_variants v
    join public.store_products p on p.id = v.product_id
    where v.id = v_variant_id
      and v.product_id = v_product_id
      and v.is_active = true
      and p.status = 'active'
      and (p.published_at is null or p.published_at <= now())
    for update of v;

    if not found then raise exception 'product_or_variant_unavailable'; end if;
    if v_track and not v_backorder and v_stock < v_qty then raise exception 'insufficient_stock'; end if;

    if v_order_currency is null then
      v_order_currency := v_currency;
    elsif v_order_currency <> v_currency then
      raise exception 'mixed_currency_order';
    end if;

    v_subtotal := v_subtotal + (v_price * v_qty);
  end loop;

  insert into public.store_orders (
    status, payment_status, payment_method, customer_name, customer_phone, customer_email,
    delivery_address, city, notes, customer_reference, currency,
    subtotal, shipping_total, discount_total, total, source
  ) values (
    'pending', 'unpaid', v_payment, v_name, v_phone, v_email,
    v_address, v_city, v_notes, v_reference, coalesce(v_order_currency, 'USD'),
    v_subtotal, 0, 0, v_subtotal, 'web'
  )
  returning id, order_number into v_order_id, v_order_number;

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_variant_id := (v_item ->> 'variant_id')::uuid;
    v_qty := (v_item ->> 'quantity')::integer;

    select
      p.title,
      v.title,
      v.sku,
      v.options,
      v.price,
      v.stock_quantity,
      v.track_inventory,
      v.allow_backorder
    into
      v_title,
      v_variant_title,
      v_sku,
      v_options,
      v_price,
      v_stock,
      v_track,
      v_backorder
    from public.store_product_variants v
    join public.store_products p on p.id = v.product_id
    where v.id = v_variant_id and v.product_id = v_product_id
    for update of v;

    insert into public.store_order_items (
      order_id, product_id, variant_id, title, variant_title, sku,
      unit_price, quantity, line_total, options
    ) values (
      v_order_id, v_product_id, v_variant_id, v_title, v_variant_title, v_sku,
      v_price, v_qty, v_price * v_qty, coalesce(v_options, '{}'::jsonb)
    );

    if v_track then
      update public.store_product_variants
      set stock_quantity = greatest(0, stock_quantity - v_qty), updated_at = now()
      where id = v_variant_id;

      insert into public.store_inventory_movements (
        product_id, variant_id, movement_type, quantity_delta, reference_type, reference_id, note
      ) values (
        v_product_id, v_variant_id, 'sale', -v_qty, 'order', v_order_id::text,
        'Reserved by web order #' || v_order_number::text
      );
    end if;
  end loop;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'currency', coalesce(v_order_currency, 'USD'),
    'subtotal', v_subtotal,
    'total', v_subtotal,
    'status', 'pending'
  );
end;
$$;

revoke all on function public.create_store_order_internal(jsonb) from public, anon, authenticated;
grant execute on function public.create_store_order_internal(jsonb) to service_role;

comment on function public.create_store_order_internal(jsonb) is
  'Trusted server-only order creator. Revalidates catalog pricing and stock and writes order/inventory atomically.';
