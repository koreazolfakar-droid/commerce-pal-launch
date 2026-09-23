import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("public order numbers are generated once, persisted and uniquely constrained", async () => {
  const migration = await read("supabase/migrations/20260923110500_public_order_numbers.sql");

  assert.match(migration, /add column if not exists public_order_number text/i);
  assert.match(migration, /generate_store_order_public_number/);
  assert.match(migration, /10000\s*\+.*random\(\).*90000/s);
  assert.match(migration, /public_order_number ~ '\^\[0-9\]\{5\}-\[0-9\]\{5\}\$'/);
  assert.match(migration, /unique index if not exists store_orders_public_order_number_uidx/i);
  assert.match(migration, /alter column public_order_number\s+set default/i);
  assert.match(migration, /alter column public_order_number\s+set not null/i);
});

test("checkout and customer order APIs expose the stable public number", async () => {
  const [createEdge, customerEdge, checkout, account] = await Promise.all([
    read("supabase/functions/create-order/index.ts"),
    read("supabase/functions/customer-orders/index.ts"),
    read("src/lib/orderCheckout.ts"),
    read("src/lib/customerAccount.ts"),
  ]);

  assert.match(createEdge, /select\("public_order_number"\)/);
  assert.match(createEdge, /public_order_number:/);
  assert.match(customerEdge, /public_order_number: row\.public_order_number/);
  assert.match(customerEdge, /id,order_number,public_order_number,status/);
  assert.match(checkout, /public_order_number: string/);
  assert.match(checkout, /\^\\d\{5\}-\\d\{5\}\$/);
  assert.match(account, /publicOrderNumber: text\(row\.public_order_number\)/);
});

test("customer and dashboard surfaces display public order numbers", async () => {
  const [myOrders, customerHub, ordersData, ordersPage, detailPage, quickDrawer, homeData] =
    await Promise.all([
      read("src/routes/my-orders.tsx"),
      read("src/components/customer-account/CustomerAddressHub.tsx"),
      read("src/dashboard/data/orders.ts"),
      read("src/dashboard/pages/OrdersPage.tsx"),
      read("src/dashboard/pages/OrderDetailPage.tsx"),
      read("src/dashboard/components/orders/OrderQuickDrawer.tsx"),
      read("src/dashboard/data/home.ts"),
    ]);

  assert.match(myOrders, /order\.publicOrderNumber/);
  assert.match(customerHub, /order\.publicOrderNumber/);
  assert.match(ordersData, /publicOrderNumber: row\.public_order_number/);
  assert.match(ordersData, /public_order_number\.ilike/);
  assert.match(ordersPage, /order\.publicOrderNumber/);
  assert.match(detailPage, /order\.publicOrderNumber/);
  assert.match(quickDrawer, /order\.publicOrderNumber/);
  assert.match(homeData, /orderNumber: order\.public_order_number/);
});
