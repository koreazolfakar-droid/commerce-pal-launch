import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL("../supabase/migrations/20260919120000_procurement_receiving_schema.sql", import.meta.url),
  "utf8",
);

test("procurement schema persists suppliers, POs, receiving and history", () => {
  for (const table of [
    "store_suppliers",
    "store_purchase_orders",
    "store_purchase_order_items",
    "store_receivings",
    "store_receiving_items",
    "store_procurement_events",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
  }

  assert.match(migration, /supplier_id uuid not null references public\.store_suppliers/);
  assert.match(migration, /po_number text not null/);
  assert.match(migration, /invoice_number text not null/);
  assert.match(migration, /received_by uuid not null references auth\.users/);
  assert.match(migration, /received_at timestamptz not null default now\(\)/);
});

test("receiving lines store the requested quantity and cost semantics", () => {
  assert.match(migration, /expected_quantity_snapshot integer not null/);
  assert.match(migration, /remaining_quantity_before integer not null/);
  assert.match(migration, /received_quantity integer not null default 0/);
  assert.match(migration, /damaged_quantity integer not null default 0/);
  assert.match(migration, /unit_cost numeric\(12,2\) not null/);
  assert.match(migration, /difference integer generated always as/);
  assert.match(migration, /missing_quantity integer generated always as/);
  assert.match(migration, /overage_quantity integer generated always as/);
});

test("damaged stock remains separate and excess delivery requires confirmation plus reason", () => {
  assert.match(migration, /delivered_quantity integer generated always as \(received_quantity \+ damaged_quantity\)/);
  assert.match(migration, /received_quantity \+ damaged_quantity > remaining_quantity_before[\s\S]+overage_confirmed = true/);
  assert.match(migration, /btrim\(coalesce\(overage_reason, ''\)\) <> ''/);
  assert.match(migration, /char_length\(btrim\(overage_reason\)\) <= 500/);
});

test("draft-only RLS protects PO and receiving history from direct edits", () => {
  assert.match(migration, /store_purchase_orders_staff_update_draft/);
  assert.match(migration, /status = 'draft'/);
  assert.match(migration, /store_receivings_staff_update_draft/);
  assert.match(migration, /approved_by is null/);
  assert.match(migration, /store_procurement_events_staff_select/);
  assert.doesNotMatch(
    migration,
    /grant insert[^;]+store_procurement_events|grant update[^;]+store_procurement_events|grant delete[^;]+store_procurement_events/s,
  );
});

test("receiving can start only from an orderable PO state", () => {
  assert.match(migration, /po\.status in \('ordered', 'partially_received'\)/);
});

test("step 2 does not mutate stock or average cost yet", () => {
  assert.doesNotMatch(migration, /update public\.store_product_variants/);
  assert.doesNotMatch(migration, /update public\.store_products/);
  assert.doesNotMatch(migration, /insert into public\.store_inventory_movements/);
  assert.doesNotMatch(migration, /average_cost|avg_cost/i);
});
