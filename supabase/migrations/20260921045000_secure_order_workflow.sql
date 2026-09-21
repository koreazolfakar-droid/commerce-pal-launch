-- Secure order workflow v2: idempotency, server-owned totals, delivery fees,
-- optimistic concurrency, audit trail, and DONE -> Sales.
--
-- This migration intentionally keeps storefront writes behind the create-order
-- Edge Function. Dashboard mutations are restricted to vetted RPCs.

insert into public.cms_site_settings (
  key,
  value_text,
  value_json,
  value_type,
  label,
  group_name,
  is_public,
  updated_at
)
values (
  'delivery_fee',
  '0',
  null,
  'number',
  'Default delivery fee',
  'commerce',
  true,
  now()
)
on conflict (key) do nothing;

alter table public.store_orders
  add column if not exists idempotency_key text,
  add column if not exists idempotency_fingerprint text,
  add column if not exists version integer not null default 1,
  add column if not exists delivery_type text not null default 'pending',
  add column if not exists delivery_location jsonb,
  add column if not exists completed_at timestamptz;

alter table public.store_orders
  drop constraint if exists store_orders_status_check;

update public.store_orders
set status = case
  when status = 'pending' then 'new'
  when status = 'shipped' then 'out_for_delivery'
  else status
end
where status in ('pending', 'shipped');

alter table public.store_orders
  add constraint store_orders_status_check
  check (status in (
    'new',
    'confirmed',
    'processing',
    'out_for_delivery',
    'delivered',
    'done',
    'cancelled'
  ));

alter table public.store_orders
  drop constraint if exists store_orders_delivery_type_check;

alter table public.store_orders
  add constraint store_orders_delivery_type_check
  check (delivery_type in ('pending', 'paid', 'free'));

alter table public.store_orders
  drop constraint if exists store_orders_version_check;

alter table public.store_orders
  add constraint store_orders_version_check
  check (version > 0);

create unique index if not exists store_orders_idempotency_key_uidx
  on public.store_orders(idempotency_key)
  where idempotency_key is not null;

create index if not exists store_orders_status_created_idx
  on public.store_orders(status, created_at desc);

create table if not exists public.store_order_audit_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  action text not null,
  from_state jsonb not null default '{}'::jsonb,
  to_state jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_kind text not null default 'system'
    check (actor_kind in ('system', 'staff')),
  request_key text,
  created_at timestamptz not null default now()
);

create index if not exists store_order_audit_order_created_idx
  on public.store_order_audit_log(order_id, created_at desc);

alter table public.store_order_audit_log enable row level security;
revoke all on public.store_order_audit_log from public, anon, authenticated;
grant select on public.store_order_audit_log to authenticated;
grant all on public.store_order_audit_log to service_role;

drop policy if exists store_order_audit_staff_select on public.store_order_audit_log;
create policy store_order_audit_staff_select
on public.store_order_audit_log
for select
to authenticated
using ((select private.is_dashboard_staff()));

create table if not exists public.store_sales (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.store_orders(id) on delete restrict,
  order_number bigint not null,
  customer_name text not null,
  customer_phone text not null,
  payment_method text not null,
  payment_status text not null,
  currency text not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  shipping_total numeric(12,2) not null check (shipping_total >= 0),
  discount_total numeric(12,2) not null check (discount_total >= 0),
  total numeric(12,2) not null check (total >= 0),
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists store_sales_completed_idx
  on public.store_sales(completed_at desc);

alter table public.store_sales enable row level security;
revoke all on public.store_sales from public, anon, authenticated;
grant select on public.store_sales to authenticated;
grant all on public.store_sales to service_role;

drop policy if exists store_sales_staff_select on public.store_sales;
create policy store_sales_staff_select
on public.store_sales
for select
to authenticated
using ((select private.is_dashboard_staff()));

-- Storefront and dashboard clients may read orders through existing staff RLS,
-- but they may no longer mutate order rows directly and bypass business rules.
revoke insert, update, delete on public.store_orders from authenticated;
revoke insert, update, delete on public.store_order_items from authenticated;

drop policy if exists store_orders_staff_insert on public.store_orders;
drop policy if exists store_orders_staff_update on public.store_orders;
drop policy if exists dashboard_admin_delete_store_orders on public.store_orders;
drop policy if exists store_order_items_staff_insert on public.store_order_items;
drop policy if exists store_order_items_staff_update on public.store_order_items;
drop policy if exists dashboard_admin_delete_store_order_items on public.store_order_items;

create or replace function public.create_store_order_internal(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
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
  if pg_catalog.length(v_phone) < 6 then
    raise exception 'customer_phone_required';
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

  select
    case
      when coalesce(setting.value_text, '') ~ '^[0-9]+([.][0-9]{1,2})?$'
        then setting.value_text::numeric(12,2)
      else 0::numeric(12,2)
    end
  into v_shipping_total
  from public.cms_site_settings as setting
  where setting.key = 'delivery_fee'
  limit 1;

  v_shipping_total := coalesce(v_shipping_total, 0);
  if v_shipping_total < 0 or v_shipping_total > 10000 then
    raise exception 'invalid_delivery_fee_config';
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
$$;

revoke all on function public.create_store_order_internal(jsonb)
  from public, anon, authenticated;
grant execute on function public.create_store_order_internal(jsonb)
  to service_role;

comment on function public.create_store_order_internal(jsonb) is
  'Trusted server-only idempotent order creator. Revalidates catalog pricing, locks inventory deterministically, computes delivery/total server-side, and writes order/items/inventory/audit atomically.';

drop function if exists public.update_store_order_status(uuid, text);

create function public.update_store_order_status(
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
    or (v_before.status = 'processing' and p_status in ('out_for_delivery', 'cancelled'))
    or (v_before.status = 'out_for_delivery' and p_status in ('delivered', 'cancelled'))
    or (v_before.status = 'delivered' and p_status = 'done')
  ) then
    raise exception 'invalid order status transition';
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

drop function if exists public.update_store_order_payment_status(uuid, text);

create function public.update_store_order_payment_status(
  p_order_id uuid,
  p_payment_status text,
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

  if p_payment_status not in (
    'unpaid',
    'paid',
    'partially_refunded',
    'refunded'
  ) then
    raise exception 'invalid payment status';
  end if;

  if p_payment_status = v_before.payment_status then
    return v_before;
  end if;

  if not (
    (v_before.payment_status = 'unpaid' and p_payment_status = 'paid')
    or (v_before.payment_status = 'paid' and p_payment_status in ('partially_refunded', 'refunded'))
    or (v_before.payment_status = 'partially_refunded' and p_payment_status = 'refunded')
  ) then
    raise exception 'invalid payment status transition';
  end if;

  update public.store_orders
  set
    payment_status = p_payment_status,
    version = version + 1
  where id = p_order_id
  returning * into v_after;

  insert into public.store_order_audit_log (
    order_id,
    action,
    from_state,
    to_state,
    actor_user_id,
    actor_kind
  ) values (
    p_order_id,
    'payment_status_changed',
    pg_catalog.jsonb_build_object(
      'payment_status', v_before.payment_status,
      'version', v_before.version
    ),
    pg_catalog.jsonb_build_object(
      'payment_status', v_after.payment_status,
      'version', v_after.version
    ),
    auth.uid(),
    'staff'
  );

  return v_after;
end;
$$;

revoke all on function public.update_store_order_payment_status(uuid, text, integer)
  from public, anon;
grant execute on function public.update_store_order_payment_status(uuid, text, integer)
  to authenticated;

create or replace function public.update_store_order_delivery(
  p_order_id uuid,
  p_delivery_type text,
  p_shipping_total numeric,
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
  v_fee numeric(12,2);
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

  if v_before.status in ('delivered', 'done', 'cancelled') then
    raise exception 'delivery fee is locked for final orders';
  end if;

  if v_before.payment_status <> 'unpaid' then
    raise exception 'delivery fee is locked after payment';
  end if;

  if p_delivery_type not in ('paid', 'free') then
    raise exception 'invalid delivery type';
  end if;

  v_fee := case
    when p_delivery_type = 'free' then 0
    else pg_catalog.round(coalesce(p_shipping_total, 0)::numeric, 2)
  end;

  if v_fee < 0 or v_fee > 10000 then
    raise exception 'invalid delivery fee';
  end if;

  update public.store_orders
  set
    delivery_type = p_delivery_type,
    shipping_total = v_fee,
    total = greatest(0, subtotal + v_fee - discount_total),
    version = version + 1
  where id = p_order_id
  returning * into v_after;

  insert into public.store_order_audit_log (
    order_id,
    action,
    from_state,
    to_state,
    actor_user_id,
    actor_kind
  ) values (
    p_order_id,
    'delivery_changed',
    pg_catalog.jsonb_build_object(
      'delivery_type', v_before.delivery_type,
      'shipping_total', v_before.shipping_total,
      'total', v_before.total,
      'version', v_before.version
    ),
    pg_catalog.jsonb_build_object(
      'delivery_type', v_after.delivery_type,
      'shipping_total', v_after.shipping_total,
      'total', v_after.total,
      'version', v_after.version
    ),
    auth.uid(),
    'staff'
  );

  return v_after;
end;
$$;

revoke all on function public.update_store_order_delivery(uuid, text, numeric, integer)
  from public, anon;
grant execute on function public.update_store_order_delivery(uuid, text, numeric, integer)
  to authenticated;
