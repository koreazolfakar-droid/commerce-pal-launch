-- Preserve the legacy RPC while allowing staff to browse the complete history.
create function public.get_store_customer_orders_page(
  p_customer_id uuid,
  p_limit integer,
  p_offset integer
)
returns setof public.store_orders
language sql
security invoker
set search_path = public, pg_temp
as $$
  select o.*
  from public.store_orders o
  join public.store_customers c
    on c.id = p_customer_id
   and regexp_replace(coalesce(o.customer_phone, ''), '[^0-9]+', '', 'g') = c.phone_normalized
  where private.is_dashboard_staff()
  order by o.created_at desc, o.id desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, coalesce(p_offset, 0))
$$;

revoke all on function public.get_store_customer_orders_page(uuid, integer, integer) from public, anon;
grant execute on function public.get_store_customer_orders_page(uuid, integer, integer) to authenticated;
