-- Space Call procurement / receiving persistence foundation.
-- Step 2 intentionally adds no inventory mutation. Stock and average-cost updates
-- will be introduced only through a later atomic approval RPC.

create table if not exists public.store_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  code text,
  phone text,
  email text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists store_suppliers_code_unique
  on public.store_suppliers(lower(btrim(code)))
  where code is not null and btrim(code) <> '';
create index if not exists store_suppliers_active_name_idx
  on public.store_suppliers(is_active, name);

create table if not exists public.store_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.store_suppliers(id) on delete restrict,
  po_number text not null check (btrim(po_number) <> ''),
  status text not null default 'draft'
    check (status in ('draft', 'ordered', 'partially_received', 'received', 'cancelled')),
  currency text not null default 'USD' check (char_length(currency) = 3),
  ordered_at timestamptz,
  expected_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists store_purchase_orders_po_number_unique
  on public.store_purchase_orders(lower(btrim(po_number)));
create index if not exists store_purchase_orders_supplier_status_idx
  on public.store_purchase_orders(supplier_id, status, created_at desc);

create table if not exists public.store_purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.store_purchase_orders(id) on delete cascade,
  product_id uuid not null references public.store_products(id) on delete restrict,
  variant_id uuid references public.store_product_variants(id) on delete restrict,
  sku_snapshot text,
  title_snapshot text not null check (btrim(title_snapshot) <> ''),
  expected_quantity integer not null check (expected_quantity > 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  created_at timestamptz not null default now()
);

create index if not exists store_purchase_order_items_po_idx
  on public.store_purchase_order_items(purchase_order_id);
create index if not exists store_purchase_order_items_variant_idx
  on public.store_purchase_order_items(variant_id)
  where variant_id is not null;

create table if not exists public.store_receivings (
  id uuid primary key default gen_random_uuid(),
  receipt_number bigint generated always as identity unique,
  purchase_order_id uuid not null references public.store_purchase_orders(id) on delete restrict,
  invoice_number text not null check (btrim(invoice_number) <> ''),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'voided')),
  received_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  receiving_employee_label text,
  received_at timestamptz not null default now(),
  notes text,
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'draft' and approved_by is null and approved_at is null)
    or (status = 'approved' and approved_by is not null and approved_at is not null)
    or status = 'voided'
  )
);

create index if not exists store_receivings_po_status_idx
  on public.store_receivings(purchase_order_id, status, received_at desc);
create index if not exists store_receivings_invoice_idx
  on public.store_receivings(invoice_number, received_at desc);
create index if not exists store_receivings_employee_idx
  on public.store_receivings(received_by, received_at desc);

create table if not exists public.store_receiving_items (
  id uuid primary key default gen_random_uuid(),
  receiving_id uuid not null references public.store_receivings(id) on delete cascade,
  purchase_order_item_id uuid not null references public.store_purchase_order_items(id) on delete restrict,
  expected_quantity_snapshot integer not null check (expected_quantity_snapshot > 0),
  remaining_quantity_before integer not null
    check (remaining_quantity_before >= 0 and remaining_quantity_before <= expected_quantity_snapshot),
  received_quantity integer not null default 0 check (received_quantity >= 0),
  damaged_quantity integer not null default 0 check (damaged_quantity >= 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  overage_confirmed boolean not null default false,
  overage_reason text,
  delivered_quantity integer generated always as (received_quantity + damaged_quantity) stored,
  difference integer generated always as ((received_quantity + damaged_quantity) - remaining_quantity_before) stored,
  missing_quantity integer generated always as (
    greatest(0, remaining_quantity_before - (received_quantity + damaged_quantity))
  ) stored,
  overage_quantity integer generated always as (
    greatest(0, (received_quantity + damaged_quantity) - remaining_quantity_before)
  ) stored,
  created_at timestamptz not null default now(),
  check (received_quantity + damaged_quantity > 0),
  check (
    (
      received_quantity + damaged_quantity <= remaining_quantity_before
      and overage_confirmed = false
      and overage_reason is null
    )
    or
    (
      received_quantity + damaged_quantity > remaining_quantity_before
      and overage_confirmed = true
      and btrim(coalesce(overage_reason, '')) <> ''
      and char_length(btrim(overage_reason)) <= 500
    )
  )
);

create index if not exists store_receiving_items_receiving_idx
  on public.store_receiving_items(receiving_id);
create index if not exists store_receiving_items_po_item_idx
  on public.store_receiving_items(purchase_order_item_id);

create table if not exists public.store_procurement_events (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid references public.store_purchase_orders(id) on delete restrict,
  receiving_id uuid references public.store_receivings(id) on delete restrict,
  event_type text not null check (btrim(event_type) <> ''),
  details jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (purchase_order_id is not null or receiving_id is not null)
);

create index if not exists store_procurement_events_po_idx
  on public.store_procurement_events(purchase_order_id, created_at desc)
  where purchase_order_id is not null;
create index if not exists store_procurement_events_receiving_idx
  on public.store_procurement_events(receiving_id, created_at desc)
  where receiving_id is not null;

drop trigger if exists store_suppliers_touch_updated_at on public.store_suppliers;
create trigger store_suppliers_touch_updated_at
before update on public.store_suppliers
for each row execute function private.store_touch_updated_at();

drop trigger if exists store_purchase_orders_touch_updated_at on public.store_purchase_orders;
create trigger store_purchase_orders_touch_updated_at
before update on public.store_purchase_orders
for each row execute function private.store_touch_updated_at();

drop trigger if exists store_receivings_touch_updated_at on public.store_receivings;
create trigger store_receivings_touch_updated_at
before update on public.store_receivings
for each row execute function private.store_touch_updated_at();

alter table public.store_suppliers enable row level security;
alter table public.store_purchase_orders enable row level security;
alter table public.store_purchase_order_items enable row level security;
alter table public.store_receivings enable row level security;
alter table public.store_receiving_items enable row level security;
alter table public.store_procurement_events enable row level security;

revoke all on public.store_suppliers,
  public.store_purchase_orders,
  public.store_purchase_order_items,
  public.store_receivings,
  public.store_receiving_items,
  public.store_procurement_events
from anon, authenticated;

grant select on public.store_suppliers,
  public.store_purchase_orders,
  public.store_purchase_order_items,
  public.store_receivings,
  public.store_receiving_items,
  public.store_procurement_events
to authenticated;

grant insert, update, delete on public.store_suppliers,
  public.store_purchase_orders,
  public.store_purchase_order_items,
  public.store_receivings,
  public.store_receiving_items
to authenticated;

grant usage, select on sequence public.store_receivings_receipt_number_seq to authenticated;

drop policy if exists store_suppliers_staff_select on public.store_suppliers;
create policy store_suppliers_staff_select
on public.store_suppliers for select to authenticated
using ((select private.is_dashboard_staff()));

drop policy if exists store_suppliers_staff_insert on public.store_suppliers;
create policy store_suppliers_staff_insert
on public.store_suppliers for insert to authenticated
with check ((select private.is_dashboard_staff()));

drop policy if exists store_suppliers_staff_update on public.store_suppliers;
create policy store_suppliers_staff_update
on public.store_suppliers for update to authenticated
using ((select private.is_dashboard_staff()))
with check ((select private.is_dashboard_staff()));

drop policy if exists store_suppliers_staff_delete on public.store_suppliers;
create policy store_suppliers_staff_delete
on public.store_suppliers for delete to authenticated
using ((select private.is_dashboard_staff()));

drop policy if exists store_purchase_orders_staff_select on public.store_purchase_orders;
create policy store_purchase_orders_staff_select
on public.store_purchase_orders for select to authenticated
using ((select private.is_dashboard_staff()));

drop policy if exists store_purchase_orders_staff_insert_draft on public.store_purchase_orders;
create policy store_purchase_orders_staff_insert_draft
on public.store_purchase_orders for insert to authenticated
with check (
  (select private.is_dashboard_staff())
  and status = 'draft'
);

drop policy if exists store_purchase_orders_staff_update_draft on public.store_purchase_orders;
create policy store_purchase_orders_staff_update_draft
on public.store_purchase_orders for update to authenticated
using (
  (select private.is_dashboard_staff())
  and status = 'draft'
)
with check (
  (select private.is_dashboard_staff())
  and status = 'draft'
);

drop policy if exists store_purchase_orders_staff_delete_draft on public.store_purchase_orders;
create policy store_purchase_orders_staff_delete_draft
on public.store_purchase_orders for delete to authenticated
using (
  (select private.is_dashboard_staff())
  and status = 'draft'
);

drop policy if exists store_purchase_order_items_staff_select on public.store_purchase_order_items;
create policy store_purchase_order_items_staff_select
on public.store_purchase_order_items for select to authenticated
using ((select private.is_dashboard_staff()));

drop policy if exists store_purchase_order_items_staff_insert_draft on public.store_purchase_order_items;
create policy store_purchase_order_items_staff_insert_draft
on public.store_purchase_order_items for insert to authenticated
with check (
  (select private.is_dashboard_staff())
  and exists (
    select 1
    from public.store_purchase_orders po
    where po.id = purchase_order_id
      and po.status = 'draft'
  )
);

drop policy if exists store_purchase_order_items_staff_update_draft on public.store_purchase_order_items;
create policy store_purchase_order_items_staff_update_draft
on public.store_purchase_order_items for update to authenticated
using (
  (select private.is_dashboard_staff())
  and exists (
    select 1
    from public.store_purchase_orders po
    where po.id = purchase_order_id
      and po.status = 'draft'
  )
)
with check (
  (select private.is_dashboard_staff())
  and exists (
    select 1
    from public.store_purchase_orders po
    where po.id = purchase_order_id
      and po.status = 'draft'
  )
);

drop policy if exists store_purchase_order_items_staff_delete_draft on public.store_purchase_order_items;
create policy store_purchase_order_items_staff_delete_draft
on public.store_purchase_order_items for delete to authenticated
using (
  (select private.is_dashboard_staff())
  and exists (
    select 1
    from public.store_purchase_orders po
    where po.id = purchase_order_id
      and po.status = 'draft'
  )
);

drop policy if exists store_receivings_staff_select on public.store_receivings;
create policy store_receivings_staff_select
on public.store_receivings for select to authenticated
using ((select private.is_dashboard_staff()));

drop policy if exists store_receivings_staff_insert_draft on public.store_receivings;
create policy store_receivings_staff_insert_draft
on public.store_receivings for insert to authenticated
with check (
  (select private.is_dashboard_staff())
  and status = 'draft'
  and received_by = (select auth.uid())
  and exists (
    select 1
    from public.store_purchase_orders po
    where po.id = purchase_order_id
      and po.status in ('ordered', 'partially_received')
  )
);

drop policy if exists store_receivings_staff_update_draft on public.store_receivings;
create policy store_receivings_staff_update_draft
on public.store_receivings for update to authenticated
using (
  (select private.is_dashboard_staff())
  and status = 'draft'
)
with check (
  (select private.is_dashboard_staff())
  and status = 'draft'
  and approved_by is null
  and approved_at is null
);

drop policy if exists store_receivings_staff_delete_draft on public.store_receivings;
create policy store_receivings_staff_delete_draft
on public.store_receivings for delete to authenticated
using (
  (select private.is_dashboard_staff())
  and status = 'draft'
);

drop policy if exists store_receiving_items_staff_select on public.store_receiving_items;
create policy store_receiving_items_staff_select
on public.store_receiving_items for select to authenticated
using ((select private.is_dashboard_staff()));

drop policy if exists store_receiving_items_staff_insert_draft on public.store_receiving_items;
create policy store_receiving_items_staff_insert_draft
on public.store_receiving_items for insert to authenticated
with check (
  (select private.is_dashboard_staff())
  and exists (
    select 1
    from public.store_receivings r
    join public.store_purchase_order_items poi
      on poi.id = purchase_order_item_id
    where r.id = receiving_id
      and r.status = 'draft'
      and poi.purchase_order_id = r.purchase_order_id
  )
);

drop policy if exists store_receiving_items_staff_update_draft on public.store_receiving_items;
create policy store_receiving_items_staff_update_draft
on public.store_receiving_items for update to authenticated
using (
  (select private.is_dashboard_staff())
  and exists (
    select 1
    from public.store_receivings r
    where r.id = receiving_id
      and r.status = 'draft'
  )
)
with check (
  (select private.is_dashboard_staff())
  and exists (
    select 1
    from public.store_receivings r
    join public.store_purchase_order_items poi
      on poi.id = purchase_order_item_id
    where r.id = receiving_id
      and r.status = 'draft'
      and poi.purchase_order_id = r.purchase_order_id
  )
);

drop policy if exists store_receiving_items_staff_delete_draft on public.store_receiving_items;
create policy store_receiving_items_staff_delete_draft
on public.store_receiving_items for delete to authenticated
using (
  (select private.is_dashboard_staff())
  and exists (
    select 1
    from public.store_receivings r
    where r.id = receiving_id
      and r.status = 'draft'
  )
);

drop policy if exists store_procurement_events_staff_select on public.store_procurement_events;
create policy store_procurement_events_staff_select
on public.store_procurement_events for select to authenticated
using ((select private.is_dashboard_staff()));

-- No direct INSERT/UPDATE/DELETE grant is intentionally provided for
-- store_procurement_events. Later server-side procurement RPCs will own the audit log.
