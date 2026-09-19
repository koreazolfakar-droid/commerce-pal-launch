import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [workflow, hardening, upgrade, data, page, purchaseOrdersPage, purchaseOrderCreatePage, purchaseOrderDetailPage, purchaseOrderEditPage, receivingDetailPage, suppliersPage, analyticsPage, app, nav, inventory, drawer, types] = await Promise.all([
  readFile(new URL("../supabase/migrations/20260919123000_procurement_receiving_workflows.sql", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20260919124500_harden_procurement_rpc_exposure.sql", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20260919152000_procurement_management_upgrade.sql", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/receiving.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/ReceivingPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/PurchaseOrdersPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/PurchaseOrderCreatePage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/PurchaseOrderDetailPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/PurchaseOrderEditPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/ReceivingDetailPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/SuppliersPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/ProcurementAnalyticsPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/config/navigation.ts", import.meta.url), "utf8"),
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
  assert.match(data, /rpc\("create_store_purchase_order_v2"/);
  assert.match(data, /rpc\("submit_store_purchase_order"/);
  assert.match(data, /rpc\("create_store_receiving"/);
  assert.match(data, /rpc\("approve_store_receiving"/);
  assert.match(data, /invalidateNativeStoreCache\(\)/);
});

test("procurement list pages skip unused heavy workspace payloads", () => {
  assert.match(data, /ReceivingWorkspaceLoadOptions/);
  assert.match(data, /includePurchaseOrders = options\.includePurchaseOrders !== false/);
  assert.match(data, /includeReceivings = options\.includeReceivings !== false/);
  assert.match(data, /includeProductOptions = options\.includeProductOptions !== false/);
  assert.match(data, /includeAudit = options\.includeAudit !== false/);
  assert.match(data, /includeSerials = options\.includeSerials !== false/);
  assert.match(page, /includePurchaseOrders: !purchaseOrderCreateMode/);
  assert.match(page, /includeReceivings: !purchaseOrderCreateMode/);
  assert.match(page, /includeProductOptions: !purchaseOrdersMode/);
  assert.match(page, /includeAudit: false/);
  assert.match(page, /includeSerials: false/);
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

test("purchase order detail loads only the requested PO dataset", () => {
  assert.match(data, /export async function loadPurchaseOrderDetail/);
  const start = data.indexOf("export async function loadPurchaseOrderDetail");
  const end = data.indexOf("export async function createReceivingSupplier", start);
  assert.ok(start >= 0 && end > start);

  const detailLoader = data.slice(start, end);
  assert.match(detailLoader, /\.eq\("id", purchaseOrderId\)/);
  assert.match(detailLoader, /\.eq\("purchase_order_id", purchaseOrderId\)/);
  assert.match(detailLoader, /store_purchase_order_items/);
  assert.match(detailLoader, /store_receivings/);
  assert.match(detailLoader, /store_procurement_events/);
  assert.match(detailLoader, /store_procurement_attachments/);
  assert.doesNotMatch(purchaseOrderDetailPage, /loadReceivingWorkspace/);
  assert.match(purchaseOrderDetailPage, /loadPurchaseOrderDetail\(id\)/);
});

test("purchase orders and receiving are separate routed workspaces", () => {
  assert.match(app, /import PurchaseOrdersPage from/);
  assert.match(app, /import ReceivingPage from/);
  assert.match(app, /route === "\/dashboard\/purchase-orders"/);
  assert.match(app, /route === "\/dashboard\/receiving"/);
  assert.match(app, /receivingPoDetail/);
  assert.match(nav, /label: "Purchase Orders",\s+href: "\/dashboard\/purchase-orders"/);
  assert.match(nav, /label: "Receiving",\s+href: "\/dashboard\/receiving"/);
  assert.match(purchaseOrdersPage, /mode="purchase-orders"/);
  assert.match(page, /mode = "receiving"/);
  assert.match(page, /navigate\(\`\/dashboard\/receiving\/\$\{po\.id\}\`\)/);
  assert.match(inventory, /"receiving"/);
  assert.match(drawer, /Receiving \/ purchase/);
});

test("procurement upgrade adds commercial terms, locations and duplicate invoice protection", () => {
  for (const token of [
    "store_procurement_locations",
    "location_id",
    "expected_at",
    "discount_amount",
    "tax_amount",
    "shipping_amount",
    "exchange_rate",
    "store_receivings_supplier_invoice_unique",
  ]) {
    assert.match(upgrade, new RegExp(token));
  }
  assert.match(upgrade, /supplier_id, lower\(btrim\(invoice_number\)\)/);
  assert.match(page, /Store \/ Warehouse/);
  assert.match(page, /Expected delivery/);
  assert.match(page, /VAT \/ Tax/);
  assert.match(page, /Exchange rate/);
  assert.match(page, /Overdue/);
});

test("PO lifecycle requires approval before issue and admin protects privileged decisions", () => {
  for (const rpc of [
    "approve_store_purchase_order",
    "issue_store_purchase_order",
    "reject_store_purchase_order",
    "reopen_store_purchase_order",
    "cancel_store_purchase_order",
    "close_store_purchase_order",
    "delete_store_purchase_order_draft",
  ]) {
    assert.match(upgrade, new RegExp(rpc));
    assert.match(data, new RegExp(rpc));
  }
  assert.match(upgrade, /status = 'pending_approval'/);
  assert.match(upgrade, /status = 'approved'/);
  assert.match(upgrade, /status = 'ordered'/);
  assert.match(upgrade, /private\.is_dashboard_admin\(\)/);
  assert.match(purchaseOrderDetailPage, /Submit for approval/);
  assert.match(purchaseOrderDetailPage, /Approve PO/);
  assert.match(purchaseOrderDetailPage, /Issue PO/);
  assert.match(purchaseOrderDetailPage, /Close PO/);
  assert.match(purchaseOrderDetailPage, /Cancel PO/);
});

test("draft PO editing, deletion and expected delivery are routed separately", () => {
  assert.match(app, /PurchaseOrderEditPage/);
  assert.match(app, /purchaseOrderEdit/);
  assert.match(purchaseOrderEditPage, /Edit Purchase Order/);
  assert.match(purchaseOrderEditPage, /Save draft changes/);
  assert.match(purchaseOrderEditPage, /Delete draft/);
  assert.match(purchaseOrderEditPage, /Expected delivery/);
  assert.match(purchaseOrderEditPage, /updatePurchaseOrderDraft/);
  assert.match(purchaseOrderEditPage, /deletePurchaseOrderDraft/);
});

test("PO edit uses targeted form data instead of the full procurement workspace", () => {
  assert.match(data, /export async function loadPurchaseOrderEditData/);
  assert.match(data, /loadPurchaseOrderDetail\(purchaseOrderId, \{ includeAudit: false \}\)/);
  assert.match(data, /export async function loadProcurementFormOptions/);
  assert.doesNotMatch(purchaseOrderEditPage, /loadReceivingWorkspace/);
  assert.match(purchaseOrderEditPage, /loadPurchaseOrderEditData\(id\)/);
});

test("receiving review supports editable drafts, invoice matching, serials and void", () => {
  assert.match(app, /ReceivingDetailPage/);
  assert.match(app, /receivingDetail/);
  assert.match(receivingDetailPage, /Draft receiving details/);
  assert.match(receivingDetailPage, /Save draft/);
  assert.match(receivingDetailPage, /updateReceivingDraft/);
  assert.match(receivingDetailPage, /Supplier invoice value/);
  assert.match(receivingDetailPage, /Price variance/);
  assert.match(receivingDetailPage, /Serial \/ IMEI tracking/);
  assert.match(receivingDetailPage, /replaceReceivingSerials/);
  assert.match(receivingDetailPage, /Void draft/);
  assert.match(upgrade, /update_store_receiving_draft/);
  assert.match(upgrade, /replace_store_receiving_serials/);
  assert.match(upgrade, /admin approval is required for excess delivery/);
});

test("receiving detail loads only the requested receiving dataset", () => {
  assert.match(data, /export async function loadReceivingDetail/);
  const start = data.indexOf("export async function loadReceivingDetail");
  const end = data.indexOf("export async function createReceivingSupplier", start);
  assert.ok(start >= 0 && end > start);

  const detailLoader = data.slice(start, end);
  assert.match(detailLoader, /\.eq\("id", receivingId\)/);
  assert.match(detailLoader, /\.eq\("receiving_id", receivingId\)/);
  assert.match(detailLoader, /store_receiving_items/);
  assert.match(detailLoader, /store_receiving_serials/);
  assert.match(detailLoader, /store_procurement_events/);
  assert.match(detailLoader, /store_procurement_attachments/);
  assert.doesNotMatch(receivingDetailPage, /loadReceivingWorkspace/);
  assert.match(receivingDetailPage, /loadReceivingDetail\(id\)/);
});

test("approved receiving updates stock, serial state and weighted average cost with FX", () => {
  assert.match(upgrade, /average_cost numeric\(12,2\)/);
  assert.match(upgrade, /update_average_cost_after_receiving_approval/);
  assert.match(upgrade, /v_line\.unit_cost \* coalesce\(v_line\.exchange_rate, 1\)/);
  assert.match(upgrade, /sync_receiving_serial_inventory_status/);
  assert.match(upgrade, /inventory_status = case when s\.condition = 'usable' then 'in_stock' else 'damaged' end/);
});

test("procurement documents are private and audit timelines are exposed", () => {
  assert.match(upgrade, /'procurement-private'/);
  assert.match(upgrade, /public,\s*file_size_limit/);
  assert.match(upgrade, /procurement_documents_staff_read/);
  assert.match(upgrade, /procurement_documents_admin_delete/);
  assert.match(data, /createSignedUrl/);
  assert.match(purchaseOrderDetailPage, /Documents & attachments/);
  assert.match(purchaseOrderDetailPage, /PO timeline/);
  assert.match(receivingDetailPage, /Receiving documents/);
  assert.match(receivingDetailPage, /Receiving timeline/);
  assert.match(purchaseOrderDetailPage, /Print \/ PDF/);
});

test("supplier management, analytics and reorder suggestions are live modules", () => {
  assert.match(app, /SuppliersPage/);
  assert.match(app, /ProcurementAnalyticsPage/);
  assert.match(nav, /label: "Suppliers",\s+href: "\/dashboard\/suppliers"/);
  assert.match(nav, /label: "Procurement",\s+href: "\/dashboard\/procurement"/);
  assert.match(suppliersPage, /Suppliers & Locations/);
  assert.match(suppliersPage, /Phone/);
  assert.match(suppliersPage, /Email/);
  assert.match(analyticsPage, /Procurement Analytics/);
  assert.match(analyticsPage, /Suggested reorder/);
  assert.match(analyticsPage, /Suggested supplier/);
  assert.match(data, /buildProcurementAnalytics/);
  assert.match(data, /buildReorderSuggestions/);
  assert.match(data, /recommendedSupplierName/);
});

test("supplier and analytics pages request only the procurement datasets they use", () => {
  assert.match(suppliersPage, /includeReceivings: false/);
  assert.match(suppliersPage, /includeProductOptions: false/);
  assert.match(suppliersPage, /includeAudit: false/);
  assert.match(suppliersPage, /includeSerials: false/);
  assert.match(analyticsPage, /includeAudit: false/);
  assert.match(analyticsPage, /includeSerials: false/);
});

test("generated Supabase types include procurement tables and functions", () => {
  for (const name of [
    "store_suppliers",
    "store_purchase_orders",
    "store_purchase_order_items",
    "store_receivings",
    "store_receiving_items",
    "store_procurement_events",
    "store_procurement_locations",
    "store_procurement_attachments",
    "store_receiving_serials",
    "create_store_purchase_order",
    "create_store_purchase_order_v2",
    "update_store_purchase_order_draft",
    "submit_store_purchase_order",
    "approve_store_purchase_order",
    "issue_store_purchase_order",
    "close_store_purchase_order",
    "create_store_receiving",
    "update_store_receiving_draft",
    "replace_store_receiving_serials",
    "approve_store_receiving",
    "void_store_receiving",
  ]) {
    assert.match(types, new RegExp(name));
  }
});

