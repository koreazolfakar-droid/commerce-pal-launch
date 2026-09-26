-- Security hardening follow-up:
-- 1) remove the retired CI debug table
-- 2) move privileged SECURITY DEFINER implementations out of the exposed public schema
-- 3) preserve the existing public RPC contract through SECURITY INVOKER wrappers

drop table if exists public.ci_debug_logs;

grant usage on schema private to authenticated, service_role;

alter function public.dashboard_inventory_page(text, uuid, boolean, boolean, integer, integer, integer)
  set schema private;
alter function private.dashboard_inventory_page(text, uuid, boolean, boolean, integer, integer, integer)
  rename to dashboard_inventory_page_impl;
alter function private.dashboard_inventory_page_impl(text, uuid, boolean, boolean, integer, integer, integer)
  set search_path to '';

revoke all on function private.dashboard_inventory_page_impl(text, uuid, boolean, boolean, integer, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function private.dashboard_inventory_page_impl(text, uuid, boolean, boolean, integer, integer, integer)
  to authenticated, service_role;

create function public.dashboard_inventory_page(
  p_search text default null,
  p_category_id uuid default null,
  p_uncategorized boolean default false,
  p_only_low boolean default false,
  p_threshold integer default 10,
  p_page integer default 1,
  p_page_size integer default 20
)
returns table(
  product_id uuid,
  variant_id uuid,
  product_name text,
  variant_title text,
  brand text,
  category_id uuid,
  category text,
  sku text,
  barcode text,
  image text,
  stock integer,
  product_stock integer,
  track_inventory boolean,
  variant_active boolean,
  product_status text,
  options jsonb,
  total_count bigint
)
language sql
security invoker
set search_path to ''
as $$
  select *
  from private.dashboard_inventory_page_impl(
    p_search,
    p_category_id,
    p_uncategorized,
    p_only_low,
    p_threshold,
    p_page,
    p_page_size
  );
$$;

revoke all on function public.dashboard_inventory_page(text, uuid, boolean, boolean, integer, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.dashboard_inventory_page(text, uuid, boolean, boolean, integer, integer, integer)
  to authenticated, service_role;

alter function public.dashboard_inventory_summary(integer)
  set schema private;
alter function private.dashboard_inventory_summary(integer)
  rename to dashboard_inventory_summary_impl;
alter function private.dashboard_inventory_summary_impl(integer)
  set search_path to '';

revoke all on function private.dashboard_inventory_summary_impl(integer)
  from public, anon, authenticated, service_role;
grant execute on function private.dashboard_inventory_summary_impl(integer)
  to authenticated, service_role;

create function public.dashboard_inventory_summary(
  p_threshold integer default 10
)
returns table(
  total_units bigint,
  variant_count bigint,
  low_count bigint,
  out_count bigint
)
language sql
security invoker
set search_path to ''
as $$
  select *
  from private.dashboard_inventory_summary_impl(p_threshold);
$$;

revoke all on function public.dashboard_inventory_summary(integer)
  from public, anon, authenticated, service_role;
grant execute on function public.dashboard_inventory_summary(integer)
  to authenticated, service_role;

alter function public.update_store_order_delivery(uuid, text, numeric, integer)
  set schema private;
alter function private.update_store_order_delivery(uuid, text, numeric, integer)
  rename to update_store_order_delivery_impl;

revoke all on function private.update_store_order_delivery_impl(uuid, text, numeric, integer)
  from public, anon, authenticated, service_role;
grant execute on function private.update_store_order_delivery_impl(uuid, text, numeric, integer)
  to authenticated, service_role;

create function public.update_store_order_delivery(
  p_order_id uuid,
  p_delivery_type text,
  p_shipping_total numeric,
  p_expected_version integer default null
)
returns public.store_orders
language sql
security invoker
set search_path to ''
as $$
  select private.update_store_order_delivery_impl(
    p_order_id,
    p_delivery_type,
    p_shipping_total,
    p_expected_version
  );
$$;

revoke all on function public.update_store_order_delivery(uuid, text, numeric, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.update_store_order_delivery(uuid, text, numeric, integer)
  to authenticated, service_role;

alter function public.update_store_order_payment_status(uuid, text, integer)
  set schema private;
alter function private.update_store_order_payment_status(uuid, text, integer)
  rename to update_store_order_payment_status_impl;

revoke all on function private.update_store_order_payment_status_impl(uuid, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function private.update_store_order_payment_status_impl(uuid, text, integer)
  to authenticated, service_role;

create function public.update_store_order_payment_status(
  p_order_id uuid,
  p_payment_status text,
  p_expected_version integer default null
)
returns public.store_orders
language sql
security invoker
set search_path to ''
as $$
  select private.update_store_order_payment_status_impl(
    p_order_id,
    p_payment_status,
    p_expected_version
  );
$$;

revoke all on function public.update_store_order_payment_status(uuid, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.update_store_order_payment_status(uuid, text, integer)
  to authenticated, service_role;

alter function public.update_store_order_status(uuid, text, integer)
  set schema private;
alter function private.update_store_order_status(uuid, text, integer)
  rename to update_store_order_status_impl;

revoke all on function private.update_store_order_status_impl(uuid, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function private.update_store_order_status_impl(uuid, text, integer)
  to authenticated, service_role;

create function public.update_store_order_status(
  p_order_id uuid,
  p_status text,
  p_expected_version integer default null
)
returns public.store_orders
language sql
security invoker
set search_path to ''
as $$
  select private.update_store_order_status_impl(
    p_order_id,
    p_status,
    p_expected_version
  );
$$;

revoke all on function public.update_store_order_status(uuid, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.update_store_order_status(uuid, text, integer)
  to authenticated, service_role;
