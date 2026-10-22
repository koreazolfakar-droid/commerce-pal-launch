-- Direct UPDATE remains restricted to drafts. The lifecycle RPCs must still
-- lock pending/approved/issued rows before checking optimistic concurrency.
-- Only these private, staff/MFA-checked, void-returning lock helpers need the
-- owner's lock privilege. Public RPCs stay invoker, and lifecycle mutations
-- retain their existing staff/admin and state-transition checks.
create or replace function private.assert_store_purchase_order_fresh(
  p_purchase_order_id uuid,
  p_expected_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated_at timestamptz;
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;
  if p_expected_updated_at is null then
    raise exception 'procurement_version_required';
  end if;

  select updated_at
    into v_updated_at
  from public.store_purchase_orders
  where id = p_purchase_order_id
  for update;

  if not found then
    raise exception 'purchase order not found';
  end if;
  if v_updated_at is distinct from p_expected_updated_at then
    raise exception 'procurement_version_conflict';
  end if;
end;
$$;

create or replace function private.assert_store_receiving_fresh(
  p_receiving_id uuid,
  p_expected_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated_at timestamptz;
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;
  if p_expected_updated_at is null then
    raise exception 'procurement_version_required';
  end if;

  select updated_at
    into v_updated_at
  from public.store_receivings
  where id = p_receiving_id
  for update;

  if not found then
    raise exception 'receiving not found';
  end if;
  if v_updated_at is distinct from p_expected_updated_at then
    raise exception 'procurement_version_conflict';
  end if;
end;
$$;


revoke all on function private.assert_store_purchase_order_fresh(uuid, timestamptz) from public, anon;
revoke all on function private.assert_store_receiving_fresh(uuid, timestamptz) from public, anon;
grant execute on function private.assert_store_purchase_order_fresh(uuid, timestamptz) to authenticated;
grant execute on function private.assert_store_receiving_fresh(uuid, timestamptz) to authenticated;
