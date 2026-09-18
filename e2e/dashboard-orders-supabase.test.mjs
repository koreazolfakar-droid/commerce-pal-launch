import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8");
const listPage = await readFile(
  new URL("../src/dashboard/pages/OrdersPage.tsx", import.meta.url),
  "utf8",
);
const detailPage = await readFile(
  new URL("../src/dashboard/pages/OrderDetailPage.tsx", import.meta.url),
  "utf8",
);
const data = await readFile(
  new URL("../src/dashboard/data/orders.ts", import.meta.url),
  "utf8",
);
const migration = await readFile(
  new URL("../supabase/migrations/20260918211500_dashboard_order_management.sql", import.meta.url),
  "utf8",
);

test("active orders routes use Supabase-backed pages", () => {
  assert.match(app, /OrdersPageLive/);
  assert.match(app, /OrderDetailPageLive/);
  assert.match(app, /route === "\/dashboard\/orders"[\s\S]+<OrdersPageLive \/>/);
  assert.match(app, /orderDetail[\s\S]+<OrderDetailPageLive id=\{orderDetail\[1\]\} \/>/);
});

test("orders pages contain no mock business data", () => {
  for (const source of [listPage, detailPage, data]) {
    assert.doesNotMatch(source, /@\/dashboard\/mock\//);
    assert.doesNotMatch(source, /SC7842|Alex Johnson|customer@spacecall\.demo/);
  }
  assert.doesNotMatch(listPage, /1,842|1,604|Mock/);
  assert.doesNotMatch(detailPage, /Jan 31, 2026|Mock fulfillment|mock state/);
});

test("orders data layer reads Supabase order tables", () => {
  assert.match(data, /from\("store_orders"\)/);
  assert.match(data, /from\("store_order_items"\)/);
  assert.match(data, /from\("store_product_images"\)/);
  assert.match(data, /rpc\("update_store_order_status"/);
  assert.match(data, /rpc\("update_store_order_payment_status"/);
});

test("order cancellation safely releases tracked stock", () => {
  assert.match(migration, /security invoker/gi);
  assert.match(migration, /movement_type,[\s\S]+quantity_delta/);
  assert.match(migration, /'release'/);
  assert.match(migration, /'order_cancel'/);
  assert.match(migration, /stock_quantity = stock_quantity \+ v_item\.quantity/);
  assert.match(migration, /final order status cannot be changed/);
});

test("orders UI has truthful empty state", () => {
  assert.match(listPage, /No orders yet\./);
  assert.match(listPage, /first successful storefront order will appear here automatically/i);
});
