-- Require every newly created storefront order to be linked to an authenticated
-- customer account in the same database transaction.
--
-- The Edge Function validates the Supabase Auth token and passes only the
-- server-verified user id to this service-role-only wrapper. Historical guest
-- orders remain readable through the existing compatibility logic.

create or replace function public.create_store_order_for_customer_internal(
  payload jsonb,
  p_customer_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_result jsonb;
  v_order_id uuid;
  v_existing_customer_user_id uuid;
begin
  if p_customer_user_id is null then
    raise exception 'authentication_required';
  end if;

  -- Reuse the established pricing, inventory, idempotency and audit workflow.
  -- Because this call and the account link happen inside the same PostgreSQL
  -- function invocation, any failure below rolls back the order creation too.
  v_result := public.create_store_order_internal(payload);

  begin
    v_order_id := (v_result ->> 'order_id')::uuid;
  exception when others then
    raise exception 'invalid_order_response';
  end;

  select customer_user_id
  into v_existing_customer_user_id
  from public.store_orders
  where id = v_order_id
  for update;

  if not found then
    raise exception 'order_not_found_after_create';
  end if;

  if v_existing_customer_user_id is not null
    and v_existing_customer_user_id <> p_customer_user_id then
    raise exception 'order_account_conflict';
  end if;

  update public.store_orders
  set customer_user_id = p_customer_user_id
  where id = v_order_id
    and (
      customer_user_id is null
      or customer_user_id = p_customer_user_id
    );

  if not found then
    raise exception 'order_account_link_failed';
  end if;

  return v_result;
end;
$function$;

revoke all on function public.create_store_order_for_customer_internal(jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.create_store_order_for_customer_internal(jsonb, uuid)
  to service_role;

comment on function public.create_store_order_for_customer_internal(jsonb, uuid) is
  'Service-role-only atomic storefront order creation bound to a validated customer user id.';
