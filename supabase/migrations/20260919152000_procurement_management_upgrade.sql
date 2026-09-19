-- Space Call procurement management upgrade.
-- Adds operational PO management without changing approved stock mutation semantics.

-- ---------------------------------------------------------------------------
-- Purchase-order lifecycle, location and commercial terms
-- ---------------------------------------------------------------------------

alter table public.store_purchase_orders
  drop constraint if exists store_purchase_orders_status_check;

alter table public.store_purchase_orders
  add constraint store_purchase_orders_status_check
  check (
    status in (
      'draft',
      'pending_approval',
      'approved',
      'rejected',
      'ordered',
      'partially_received',
      'received',
      'closed',
      'cancelled'
    )
  );

create table if not exists public.store_procurement_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  code text not null check (btrim(code) <> ''),
  address text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists store_procurement_locations_code_unique
  on public.store_procurement_locations(lower(btrim(code)));
create index if not exists store_procurement_locations_active_name_idx
  on public.store_procurement_locations(is_active, name);

insert into public.store_procurement_locations (name, code, is_active)
values ('Main Store', 'MAIN', true)
on conflict do nothing;

alter table public.store_purchase_orders
  add column if not exists location_id uuid references public.store_procurement_locations(id) on delete restrict,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_by uuid references auth.users(id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  add column if not exists tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  add column if not exists shipping_amount numeric(12,2) not null default 0 check (shipping_amount >= 0),
  add column if not exists exchange_rate numeric(14,6) not null default 1 check (exchange_rate > 0);

update public.store_purchase_orders po
set location_id = (
  select l.id
  from public.store_procurement_locations l
  where lower(l.code) = 'main'
  order by l.created_at
  limit 1
)
where po.location_id is null;

create index if not exists store_purchase_orders_location_status_idx
  on public.store_purchase_orders(location_id, status, created_at desc);

-- ---------------------------------------------------------------------------
-- Supplier/invoice matching
-- ---------------------------------------------------------------------------

alter table public.store_receivings
  add column if not exists supplier_id uuid references public.store_suppliers(id) on delete restrict;

update public.store_receivings r
set supplier_id = po.supplier_id
from public.store_purchase_orders po
where po.id = r.purchase_order_id
  and r.supplier_id is null;

alter table public.store_receivings
  alter column supplier_id set not null;

create unique index if not exists store_receivings_supplier_invoice_unique
  on public.store_receivings(supplier_id, lower(btrim(invoice_number)))
  where status <> 'voided';

create or replace function private.store_receiving_fill_supplier()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select po.supplier_id
    into new.supplier_id
  from public.store_purchase_orders po
  where po.id = new.purchase_order_id;

  if new.supplier_id is null then
    raise exception 'purchase order supplier not found';
  end if;

  return new;
end;
$$;

drop trigger if exists store_receivings_fill_supplier on public.store_receivings;
create trigger store_receivings_fill_supplier
before insert or update of purchase_order_id on public.store_receivings
for each row execute function private.store_receiving_fill_supplier();

-- Overage is operationally sensitive: staff may prepare it, but only an admin can approve it.
create or replace function private.guard_receiving_overage_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved'
     and old.status = 'draft'
     and exists (
       select 1
       from public.store_receiving_items ri
       where ri.receiving_id = new.id
         and ri.delivered_quantity > ri.remaining_quantity_before
     )
     and not private.is_dashboard_admin()
  then
    raise exception 'admin approval is required for excess delivery';
  end if;

  return new;
end;
$$;

drop trigger if exists store_receivings_guard_overage_approval on public.store_receivings;
create trigger store_receivings_guard_overage_approval
before update of status on public.store_receivings
for each row execute function private.guard_receiving_overage_approval();

-- ---------------------------------------------------------------------------
-- Weighted average inventory cost
-- ---------------------------------------------------------------------------

alter table public.store_products
  add column if not exists average_cost numeric(12,2) not null default 0 check (average_cost >= 0);

alter table public.store_product_variants
  add column if not exists average_cost numeric(12,2) not null default 0 check (average_cost >= 0);

create or replace function private.update_average_cost_after_receiving_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_line record;
  v_current_stock integer;
  v_old_stock integer;
  v_old_average numeric(12,2);
  v_new_average numeric(12,2);
begin
  if new.status <> 'approved' or old.status is not distinct from new.status then
    return new;
  end if;

  for v_line in
    select
      ri.received_quantity,
      ri.unit_cost,
      po.exchange_rate,
      poi.product_id,
      poi.variant_id
    from public.store_receiving_items ri
    join public.store_purchase_order_items poi on poi.id = ri.purchase_order_item_id
    join public.store_purchase_orders po on po.id = new.purchase_order_id
    where ri.receiving_id = new.id
      and ri.received_quantity > 0
  loop
    if v_line.variant_id is not null then
      select stock_quantity, average_cost
        into v_current_stock, v_old_average
      from public.store_product_variants
      where id = v_line.variant_id
      for update;

      v_old_stock := greatest(0, v_current_stock - v_line.received_quantity);
      if v_current_stock > 0 then
        v_new_average := round(
          ((v_old_stock::numeric * v_old_average) + (v_line.received_quantity::numeric * v_line.unit_cost * coalesce(v_line.exchange_rate, 1)))
          / v_current_stock::numeric,
          2
        );
        update public.store_product_variants
        set average_cost = greatest(0, v_new_average),
            updated_at = now()
        where id = v_line.variant_id;
      end if;

      update public.store_products p
      set average_cost = coalesce((
            select round(
              sum(v.stock_quantity::numeric * v.average_cost) / nullif(sum(v.stock_quantity), 0)::numeric,
              2
            )
            from public.store_product_variants v
            where v.product_id = v_line.product_id
              and v.is_active
          ), 0),
          updated_at = now()
      where p.id = v_line.product_id;
    else
      select stock_quantity, average_cost
        into v_current_stock, v_old_average
      from public.store_products
      where id = v_line.product_id
      for update;

      v_old_stock := greatest(0, v_current_stock - v_line.received_quantity);
      if v_current_stock > 0 then
        v_new_average := round(
          ((v_old_stock::numeric * v_old_average) + (v_line.received_quantity::numeric * v_line.unit_cost * coalesce(v_line.exchange_rate, 1)))
          / v_current_stock::numeric,
          2
        );
        update public.store_products
        set average_cost = greatest(0, v_new_average),
            updated_at = now()
        where id = v_line.product_id;
      end if;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists store_receivings_update_average_cost on public.store_receivings;
create trigger store_receivings_update_average_cost
after update of status on public.store_receivings
for each row execute function private.update_average_cost_after_receiving_approval();

create or replace function private.replace_store_receiving_serials_internal(
  p_receiving_item_id uuid,
  p_serials jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_receiving_id uuid;
  v_status text;
  v_serial jsonb;
  v_serial_number text;
  v_imei1 text;
  v_imei2 text;
  v_condition text;
  v_count integer := 0;
begin
  if v_actor is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;
  if jsonb_typeof(p_serials) <> 'array' then
    raise exception 'serial payload must be an array';
  end if;

  select ri.receiving_id, r.status
    into v_receiving_id, v_status
  from public.store_receiving_items ri
  join public.store_receivings r on r.id = ri.receiving_id
  where ri.id = p_receiving_item_id
  for update of ri, r;

  if v_receiving_id is null then raise exception 'receiving line not found'; end if;
  if v_status <> 'draft' then raise exception 'serials can only be edited on draft receiving'; end if;

  delete from public.store_receiving_serials
  where receiving_item_id = p_receiving_item_id;

  for v_serial in select value from jsonb_array_elements(p_serials)
  loop
    v_serial_number := nullif(btrim(coalesce(v_serial->>'serial_number', '')), '');
    v_imei1 := nullif(btrim(coalesce(v_serial->>'imei1', '')), '');
    v_imei2 := nullif(btrim(coalesce(v_serial->>'imei2', '')), '');
    v_condition := coalesce(nullif(btrim(coalesce(v_serial->>'condition', '')), ''), 'usable');

    if v_serial_number is null and v_imei1 is null and v_imei2 is null then
      continue;
    end if;
    if v_condition not in ('usable', 'damaged') then
      raise exception 'invalid serial condition';
    end if;

    insert into public.store_receiving_serials (
      receiving_item_id, serial_number, imei1, imei2, condition, inventory_status, created_by
    ) values (
      p_receiving_item_id,
      v_serial_number,
      v_imei1,
      v_imei2,
      v_condition,
      'pending',
      v_actor
    );
    v_count := v_count + 1;
  end loop;

  insert into public.store_procurement_events (
    purchase_order_id, receiving_id, event_type, details, actor_id
  )
  select
    r.purchase_order_id,
    r.id,
    'receiving_serials_updated',
    jsonb_build_object('receiving_item_id', p_receiving_item_id, 'count', v_count),
    v_actor
  from public.store_receivings r
  where r.id = v_receiving_id;

  return v_count;
end;
$$;

revoke all on function private.replace_store_receiving_serials_internal(uuid,jsonb)
from public, anon, authenticated;
grant execute on function private.replace_store_receiving_serials_internal(uuid,jsonb)
to authenticated;

create or replace function public.replace_store_receiving_serials(
  p_receiving_item_id uuid,
  p_serials jsonb
)
returns integer
language sql
security invoker
set search_path = ''
as $$
  select private.replace_store_receiving_serials_internal(p_receiving_item_id, p_serials);
$$;

revoke all on function public.replace_store_receiving_serials(uuid,jsonb) from public, anon;
grant execute on function public.replace_store_receiving_serials(uuid,jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Attachments and device serial / IMEI capture
-- ---------------------------------------------------------------------------

create table if not exists public.store_procurement_attachments (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid references public.store_purchase_orders(id) on delete cascade,
  receiving_id uuid references public.store_receivings(id) on delete cascade,
  file_name text not null check (btrim(file_name) <> ''),
  storage_path text not null check (btrim(storage_path) <> ''),
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  attachment_type text not null default 'other'
    check (attachment_type in ('purchase_order', 'supplier_invoice', 'packing_list', 'other')),
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (purchase_order_id is not null or receiving_id is not null)
);

create index if not exists store_procurement_attachments_po_idx
  on public.store_procurement_attachments(purchase_order_id, created_at desc);
create index if not exists store_procurement_attachments_receiving_idx
  on public.store_procurement_attachments(receiving_id, created_at desc);

create table if not exists public.store_receiving_serials (
  id uuid primary key default gen_random_uuid(),
  receiving_item_id uuid not null references public.store_receiving_items(id) on delete cascade,
  serial_number text,
  imei1 text,
  imei2 text,
  condition text not null default 'usable' check (condition in ('usable', 'damaged')),
  inventory_status text not null default 'pending'
    check (inventory_status in ('pending', 'in_stock', 'damaged', 'sold', 'returned', 'voided')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    btrim(coalesce(serial_number, '')) <> ''
    or btrim(coalesce(imei1, '')) <> ''
    or btrim(coalesce(imei2, '')) <> ''
  )
);

create unique index if not exists store_receiving_serials_serial_unique
  on public.store_receiving_serials(lower(btrim(serial_number)))
  where serial_number is not null and btrim(serial_number) <> '';
create unique index if not exists store_receiving_serials_imei1_unique
  on public.store_receiving_serials(btrim(imei1))
  where imei1 is not null and btrim(imei1) <> '';
create unique index if not exists store_receiving_serials_imei2_unique
  on public.store_receiving_serials(btrim(imei2))
  where imei2 is not null and btrim(imei2) <> '';
create index if not exists store_receiving_serials_receiving_item_idx
  on public.store_receiving_serials(receiving_item_id);

create or replace function private.sync_receiving_serial_inventory_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status is distinct from new.status then
    update public.store_receiving_serials s
    set inventory_status = case when s.condition = 'usable' then 'in_stock' else 'damaged' end,
        updated_at = now()
    where s.receiving_item_id in (
      select ri.id
      from public.store_receiving_items ri
      where ri.receiving_id = new.id
    );
  elsif new.status = 'voided' and old.status is distinct from new.status then
    update public.store_receiving_serials s
    set inventory_status = 'voided',
        updated_at = now()
    where s.receiving_item_id in (
      select ri.id
      from public.store_receiving_items ri
      where ri.receiving_id = new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists store_receivings_sync_serial_status on public.store_receivings;
create trigger store_receivings_sync_serial_status
after update of status on public.store_receivings
for each row execute function private.sync_receiving_serial_inventory_status();

-- ---------------------------------------------------------------------------
-- PO draft editing
-- ---------------------------------------------------------------------------

create or replace function private.update_store_purchase_order_draft_internal(
  p_purchase_order_id uuid,
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
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_variant_product_id uuid;
  v_expected integer;
  v_unit_cost numeric(12,2);
  v_product_title text;
  v_variant_title text;
  v_sku text;
begin
  if v_actor is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  select status into v_status
  from public.store_purchase_orders
  where id = p_purchase_order_id
  for update;

  if v_status is null then raise exception 'purchase order not found'; end if;
  if v_status <> 'draft' then raise exception 'only draft purchase orders can be edited'; end if;

  if not exists (select 1 from public.store_suppliers where id = p_supplier_id and is_active) then
    raise exception 'active supplier not found';
  end if;
  if p_location_id is not null and not exists (
    select 1 from public.store_procurement_locations where id = p_location_id and is_active
  ) then
    raise exception 'active location not found';
  end if;
  if btrim(coalesce(p_po_number, '')) = '' then raise exception 'PO number is required'; end if;
  if char_length(coalesce(p_currency, '')) <> 3 then raise exception 'currency must be a 3-letter code'; end if;
  if coalesce(p_discount_amount, 0) < 0 or coalesce(p_tax_amount, 0) < 0 or coalesce(p_shipping_amount, 0) < 0 then
    raise exception 'commercial amounts cannot be negative';
  end if;
  if coalesce(p_exchange_rate, 0) <= 0 then raise exception 'exchange rate must be greater than zero'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'purchase order requires at least one item';
  end if;

  update public.store_purchase_orders
  set supplier_id = p_supplier_id,
      location_id = p_location_id,
      po_number = btrim(p_po_number),
      currency = upper(p_currency),
      expected_at = p_expected_at,
      discount_amount = coalesce(p_discount_amount, 0),
      tax_amount = coalesce(p_tax_amount, 0),
      shipping_amount = coalesce(p_shipping_amount, 0),
      exchange_rate = coalesce(p_exchange_rate, 1),
      notes = nullif(btrim(coalesce(p_notes, '')), ''),
      updated_at = now()
  where id = p_purchase_order_id;

  delete from public.store_purchase_order_items
  where purchase_order_id = p_purchase_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := nullif(v_item->>'product_id', '')::uuid;
      v_variant_id := nullif(v_item->>'variant_id', '')::uuid;
      v_expected := (v_item->>'expected_quantity')::integer;
      v_unit_cost := (v_item->>'unit_cost')::numeric(12,2);
    exception when others then
      raise exception 'invalid purchase order item payload';
    end;

    if v_product_id is null or v_expected is null or v_expected <= 0 then
      raise exception 'each PO item needs a product and positive expected quantity';
    end if;
    if v_unit_cost is null or v_unit_cost < 0 then
      raise exception 'unit cost must be zero or greater';
    end if;

    select title, sku
      into v_product_title, v_sku
    from public.store_products
    where id = v_product_id
      and track_inventory
      and status <> 'archived';

    if v_product_title is null then raise exception 'tracked product not found or archived'; end if;

    if v_variant_id is not null then
      select product_id, title, coalesce(sku, v_sku)
        into v_variant_product_id, v_variant_title, v_sku
      from public.store_product_variants
      where id = v_variant_id and is_active and track_inventory;

      if v_variant_product_id is null then raise exception 'tracked active variant not found'; end if;
      if v_variant_product_id <> v_product_id then raise exception 'product and variant mismatch'; end if;
      v_product_title := v_product_title || ' · ' || v_variant_title;
    end if;

    insert into public.store_purchase_order_items (
      purchase_order_id, product_id, variant_id, sku_snapshot, title_snapshot,
      expected_quantity, unit_cost
    ) values (
      p_purchase_order_id, v_product_id, v_variant_id, v_sku, v_product_title,
      v_expected, v_unit_cost
    );
  end loop;

  insert into public.store_procurement_events (purchase_order_id, event_type, details, actor_id)
  values (
    p_purchase_order_id,
    'purchase_order_draft_updated',
    jsonb_build_object('po_number', btrim(p_po_number), 'line_count', jsonb_array_length(p_items)),
    v_actor
  );

  return p_purchase_order_id;
end;
$$;

revoke all on function private.update_store_purchase_order_draft_internal(
  uuid,uuid,uuid,text,text,timestamptz,numeric,numeric,numeric,numeric,text,jsonb
) from public, anon, authenticated;
grant execute on function private.update_store_purchase_order_draft_internal(
  uuid,uuid,uuid,text,text,timestamptz,numeric,numeric,numeric,numeric,text,jsonb
) to authenticated;

create or replace function public.update_store_purchase_order_draft(
  p_purchase_order_id uuid,
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
language sql
security invoker
set search_path = ''
as $$
  select private.update_store_purchase_order_draft_internal(
    p_purchase_order_id, p_supplier_id, p_location_id, p_po_number, p_currency,
    p_expected_at, p_discount_amount, p_tax_amount, p_shipping_amount,
    p_exchange_rate, p_notes, p_items
  );
$$;

revoke all on function public.update_store_purchase_order_draft(
  uuid,uuid,uuid,text,text,timestamptz,numeric,numeric,numeric,numeric,text,jsonb
) from public, anon;
grant execute on function public.update_store_purchase_order_draft(
  uuid,uuid,uuid,text,text,timestamptz,numeric,numeric,numeric,numeric,text,jsonb
) to authenticated;

-- Atomic create helper for the richer PO header.
create or replace function private.create_store_purchase_order_v2_internal(
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
security definer
set search_path = ''
as $$
declare
  v_po_id uuid;
begin
  v_po_id := private.create_store_purchase_order_internal(
    p_supplier_id,
    p_po_number,
    p_currency,
    p_notes,
    p_items
  );

  perform private.update_store_purchase_order_draft_internal(
    v_po_id,
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

  return v_po_id;
end;
$$;

revoke all on function private.create_store_purchase_order_v2_internal(
  uuid,uuid,text,text,timestamptz,numeric,numeric,numeric,numeric,text,jsonb
) from public, anon, authenticated;
grant execute on function private.create_store_purchase_order_v2_internal(
  uuid,uuid,text,text,timestamptz,numeric,numeric,numeric,numeric,text,jsonb
) to authenticated;

create or replace function public.create_store_purchase_order_v2(
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
language sql
security invoker
set search_path = ''
as $$
  select private.create_store_purchase_order_v2_internal(
    p_supplier_id, p_location_id, p_po_number, p_currency, p_expected_at,
    p_discount_amount, p_tax_amount, p_shipping_amount, p_exchange_rate,
    p_notes, p_items
  );
$$;

revoke all on function public.create_store_purchase_order_v2(
  uuid,uuid,text,text,timestamptz,numeric,numeric,numeric,numeric,text,jsonb
) from public, anon;
grant execute on function public.create_store_purchase_order_v2(
  uuid,uuid,text,text,timestamptz,numeric,numeric,numeric,numeric,text,jsonb
) to authenticated;

-- ---------------------------------------------------------------------------
-- Approval / issue / reject / cancel lifecycle
-- ---------------------------------------------------------------------------

create or replace function private.submit_store_purchase_order_internal(
  p_purchase_order_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_po_number text;
begin
  if v_actor is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  select status, po_number into v_status, v_po_number
  from public.store_purchase_orders
  where id = p_purchase_order_id
  for update;

  if v_status is null then raise exception 'purchase order not found'; end if;
  if v_status <> 'draft' then raise exception 'only draft purchase orders can be submitted'; end if;
  if not exists (
    select 1 from public.store_purchase_order_items where purchase_order_id = p_purchase_order_id
  ) then raise exception 'purchase order requires at least one item'; end if;

  update public.store_purchase_orders
  set status = 'pending_approval',
      rejected_by = null,
      rejected_at = null,
      rejection_reason = null,
      updated_at = now()
  where id = p_purchase_order_id;

  insert into public.store_procurement_events (purchase_order_id, event_type, details, actor_id)
  values (
    p_purchase_order_id,
    'purchase_order_submitted_for_approval',
    jsonb_build_object('po_number', v_po_number),
    v_actor
  );

  return 'pending_approval';
end;
$$;

create or replace function private.approve_store_purchase_order_internal(p_purchase_order_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
begin
  if v_actor is null or not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;
  if not private.is_dashboard_admin() then raise exception 'dashboard admin required'; end if;

  select status into v_status
  from public.store_purchase_orders
  where id = p_purchase_order_id
  for update;

  if v_status is null then raise exception 'purchase order not found'; end if;
  if v_status <> 'pending_approval' then raise exception 'purchase order is not pending approval'; end if;

  update public.store_purchase_orders
  set status = 'approved', approved_by = v_actor, approved_at = now(), updated_at = now()
  where id = p_purchase_order_id;

  insert into public.store_procurement_events (purchase_order_id, event_type, actor_id)
  values (p_purchase_order_id, 'purchase_order_approved', v_actor);

  return 'approved';
end;
$$;

create or replace function private.issue_store_purchase_order_internal(p_purchase_order_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
begin
  if v_actor is null or not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;
  if not private.is_dashboard_admin() then raise exception 'dashboard admin required'; end if;

  select status into v_status
  from public.store_purchase_orders
  where id = p_purchase_order_id
  for update;

  if v_status is null then raise exception 'purchase order not found'; end if;
  if v_status <> 'approved' then raise exception 'purchase order must be approved before issue'; end if;

  update public.store_purchase_orders
  set status = 'ordered', ordered_at = coalesce(ordered_at, now()), updated_at = now()
  where id = p_purchase_order_id;

  insert into public.store_procurement_events (purchase_order_id, event_type, actor_id)
  values (p_purchase_order_id, 'purchase_order_issued', v_actor);

  return 'ordered';
end;
$$;

create or replace function private.reject_store_purchase_order_internal(
  p_purchase_order_id uuid,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_actor is null or not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;
  if not private.is_dashboard_admin() then raise exception 'dashboard admin required'; end if;
  if v_reason is null then raise exception 'rejection reason is required'; end if;

  select status into v_status
  from public.store_purchase_orders
  where id = p_purchase_order_id
  for update;

  if v_status is null then raise exception 'purchase order not found'; end if;
  if v_status <> 'pending_approval' then raise exception 'purchase order is not pending approval'; end if;

  update public.store_purchase_orders
  set status = 'rejected',
      rejected_by = v_actor,
      rejected_at = now(),
      rejection_reason = v_reason,
      updated_at = now()
  where id = p_purchase_order_id;

  insert into public.store_procurement_events (purchase_order_id, event_type, details, actor_id)
  values (p_purchase_order_id, 'purchase_order_rejected', jsonb_build_object('reason', v_reason), v_actor);

  return 'rejected';
end;
$$;

create or replace function private.reopen_store_purchase_order_internal(p_purchase_order_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
begin
  if v_actor is null or not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;
  if not private.is_dashboard_admin() then raise exception 'dashboard admin required'; end if;

  select status into v_status
  from public.store_purchase_orders
  where id = p_purchase_order_id
  for update;

  if v_status is null then raise exception 'purchase order not found'; end if;
  if v_status <> 'rejected' then raise exception 'only rejected purchase orders can be reopened'; end if;

  update public.store_purchase_orders
  set status = 'draft',
      rejected_by = null,
      rejected_at = null,
      rejection_reason = null,
      updated_at = now()
  where id = p_purchase_order_id;

  insert into public.store_procurement_events (purchase_order_id, event_type, actor_id)
  values (p_purchase_order_id, 'purchase_order_reopened', v_actor);

  return 'draft';
end;
$$;

create or replace function private.delete_store_purchase_order_draft_internal(
  p_purchase_order_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
begin
  if v_actor is null or not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;

  select status into v_status
  from public.store_purchase_orders
  where id = p_purchase_order_id
  for update;

  if v_status is null then raise exception 'purchase order not found'; end if;
  if v_status <> 'draft' then raise exception 'only draft purchase orders can be deleted'; end if;
  if exists (select 1 from public.store_receivings where purchase_order_id = p_purchase_order_id) then
    raise exception 'purchase order with receiving history cannot be deleted';
  end if;
  if exists (select 1 from public.store_procurement_attachments where purchase_order_id = p_purchase_order_id) then
    raise exception 'delete PO attachments before deleting the draft';
  end if;

  delete from public.store_procurement_events where purchase_order_id = p_purchase_order_id;
  delete from public.store_purchase_orders where id = p_purchase_order_id;

  return 'deleted';
end;
$$;

create or replace function private.close_store_purchase_order_internal(
  p_purchase_order_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
begin
  if v_actor is null or not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;
  if not private.is_dashboard_admin() then raise exception 'dashboard admin required'; end if;

  select status into v_status
  from public.store_purchase_orders
  where id = p_purchase_order_id
  for update;

  if v_status is null then raise exception 'purchase order not found'; end if;
  if v_status <> 'received' then raise exception 'only fully received purchase orders can be closed'; end if;

  update public.store_purchase_orders
  set status = 'closed', updated_at = now()
  where id = p_purchase_order_id;

  insert into public.store_procurement_events (purchase_order_id, event_type, actor_id)
  values (p_purchase_order_id, 'purchase_order_closed', v_actor);

  return 'closed';
end;
$$;

create or replace function private.cancel_store_purchase_order_internal(
  p_purchase_order_id uuid,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_actor is null or not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;
  if not private.is_dashboard_admin() then raise exception 'dashboard admin required'; end if;
  if v_reason is null then raise exception 'cancellation reason is required'; end if;

  select status into v_status
  from public.store_purchase_orders
  where id = p_purchase_order_id
  for update;

  if v_status is null then raise exception 'purchase order not found'; end if;
  if v_status not in ('draft', 'pending_approval', 'approved', 'ordered') then
    raise exception 'purchase order cannot be cancelled in its current status';
  end if;
  if exists (
    select 1 from public.store_receivings
    where purchase_order_id = p_purchase_order_id and status = 'approved'
  ) then
    raise exception 'purchase order with approved receiving cannot be cancelled';
  end if;

  update public.store_purchase_orders
  set status = 'cancelled',
      cancelled_by = v_actor,
      cancelled_at = now(),
      cancellation_reason = v_reason,
      updated_at = now()
  where id = p_purchase_order_id;

  insert into public.store_procurement_events (purchase_order_id, event_type, details, actor_id)
  values (p_purchase_order_id, 'purchase_order_cancelled', jsonb_build_object('reason', v_reason), v_actor);

  return 'cancelled';
end;
$$;

create or replace function private.update_store_receiving_draft_internal(
  p_receiving_id uuid,
  p_invoice_number text,
  p_receiving_employee_label text,
  p_notes text,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_po_id uuid;
  v_status text;
  v_po_status text;
  v_supplier_id uuid;
  v_line jsonb;
  v_receiving_item_id uuid;
  v_po_item_id uuid;
  v_expected integer;
  v_remaining integer;
  v_already_received integer;
  v_received integer;
  v_damaged integer;
  v_delivered integer;
  v_unit_cost numeric(12,2);
  v_confirmed boolean;
  v_reason text;
  v_seen uuid[] := '{}'::uuid[];
  v_existing_count integer;
begin
  if v_actor is null or not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;
  if btrim(coalesce(p_invoice_number, '')) = '' then raise exception 'invoice number is required'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'receiving requires at least one line';
  end if;

  select r.purchase_order_id, r.status, r.supplier_id, po.status
    into v_po_id, v_status, v_supplier_id, v_po_status
  from public.store_receivings r
  join public.store_purchase_orders po on po.id = r.purchase_order_id
  where r.id = p_receiving_id
  for update of r, po;

  if v_po_id is null then raise exception 'receiving not found'; end if;
  if v_status <> 'draft' then raise exception 'only draft receiving can be edited'; end if;
  if v_po_status not in ('ordered', 'partially_received') then
    raise exception 'purchase order is not open for receiving';
  end if;

  select count(*)::integer into v_existing_count
  from public.store_receiving_items
  where receiving_id = p_receiving_id;

  if jsonb_array_length(p_lines) <> v_existing_count then
    raise exception 'all receiving lines must be included when editing a draft';
  end if;

  update public.store_receivings
  set invoice_number = btrim(p_invoice_number),
      receiving_employee_label = nullif(btrim(coalesce(p_receiving_employee_label, '')), ''),
      notes = nullif(btrim(coalesce(p_notes, '')), ''),
      updated_at = now()
  where id = p_receiving_id;

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    begin
      v_receiving_item_id := nullif(v_line->>'receiving_item_id', '')::uuid;
      v_received := coalesce((v_line->>'received_quantity')::integer, 0);
      v_damaged := coalesce((v_line->>'damaged_quantity')::integer, 0);
      v_unit_cost := (v_line->>'unit_cost')::numeric(12,2);
      v_confirmed := coalesce((v_line->>'overage_confirmed')::boolean, false);
      v_reason := nullif(btrim(coalesce(v_line->>'overage_reason', '')), '');
    exception when others then
      raise exception 'invalid receiving draft line payload';
    end;

    if v_receiving_item_id is null then raise exception 'receiving item id is required'; end if;
    if v_receiving_item_id = any(v_seen) then raise exception 'duplicate receiving line'; end if;
    v_seen := array_append(v_seen, v_receiving_item_id);

    select ri.purchase_order_item_id, poi.expected_quantity
      into v_po_item_id, v_expected
    from public.store_receiving_items ri
    join public.store_purchase_order_items poi on poi.id = ri.purchase_order_item_id
    where ri.id = v_receiving_item_id
      and ri.receiving_id = p_receiving_id
      and poi.purchase_order_id = v_po_id
    for update of ri, poi;

    if v_po_item_id is null then raise exception 'receiving line not found'; end if;
    if v_received < 0 or v_damaged < 0 then raise exception 'receiving quantities cannot be negative'; end if;
    v_delivered := v_received + v_damaged;
    if v_delivered <= 0 then raise exception 'each receiving line requires at least one received or damaged unit'; end if;
    if v_unit_cost is null or v_unit_cost < 0 then raise exception 'unit cost must be zero or greater'; end if;

    select coalesce(sum(ri.received_quantity), 0)::integer
      into v_already_received
    from public.store_receiving_items ri
    join public.store_receivings r on r.id = ri.receiving_id
    where ri.purchase_order_item_id = v_po_item_id
      and r.status = 'approved';

    v_remaining := greatest(0, v_expected - v_already_received);

    if v_delivered > v_remaining then
      if not v_confirmed or v_reason is null then
        raise exception 'excess delivery requires confirmation and a reason';
      end if;
      if char_length(v_reason) > 500 then raise exception 'excess delivery reason must be 500 characters or fewer'; end if;
    else
      v_confirmed := false;
      v_reason := null;
    end if;

    update public.store_receiving_items
    set expected_quantity_snapshot = v_expected,
        remaining_quantity_before = v_remaining,
        received_quantity = v_received,
        damaged_quantity = v_damaged,
        unit_cost = v_unit_cost,
        overage_confirmed = v_confirmed,
        overage_reason = v_reason
    where id = v_receiving_item_id;
  end loop;

  insert into public.store_procurement_events (purchase_order_id, receiving_id, event_type, details, actor_id)
  values (
    v_po_id,
    p_receiving_id,
    'receiving_draft_updated',
    jsonb_build_object('invoice_number', btrim(p_invoice_number), 'line_count', jsonb_array_length(p_lines)),
    v_actor
  );

  return p_receiving_id;
end;
$$;

revoke all on function private.update_store_receiving_draft_internal(uuid,text,text,text,jsonb)
from public, anon, authenticated;
grant execute on function private.update_store_receiving_draft_internal(uuid,text,text,text,jsonb)
to authenticated;

create or replace function public.update_store_receiving_draft(
  p_receiving_id uuid,
  p_invoice_number text,
  p_receiving_employee_label text,
  p_notes text,
  p_lines jsonb
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.update_store_receiving_draft_internal(
    p_receiving_id,
    p_invoice_number,
    p_receiving_employee_label,
    p_notes,
    p_lines
  );
$$;

revoke all on function public.update_store_receiving_draft(uuid,text,text,text,jsonb) from public, anon;
grant execute on function public.update_store_receiving_draft(uuid,text,text,text,jsonb) to authenticated;

create or replace function private.void_store_receiving_internal(
  p_receiving_id uuid,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_po_id uuid;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_actor is null or not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;
  if v_reason is null then raise exception 'void reason is required'; end if;

  select status, purchase_order_id into v_status, v_po_id
  from public.store_receivings
  where id = p_receiving_id
  for update;

  if v_status is null then raise exception 'receiving not found'; end if;
  if v_status <> 'draft' then raise exception 'only draft receiving can be voided'; end if;

  update public.store_receivings
  set status = 'voided',
      notes = concat_ws(E'\n', notes, 'VOID: ' || v_reason),
      updated_at = now()
  where id = p_receiving_id;

  insert into public.store_procurement_events (purchase_order_id, receiving_id, event_type, details, actor_id)
  values (v_po_id, p_receiving_id, 'receiving_voided', jsonb_build_object('reason', v_reason), v_actor);

  return 'voided';
end;
$$;

-- Revoke private implementations from direct exposed use.
revoke all on function private.delete_store_purchase_order_draft_internal(uuid) from public, anon, authenticated;
revoke all on function private.close_store_purchase_order_internal(uuid) from public, anon, authenticated;
revoke all on function private.approve_store_purchase_order_internal(uuid) from public, anon, authenticated;
revoke all on function private.issue_store_purchase_order_internal(uuid) from public, anon, authenticated;
revoke all on function private.reject_store_purchase_order_internal(uuid,text) from public, anon, authenticated;
revoke all on function private.reopen_store_purchase_order_internal(uuid) from public, anon, authenticated;
revoke all on function private.cancel_store_purchase_order_internal(uuid,text) from public, anon, authenticated;
revoke all on function private.void_store_receiving_internal(uuid,text) from public, anon, authenticated;

grant execute on function private.delete_store_purchase_order_draft_internal(uuid) to authenticated;
grant execute on function private.close_store_purchase_order_internal(uuid) to authenticated;
grant execute on function private.approve_store_purchase_order_internal(uuid) to authenticated;
grant execute on function private.issue_store_purchase_order_internal(uuid) to authenticated;
grant execute on function private.reject_store_purchase_order_internal(uuid,text) to authenticated;
grant execute on function private.reopen_store_purchase_order_internal(uuid) to authenticated;
grant execute on function private.cancel_store_purchase_order_internal(uuid,text) to authenticated;
grant execute on function private.void_store_receiving_internal(uuid,text) to authenticated;

create or replace function public.delete_store_purchase_order_draft(p_purchase_order_id uuid)
returns text language sql security invoker set search_path = ''
as $ select private.delete_store_purchase_order_draft_internal(p_purchase_order_id); $;

create or replace function public.approve_store_purchase_order(p_purchase_order_id uuid)
returns text language sql security invoker set search_path = ''
as $$ select private.approve_store_purchase_order_internal(p_purchase_order_id); $$;

create or replace function public.issue_store_purchase_order(p_purchase_order_id uuid)
returns text language sql security invoker set search_path = ''
as $$ select private.issue_store_purchase_order_internal(p_purchase_order_id); $$;

create or replace function public.reject_store_purchase_order(p_purchase_order_id uuid, p_reason text)
returns text language sql security invoker set search_path = ''
as $$ select private.reject_store_purchase_order_internal(p_purchase_order_id, p_reason); $$;

create or replace function public.reopen_store_purchase_order(p_purchase_order_id uuid)
returns text language sql security invoker set search_path = ''
as $$ select private.reopen_store_purchase_order_internal(p_purchase_order_id); $$;

create or replace function public.close_store_purchase_order(p_purchase_order_id uuid)
returns text language sql security invoker set search_path = ''
as $ select private.close_store_purchase_order_internal(p_purchase_order_id); $;

create or replace function public.cancel_store_purchase_order(p_purchase_order_id uuid, p_reason text)
returns text language sql security invoker set search_path = ''
as $$ select private.cancel_store_purchase_order_internal(p_purchase_order_id, p_reason); $$;

create or replace function public.void_store_receiving(p_receiving_id uuid, p_reason text)
returns text language sql security invoker set search_path = ''
as $$ select private.void_store_receiving_internal(p_receiving_id, p_reason); $$;

revoke all on function public.delete_store_purchase_order_draft(uuid) from public, anon;
revoke all on function public.close_store_purchase_order(uuid) from public, anon;
revoke all on function public.approve_store_purchase_order(uuid) from public, anon;
revoke all on function public.issue_store_purchase_order(uuid) from public, anon;
revoke all on function public.reject_store_purchase_order(uuid,text) from public, anon;
revoke all on function public.reopen_store_purchase_order(uuid) from public, anon;
revoke all on function public.cancel_store_purchase_order(uuid,text) from public, anon;
revoke all on function public.void_store_receiving(uuid,text) from public, anon;

grant execute on function public.delete_store_purchase_order_draft(uuid) to authenticated;
grant execute on function public.close_store_purchase_order(uuid) to authenticated;
grant execute on function public.approve_store_purchase_order(uuid) to authenticated;
grant execute on function public.issue_store_purchase_order(uuid) to authenticated;
grant execute on function public.reject_store_purchase_order(uuid,text) to authenticated;
grant execute on function public.reopen_store_purchase_order(uuid) to authenticated;
grant execute on function public.cancel_store_purchase_order(uuid,text) to authenticated;
grant execute on function public.void_store_receiving(uuid,text) to authenticated;

-- Private procurement document storage. Supplier invoices must never use a public bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'procurement-private',
  'procurement-private',
  false,
  20971520,
  array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists procurement_documents_staff_read on storage.objects;
create policy procurement_documents_staff_read
on storage.objects for select to authenticated
using (bucket_id = 'procurement-private' and (select private.is_dashboard_staff()));

drop policy if exists procurement_documents_staff_insert on storage.objects;
create policy procurement_documents_staff_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'procurement-private' and (select private.is_dashboard_staff()));

drop policy if exists procurement_documents_staff_update on storage.objects;
create policy procurement_documents_staff_update
on storage.objects for update to authenticated
using (bucket_id = 'procurement-private' and (select private.is_dashboard_staff()))
with check (bucket_id = 'procurement-private' and (select private.is_dashboard_staff()));

drop policy if exists procurement_documents_admin_delete on storage.objects;
create policy procurement_documents_admin_delete
on storage.objects for delete to authenticated
using (bucket_id = 'procurement-private' and (select private.is_dashboard_admin()));

-- ---------------------------------------------------------------------------
-- RLS for new tables
-- ---------------------------------------------------------------------------

alter table public.store_procurement_locations enable row level security;
alter table public.store_procurement_attachments enable row level security;
alter table public.store_receiving_serials enable row level security;

revoke all on public.store_procurement_locations,
  public.store_procurement_attachments,
  public.store_receiving_serials
from anon, authenticated;

grant select, insert, update on public.store_procurement_locations to authenticated;
grant select, insert, update, delete on public.store_procurement_attachments to authenticated;
grant select, insert, update, delete on public.store_receiving_serials to authenticated;

drop policy if exists store_procurement_locations_staff_select on public.store_procurement_locations;
create policy store_procurement_locations_staff_select
on public.store_procurement_locations for select to authenticated
using ((select private.is_dashboard_staff()));

drop policy if exists store_procurement_locations_staff_write on public.store_procurement_locations;
create policy store_procurement_locations_staff_write
on public.store_procurement_locations for all to authenticated
using ((select private.is_dashboard_staff()))
with check ((select private.is_dashboard_staff()));

drop policy if exists store_procurement_attachments_staff_all on public.store_procurement_attachments;
create policy store_procurement_attachments_staff_all
on public.store_procurement_attachments for all to authenticated
using ((select private.is_dashboard_staff()))
with check ((select private.is_dashboard_staff()));

drop policy if exists store_receiving_serials_staff_select on public.store_receiving_serials;
create policy store_receiving_serials_staff_select
on public.store_receiving_serials for select to authenticated
using ((select private.is_dashboard_staff()));

drop policy if exists store_receiving_serials_staff_write_draft on public.store_receiving_serials;
create policy store_receiving_serials_staff_write_draft
on public.store_receiving_serials for all to authenticated
using (
  (select private.is_dashboard_staff())
  and exists (
    select 1
    from public.store_receiving_items ri
    join public.store_receivings r on r.id = ri.receiving_id
    where ri.id = receiving_item_id and r.status = 'draft'
  )
)
with check (
  (select private.is_dashboard_staff())
  and exists (
    select 1
    from public.store_receiving_items ri
    join public.store_receivings r on r.id = ri.receiving_id
    where ri.id = receiving_item_id and r.status = 'draft'
  )
);

drop trigger if exists store_procurement_locations_touch_updated_at on public.store_procurement_locations;
create trigger store_procurement_locations_touch_updated_at
before update on public.store_procurement_locations
for each row execute function private.store_touch_updated_at();

drop trigger if exists store_receiving_serials_touch_updated_at on public.store_receiving_serials;
create trigger store_receiving_serials_touch_updated_at
before update on public.store_receiving_serials
for each row execute function private.store_touch_updated_at();

-- Keep an explicit audit index for the PO timeline UI.
create index if not exists store_procurement_events_po_timeline_idx
  on public.store_procurement_events(purchase_order_id, created_at desc, event_type);
