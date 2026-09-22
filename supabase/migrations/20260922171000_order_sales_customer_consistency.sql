-- Align order completion, sales payment state, and customer aggregates.
-- This migration intentionally leaves historical migrations untouched and makes
-- the current invariants explicit in one canonical patch.

create or replace function private.rebuild_customer_from_phone(input_phone text)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  normalized text := private.normalize_customer_phone(input_phone);
  latest_order public.store_orders%rowtype;
  order_count integer := 0;
  spent numeric(12,2) := 0;
  last_valid_order_at timestamptz;
begin
  if normalized = '' then
    return;
  end if;

  -- Prefer the latest non-cancelled order for contact/profile fields, but keep
  -- cancelled-only customers discoverable instead of silently losing history.
  select *
    into latest_order
  from public.store_orders
  where private.normalize_customer_phone(customer_phone) = normalized
  order by (status <> 'cancelled') desc, created_at desc
  limit 1;

  if latest_order.id is null then
    delete from public.store_customers
    where phone_normalized = normalized
      and is_profile_managed = false
      and coalesce(internal_notes, '') = ''
      and cardinality(tags) = 0
      and is_vip = false
      and is_blocked = false;
    return;
  end if;

  select
    count(*) filter (where status <> 'cancelled')::integer,
    coalesce(
      sum(
        case
          when status = 'done' and payment_status <> 'refunded' then total
          else 0
        end
      ),
      0
    ),
    max(created_at) filter (where status <> 'cancelled')
  into order_count, spent, last_valid_order_at
  from public.store_orders
  where private.normalize_customer_phone(customer_phone) = normalized;

  insert into public.store_customers (
    phone,
    phone_normalized,
    name,
    email,
    city,
    default_address,
    total_orders,
    total_spent,
    last_order_at
  ) values (
    latest_order.customer_phone,
    normalized,
    latest_order.customer_name,
    latest_order.customer_email,
    latest_order.city,
    latest_order.delivery_address,
    order_count,
    spent,
    last_valid_order_at
  )
  on conflict (phone_normalized) do update set
    phone = case
      when public.store_customers.is_profile_managed then public.store_customers.phone
      else excluded.phone
    end,
    name = case
      when public.store_customers.is_profile_managed then public.store_customers.name
      else excluded.name
    end,
    email = case
      when public.store_customers.is_profile_managed then public.store_customers.email
      else coalesce(excluded.email, public.store_customers.email)
    end,
    city = case
      when public.store_customers.is_profile_managed then public.store_customers.city
      else coalesce(excluded.city, public.store_customers.city)
    end,
    default_address = case
      when public.store_customers.is_profile_managed then public.store_customers.default_address
      else coalesce(excluded.default_address, public.store_customers.default_address)
    end,
    total_orders = excluded.total_orders,
    total_spent = excluded.total_spent,
    last_order_at = excluded.last_order_at,
    updated_at = now();
end;
$$;

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

  -- DONE is the point where the immutable sale snapshot is created. An unpaid
  -- order must not become a completed sale.
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

create or replace function public.update_store_order_payment_status(
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

  -- Keep the sale's payment state aligned with the order after post-completion
  -- refunds. Financial amount snapshots remain immutable.
  update public.store_sales
  set payment_status = v_after.payment_status
  where order_id = p_order_id
    and payment_status is distinct from v_after.payment_status;

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

-- Repair already-created sale rows that drifted from their source order.
update public.store_sales as sale
set payment_status = orders.payment_status
from public.store_orders as orders
where sale.order_id = orders.id
  and sale.payment_status is distinct from orders.payment_status;

-- Recompute existing CRM aggregates immediately instead of waiting for the next
-- order mutation to fire store_orders_sync_customer.
do $$
declare
  customer_row record;
begin
  for customer_row in
    select phone
    from public.store_customers
  loop
    perform private.rebuild_customer_from_phone(customer_row.phone);
  end loop;
end;
$$;
