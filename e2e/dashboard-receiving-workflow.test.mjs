import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [workflow, hardening, data, page, purchaseOrdersPage, purchaseOrderCreatePage, purchaseOrderDetailPage, app, nav, inventory, drawer, types] = await Promise.all([
  readFile(new URL("../supabase/migrations/20260919123000_procurement_receiving_workflows.sql", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20260919124500_harden_procurement_rpc_exposure.sql", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/receiving.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/ReceivingPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/PurchaseOrdersPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/PurchaseOrderCreatePage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/PurchaseOrderDetailPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/mock/data.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/inventory.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/components/inventory/InventoryMovementHistoryDrawer.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/integrations/supabase/types.ts", import.meta.url), "utf8"),
]);

test("receiving approval is atomic and only usable units increase stock", () => {
  assert.match(workflow, /create or replace function public\.approve_store_receiving/);
  assert.match(workflow, /for update of ri, poi/);
  assert.match(workflow, /stock_quantity = stock_quantity \+ v_line\.received_quantity/);
  assert.doesNotMatch(workflow, /stock_quantity = stock_quantity \+ v_line\.damaged_quantity/);
  assert.match(workflow, /'purchase'/);
  assert.match(workflow, /'receiving'/);
  assert.match(workflow, /insert into public\.store_inventory_movements/);
  assert.match(workflow, /receiving_approved/);
});

test("server recomputes remaining quantity and rejects stale receiving snapshots", () => {
  assert.match(workflow, /sum\(prev_ri\.received_quantity\)/);
  assert.match(workflow, /v_remaining := greatest\(0, v_line\.expected_quantity - v_already_received\)/);
  assert.match(workflow, /receiving is stale; refresh the PO quantities and create a new receipt/);
  assert.match(workflow, /excess delivery requires confirmation and a reason/);
});

test("privileged implementation is private and public RPCs are security invoker wrappers", () => {
  for (const name of [
    "create_store_purchase_order",
    "submit_store_purchase_order",
    "create_store_receiving",
    "approve_store_receiving",
  ]) {
    assert.match(hardening, new RegExp(`alter function public\\.${name}`));
    assert.match(hardening, new RegExp(`private\\.${name}_internal`));
  }
  assert.match(hardening, /language sql\s+security invoker/g);
  assert.match(hardening, /revoke all on function public\.approve_store_receiving\(uuid\) from public, anon/);
  assert.match(hardening, /grant execute on function public\.approve_store_receiving\(uuid\) to authenticated/);
});

test("dashboard data layer uses real procurement tables and RPCs", () => {
  for (const table of [
    "store_suppliers",
    "store_purchase_orders",
    "store_purchase_order_items",
    "store_receivings",
    "store_receiving_items",
  ]) {
    assert.match(data, new RegExp(`from\\("${table}"\\)`));
  }
  assert.match(data, /rpc\("create_store_purchase_order"/);
  assert.match(data, /rpc\("submit_store_purchase_order"/);
  assert.match(data, /rpc\("create_store_receiving"/);
  assert.match(data, /rpc\("approve_store_receiving"/);
  assert.match(data, /invalidateNativeStoreCache\(\)/);
});

test("receiving dashboard exposes required operational fields and approval flow", () => {
  for (const label of [
    "Supplier",
    "PO number",
    "Invoice number",
    "Expected",
    "Received",
    "Cost",
    "Difference",
    "Damaged",
    "Missing",
    "Receiving employee",
    "Date / time",
  ]) {
    assert.match(page, new RegExp(label, "i"));
  }
  assert.match(page, /Confirm excess delivery/);
  assert.match(page, /Reason required/);
  assert.match(page, /Create receiving draft/);
  assert.match(page, /Approve/);
  assert.match(page, /previewReceivingLine/);
  assert.match(page, /Receiving progress/);
  assert.match(page, /Fill remaining/);
  assert.match(page, /purchaseOrderProgress/);
});

test("purchase orders expose Toters-style operational filters and actions", () => {
  for (const label of [
    "Purchase order filters",
    "All statuses",
    "All suppliers",
    "Clear filters",
    "PO number",
    "Created date",
    "Issued date",
    "Amount",
    "Actions",
  ]) {
    assert.match(page, new RegExp(label, "i"));
  }
  assert.match(page, /poStatusFilter/);
  assert.match(page, /poSupplierFilter/);
  assert.match(page, /Receive PO/);
});

test("purchase order creation uses its own dedicated route", () => {
  assert.match(app, /import PurchaseOrderCreatePage from/);
  assert.match(app, /route === "\/dashboard\/purchase-orders\/new"/);
  assert.match(purchaseOrderCreatePage, /mode="purchase-order-create"/);
  assert.match(page, /purchaseOrderCreateMode/);
  assert.match(page, /navigate\("\/dashboard\/purchase-orders\/new"\)/);
  assert.match(page, /Back to Purchase Orders/);
  assert.match(page, /Create Purchase Order/);
  assert.match(page, /Purchase order draft created/);
  assert.match(page, /navigate\("\/dashboard\/purchase-orders"\)/);
});

test("PO number opens a dedicated detail page and receiving stays separate", () => {
  assert.match(app, /import PurchaseOrderDetailPage from/);
  assert.match(app, /purchaseOrderDetail/);
  assert.match(app, /PurchaseOrderDetailPage id=/);
  assert.match(page, /dashboard\/purchase-orders\/\$\{po\.id\}/);
  assert.match(purchaseOrderDetailPage, /Purchase order details and ordered items/);
  assert.match(purchaseOrderDetailPage, /Purchase order items/);
  assert.match(purchaseOrderDetailPage, /Receive PO/);
  assert.match(purchaseOrderDetailPage, /dashboard\/receiving\/\$\{po\.id\}/);
  assert.match(purchaseOrderDetailPage, /Back to Purchase Orders/);
});

test("purchase orders and receiving are separate routed workspaces", () => {
  assert.match(app, /import PurchaseOrdersPage from/);
  assert.match(app, /import ReceivingPage from/);
  assert.match(app, /route === "\/dashboard\/purchase-orders"/);
  assert.match(app, /route === "\/dashboard\/receiving"/);
  assert.match(app, /receivingPoDetail/);
  assert.match(nav, /label: "Purchase Orders", href: "\/dashboard\/purchase-orders"/);
  assert.match(nav, /label: "Receiving", href: "\/dashboard\/receiving"/);
  assert.match(purchaseOrdersPage, /mode="purchase-orders"/);
  assert.match(page, /mode = "receiving"/);
  assert.match(page, /navigate\(\`\/dashboard\/receiving\/\$\{po\.id\}\`\)/);
  assert.match(inventory, /"receiving"/);
  assert.match(drawer, /Receiving \/ purchase/);
});

test("generated Supabase types include procurement tables and functions", () => {
  for (const name of [
    "store_suppliers",
    "store_purchase_orders",
    "store_purchase_order_items",
    "store_receivings",
    "store_receiving_items",
    "store_procurement_events",
    "create_store_purchase_order",
    "submit_store_purchase_order",
    "create_store_receiving",
    "approve_store_receiving",
  ]) {
    assert.match(types, new RegExp(name));
  }
});
