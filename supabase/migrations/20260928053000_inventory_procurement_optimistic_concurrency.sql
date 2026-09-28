-- Add optimistic concurrency guards to absolute inventory writes and procurement
-- document mutations without changing the existing table schema.
--
-- Inventory delta adjustments remain atomic by design: they apply a delta to the
-- row locked current value. Absolute stock sets must match the stock snapshot the
-- editor actually saw.
--
-- Procurement uses updated_at as an opaque concurrency token. The guarded public
-- RPCs lock the document row, compare the caller's snapshot, and only then invoke
-- the existing private workflow implementation in the same transaction.

create or replace function public.set_store_inventory_stock_v2(
  p_product_id uuid,
  p_variant_id uuid,
  p_stock integer,
  p_expected_stock integer,
  p_note text default null
)
returns table(new_stock integer, movement_id uuid)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_product_id uuid;
  v_current_stock integer;
  v_delta integer;
  v_movement_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;
  if p_stock < 0 then
    raise exception 'stock cannot be negative';
  end if;
  if p_expected_stock < 0 then
    raise exception 'expected stock cannot be negative';
  end if;

  select product_id, stock_quantity
    into v_product_id, v_current_stock
  from public.store_product_variants
  where id = p_variant_id
  for update;

  if v_product_id is null then
    raise exception 'variant not found';
  end if;
  if p_product_id <> v_product_id then
    raise exception 'product and variant mismatch';
  end if;
  if v_current_stock <> p_expected_stock then
    raise exception 'inventory_stock_conflict';
  end if;

  v_delta := p_stock - v_current_stock;

  if v_delta <> 0 then
    update public.store_product_variants
    set stock_quantity = p_stock,
        updated_at = now()
    where id = p_variant_id;

    update public.store_products p
    set stock_quantity = (
          select coalesce(sum(v.stock_quantity), 0)::integer
          from public.store_product_variants v
          where v.product_id = v_product_id
        ),
        updated_at = now()
    where p.id = v_product_id;

    insert into public.store_inventory_movements (
      product_id,
      variant_id,
      movement_type,
      quantity_delta,
      reference_type,
      note,
      created_by
    ) values (
      v_product_id,
      p_variant_id,
      'adjustment',
      v_delta,
      'manual_dashboard',
      nullif(btrim(coalesce(p_note, '')), ''),
      auth.uid()
    )
    returning id into v_movement_id;
  end if;

  return query select p_stock, v_movement_id;
end;
$$;

revoke all on function public.set_store_inventory_stock_v2(uuid,uuid,integer,integer,text)
from public, anon;
grant execute on function public.set_store_inventory_stock_v2(uuid,uuid,integer,integer,text)
to authenticated;


create or replace function private.assert_store_purchase_order_fresh(
  p_purchase_order_id uuid,
  p_expected_updated_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = public, private, pg_temp
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
security invoker
set search_path = public, private, pg_temp
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

revoke all on function private.assert_store_purchase_order_fresh(uuid,timestamptz)
from public, anon;
revoke all on function private.assert_store_receiving_fresh(uuid,timestamptz)
from public, anon;
grant execute on function private.assert_store_purchase_order_fresh(uuid,timestamptz)
to authenticated;
grant execute on function private.assert_store_receiving_fresh(uuid,timestamptz)
to authenticated;


create or replace function public.update_store_purchase_order_draft_v2(
  p_purchase_order_id uuid,
  p_expected_updated_at timestamptz,
  p_supplier_id uuid,
  p_location_id uuid,
  p_po_number text,
  p_currency text,
  p_expected_at timestamptz,
  p_discount_amount numeric,
  p_tax_amount numeric,
  p_shipping_amount numeric,
  p_exchange_rate numeric,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
begin
  perform private.assert_store_purchase_order_fresh(
    p_purchase_order_id,
    p_expected_updated_at
  );
  return private.update_store_purchase_order_draft_internal(
    p_purchase_order_id,
    p_supplier_id,
    p_location_id,
    p_po_number,
    p_currency,
    p_expected_at,
    p_discount_amount,
    p_tax_amount,
    p_shipping_amount,
    p_exchange_rate,
    p_notes,
    p_items
  );
end;
$$;

create or replace function public.delete_store_purchase_order_draft_v2(
  p_purchase_order_id uuid,
  p_expected_updated_at timestamptz
)
returns text language plpgsql security invoker
set search_path = public, private, pg_temp
as $$
begin
  perform private.assert_store_purchase_order_fresh(p_purchase_order_id, p_expected_updated_at);
  return private.delete_store_purchase_order_draft_internal(p_purchase_order_id);
end;
$$;

create or replace function public.submit_store_purchase_order_v2(
  p_purchase_order_id uuid,
  p_expected_updated_at timestamptz
)
returns text language plpgsql security invoker
set search_path = public, private, pg_temp
as $$
begin
  perform private.assert_store_purchase_order_fresh(p_purchase_order_id, p_expected_updated_at);
  return private.submit_store_purchase_order_internal(p_purchase_order_id);
end;
$$;

create or replace function public.approve_store_purchase_order_v2(
  p_purchase_order_id uuid,
  p_expected_updated_at timestamptz
)
returns text language plpgsql security invoker
set search_path = public, private, pg_temp
as $$
begin
  perform private.assert_store_purchase_order_fresh(p_purchase_order_id, p_expected_updated_at);
  return private.approve_store_purchase_order_internal(p_purchase_order_id);
end;
$$;

create or replace function public.issue_store_purchase_order_v2(
  p_purchase_order_id uuid,
  p_expected_updated_at timestamptz
)
returns text language plpgsql security invoker
set search_path = public, private, pg_temp
as $$
begin
  perform private.assert_store_purchase_order_fresh(p_purchase_order_id, p_expected_updated_at);
  return private.issue_store_purchase_order_internal(p_purchase_order_id);
end;
$$;

create or replace function public.close_store_purchase_order_v2(
  p_purchase_order_id uuid,
  p_expected_updated_at timestamptz
)
returns text language plpgsql security invoker
set search_path = public, private, pg_temp
as $$
begin
  perform private.assert_store_purchase_order_fresh(p_purchase_order_id, p_expected_updated_at);
  return private.close_store_purchase_order_internal(p_purchase_order_id);
end;
$$;

create or replace function public.reject_store_purchase_order_v2(
  p_purchase_order_id uuid,
  p_expected_updated_at timestamptz,
  p_reason text
)
returns text language plpgsql security invoker
set search_path = public, private, pg_temp
as $$
begin
  perform private.assert_store_purchase_order_fresh(p_purchase_order_id, p_expected_updated_at);
  return private.reject_store_purchase_order_internal(p_purchase_order_id, p_reason);
end;
$$;

create or replace function public.reopen_store_purchase_order_v2(
  p_purchase_order_id uuid,
  p_expected_updated_at timestamptz
)
returns text language plpgsql security invoker
set search_path = public, private, pg_temp
as $$
begin
  perform private.assert_store_purchase_order_fresh(p_purchase_order_id, p_expected_updated_at);
  return private.reopen_store_purchase_order_internal(p_purchase_order_id);
end;
$$;

create or replace function public.cancel_store_purchase_order_v2(
  p_purchase_order_id uuid,
  p_expected_updated_at timestamptz,
  p_reason text
)
returns text language plpgsql security invoker
set search_path = public, private, pg_temp
as $$
begin
  perform private.assert_store_purchase_order_fresh(p_purchase_order_id, p_expected_updated_at);
  return private.cancel_store_purchase_order_internal(p_purchase_order_id, p_reason);
end;
$$;


create or replace function public.update_store_receiving_draft_v2(
  p_receiving_id uuid,
  p_expected_updated_at timestamptz,
  p_invoice_number text,
  p_receiving_employee_label text,
  p_notes text,
  p_lines jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
begin
  perform private.assert_store_receiving_fresh(p_receiving_id, p_expected_updated_at);
  return private.update_store_receiving_draft_internal(
    p_receiving_id,
    p_invoice_number,
    p_receiving_employee_label,
    p_notes,
    p_lines
  );
end;
$$;

create or replace function public.approve_store_receiving_v2(
  p_receiving_id uuid,
  p_expected_updated_at timestamptz
)
returns table(
  receiving_id uuid,
  purchase_order_id uuid,
  purchase_order_status text,
  stock_units_added integer,
  damaged_units_recorded integer
)
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
begin
  perform private.assert_store_receiving_fresh(p_receiving_id, p_expected_updated_at);
  return query
  select *
  from private.approve_store_receiving_internal(p_receiving_id);
end;
$$;

create or replace function public.void_store_receiving_v2(
  p_receiving_id uuid,
  p_expected_updated_at timestamptz,
  p_reason text
)
returns text language plpgsql security invoker
set search_path = public, private, pg_temp
as $$
begin
  perform private.assert_store_receiving_fresh(p_receiving_id, p_expected_updated_at);
  return private.void_store_receiving_internal(p_receiving_id, p_reason);
end;
$$;


revoke all on function public.update_store_purchase_order_draft_v2(
  uuid,timestamptz,uuid,uuid,text,text,timestamptz,numeric,numeric,numeric,numeric,text,jsonb
) from public, anon;
revoke all on function public.delete_store_purchase_order_draft_v2(uuid,timestamptz)
from public, anon;
revoke all on function public.submit_store_purchase_order_v2(uuid,timestamptz)
from public, anon;
revoke all on function public.approve_store_purchase_order_v2(uuid,timestamptz)
from public, anon;
revoke all on function public.issue_store_purchase_order_v2(uuid,timestamptz)
from public, anon;
revoke all on function public.close_store_purchase_order_v2(uuid,timestamptz)
from public, anon;
revoke all on function public.reject_store_purchase_order_v2(uuid,timestamptz,text)
from public, anon;
revoke all on function public.reopen_store_purchase_order_v2(uuid,timestamptz)
from public, anon;
revoke all on function public.cancel_store_purchase_order_v2(uuid,timestamptz,text)
from public, anon;
revoke all on function public.update_store_receiving_draft_v2(
  uuid,timestamptz,text,text,text,jsonb
) from public, anon;
revoke all on function public.approve_store_receiving_v2(uuid,timestamptz)
from public, anon;
revoke all on function public.void_store_receiving_v2(uuid,timestamptz,text)
from public, anon;

grant execute on function public.update_store_purchase_order_draft_v2(
  uuid,timestamptz,uuid,uuid,text,text,timestamptz,numeric,numeric,numeric,numeric,text,jsonb
) to authenticated;
grant execute on function public.delete_store_purchase_order_draft_v2(uuid,timestamptz)
to authenticated;
grant execute on function public.submit_store_purchase_order_v2(uuid,timestamptz)
to authenticated;
grant execute on function public.approve_store_purchase_order_v2(uuid,timestamptz)
to authenticated;
grant execute on function public.issue_store_purchase_order_v2(uuid,timestamptz)
to authenticated;
grant execute on function public.close_store_purchase_order_v2(uuid,timestamptz)
to authenticated;
grant execute on function public.reject_store_purchase_order_v2(uuid,timestamptz,text)
to authenticated;
grant execute on function public.reopen_store_purchase_order_v2(uuid,timestamptz)
to authenticated;
grant execute on function public.cancel_store_purchase_order_v2(uuid,timestamptz,text)
to authenticated;
grant execute on function public.update_store_receiving_draft_v2(
  uuid,timestamptz,text,text,text,jsonb
) to authenticated;
grant execute on function public.approve_store_receiving_v2(uuid,timestamptz)
to authenticated;
grant execute on function public.void_store_receiving_v2(uuid,timestamptz,text)
to authenticated;

comment on function public.set_store_inventory_stock_v2(uuid,uuid,integer,integer,text) is
  'Absolute inventory set guarded by the caller expected stock snapshot.';
comment on function private.assert_store_purchase_order_fresh(uuid,timestamptz) is
  'Locks a PO and rejects stale dashboard mutations using updated_at as an optimistic concurrency token.';
comment on function private.assert_store_receiving_fresh(uuid,timestamptz) is
  'Locks a receiving record and rejects stale dashboard mutations using updated_at as an optimistic concurrency token.';
