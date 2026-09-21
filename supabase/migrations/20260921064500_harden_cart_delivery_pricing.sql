-- Harden cart/order pricing and delivery configuration.
-- 1) Delivery fee is fail-closed and structurally validated.
-- 2) Only dashboard admins may change the global delivery fee.
-- 3) Orders are rejected before insert/stock deduction if product or delivery
--    pricing differs from what the shopper reviewed in the cart.

alter table public.cms_site_settings
  drop constraint if exists cms_site_settings_delivery_fee_valid;

alter table public.cms_site_settings
  add constraint cms_site_settings_delivery_fee_valid
  check (
    key <> 'delivery_fee'
    or case
      when coalesce(value_text, '') ~ '^[0-9]+([.][0-9]{1,2})?$'
        then value_text::numeric >= 0 and value_text::numeric <= 10000
      else false
    end
  );

drop policy if exists dashboard_staff_site_settings_insert on public.cms_site_settings;
drop policy if exists dashboard_staff_site_settings_update on public.cms_site_settings;
drop policy if exists dashboard_admin_delivery_fee_insert on public.cms_site_settings;
drop policy if exists dashboard_admin_delivery_fee_update on public.cms_site_settings;

create policy dashboard_staff_site_settings_insert
on public.cms_site_settings
for insert
to authenticated
with check (
  (select private.is_dashboard_staff())
  and (
    key <> 'delivery_fee'
    or (select private.is_dashboard_admin())
  )
);

create policy dashboard_staff_site_settings_update
on public.cms_site_settings
for update
to authenticated
using (
  (select private.is_dashboard_staff())
  and (
    key <> 'delivery_fee'
    or (select private.is_dashboard_admin())
  )
)
with check (
  (select private.is_dashboard_staff())
  and (
    key <> 'delivery_fee'
    or (select private.is_dashboard_admin())
  )
);

create or replace function private.audit_delivery_fee_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_value text;
  v_new_value text;
begin
  if tg_op = 'INSERT' then
    if new.key <> 'delivery_fee' then
      return new;
    end if;
    v_old_value := null;
    v_new_value := new.value_text;
  elsif tg_op = 'UPDATE' then
    if new.key <> 'delivery_fee' and old.key <> 'delivery_fee' then
      return new;
    end if;
    if new.value_text is not distinct from old.value_text then
      return new;
    end if;
    v_old_value := old.value_text;
    v_new_value := new.value_text;
  else
    if old.key <> 'delivery_fee' then
      return old;
    end if;
    v_old_value := old.value_text;
    v_new_value := null;
  end if;

  insert into public.cms_audit_log (
    actor_email,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    nullif(auth.jwt() ->> 'email', ''),
    case
      when tg_op = 'INSERT' then 'delivery_fee_created'
      when tg_op = 'UPDATE' then 'delivery_fee_updated'
      else 'delivery_fee_deleted'
    end,
    'site_setting',
    'delivery_fee',
    pg_catalog.jsonb_build_object(
      'old_value', v_old_value,
      'new_value', v_new_value,
      'source', 'database_trigger'
    )
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.audit_delivery_fee_change() from public, anon, authenticated;

drop trigger if exists audit_delivery_fee_change on public.cms_site_settings;
create trigger audit_delivery_fee_change
after insert or update or delete on public.cms_site_settings
for each row execute function private.audit_delivery_fee_change();

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
      variant.track_inventory,
      variant.allow_backorder
    into
      v_title,
      v_variant_title,
      v_sku,
      v_options,
      v_price,
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
      update public.store_product_variants
      set
        stock_quantity = greatest(0, stock_quantity - v_qty),
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
        -v_qty,
        'order',
        v_order_id::text,
        'Reserved by web order #' || v_order_number::text
      );
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

revoke all on function public.create_store_order_internal(jsonb)
  from public, anon, authenticated;
grant execute on function public.create_store_order_internal(jsonb)
  to service_role;

comment on function public.create_store_order_internal(jsonb) is
  'Trusted server-only idempotent order creator. Revalidates catalog pricing, locks inventory deterministically, verifies shopper-visible pricing, computes delivery/total server-side, and writes order/items/inventory/audit atomically.';
