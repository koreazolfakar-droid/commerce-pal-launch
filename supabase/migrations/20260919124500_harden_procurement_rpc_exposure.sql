-- Harden procurement RPC exposure.
-- Move privileged implementations out of the exposed public schema and restore
-- public SECURITY INVOKER wrappers with the same API signatures.

alter function public.create_store_purchase_order(uuid,text,text,text,jsonb)
  set schema private;
alter function private.create_store_purchase_order(uuid,text,text,text,jsonb)
  rename to create_store_purchase_order_internal;

alter function public.submit_store_purchase_order(uuid)
  set schema private;
alter function private.submit_store_purchase_order(uuid)
  rename to submit_store_purchase_order_internal;

alter function public.create_store_receiving(uuid,text,text,text,jsonb)
  set schema private;
alter function private.create_store_receiving(uuid,text,text,text,jsonb)
  rename to create_store_receiving_internal;

alter function public.approve_store_receiving(uuid)
  set schema private;
alter function private.approve_store_receiving(uuid)
  rename to approve_store_receiving_internal;

revoke all on function private.create_store_purchase_order_internal(uuid,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function private.submit_store_purchase_order_internal(uuid) from public, anon, authenticated;
revoke all on function private.create_store_receiving_internal(uuid,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function private.approve_store_receiving_internal(uuid) from public, anon, authenticated;

grant usage on schema private to authenticated;
grant execute on function private.create_store_purchase_order_internal(uuid,text,text,text,jsonb) to authenticated;
grant execute on function private.submit_store_purchase_order_internal(uuid) to authenticated;
grant execute on function private.create_store_receiving_internal(uuid,text,text,text,jsonb) to authenticated;
grant execute on function private.approve_store_receiving_internal(uuid) to authenticated;

create function public.create_store_purchase_order(
  p_supplier_id uuid,
  p_po_number text,
  p_currency text default 'USD',
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_store_purchase_order_internal(
    p_supplier_id, p_po_number, p_currency, p_notes, p_items
  );
$$;

create function public.submit_store_purchase_order(
  p_purchase_order_id uuid
)
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.submit_store_purchase_order_internal(p_purchase_order_id);
$$;

create function public.create_store_receiving(
  p_purchase_order_id uuid,
  p_invoice_number text,
  p_receiving_employee_label text default null,
  p_notes text default null,
  p_lines jsonb default '[]'::jsonb
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_store_receiving_internal(
    p_purchase_order_id,
    p_invoice_number,
    p_receiving_employee_label,
    p_notes,
    p_lines
  );
$$;

create function public.approve_store_receiving(
  p_receiving_id uuid
)
returns table(
  receiving_id uuid,
  purchase_order_id uuid,
  purchase_order_status text,
  stock_units_added integer,
  damaged_units_recorded integer
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.approve_store_receiving_internal(p_receiving_id);
$$;

revoke all on function public.create_store_purchase_order(uuid,text,text,text,jsonb) from public, anon;
revoke all on function public.submit_store_purchase_order(uuid) from public, anon;
revoke all on function public.create_store_receiving(uuid,text,text,text,jsonb) from public, anon;
revoke all on function public.approve_store_receiving(uuid) from public, anon;

grant execute on function public.create_store_purchase_order(uuid,text,text,text,jsonb) to authenticated;
grant execute on function public.submit_store_purchase_order(uuid) to authenticated;
grant execute on function public.create_store_receiving(uuid,text,text,text,jsonb) to authenticated;
grant execute on function public.approve_store_receiving(uuid) to authenticated;
