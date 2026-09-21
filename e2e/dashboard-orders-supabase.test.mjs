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
  new URL("../supabase/migrations/20260921053341_secure_order_workflow.sql", import.meta.url),
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

test("orders data layer reads Supabase and mutates only through guarded RPCs", () => {
  assert.match(data, /from\("store_orders"\)/);
  assert.match(data, /from\("store_order_items"\)/);
  assert.match(data, /from\("store_product_images"\)/);
  assert.match(data, /rpc\("update_store_order_status"/);
  assert.match(data, /rpc\("update_store_order_payment_status"/);
  assert.match(data, /rpc\("update_store_order_delivery"/);
  assert.match(data, /p_expected_version/);
});

test("secure order migration blocks direct client writes", () => {
  assert.match(migration, /revoke insert, update, delete on public\.store_orders from authenticated/i);
  assert.match(migration, /revoke insert, update, delete on public\.store_order_items from authenticated/i);
  assert.match(migration, /security definer/gi);
  assert.match(migration, /set search_path = ''/g);
  assert.match(migration, /private\.is_dashboard_staff\(\)/);
});

test("order state machine releases stock only on cancellation and finishes in Sales", () => {
  assert.match(migration, /'new',[\s\S]+'confirmed',[\s\S]+'processing',[\s\S]+'out_for_delivery'/);
  assert.match(migration, /v_before\.status = 'delivered' and p_status = 'done'/);
  assert.match(migration, /'release'/);
  assert.match(migration, /'order_cancel'/);
  assert.match(migration, /stock_quantity = stock_quantity \+ v_item\.quantity/);
  assert.match(migration, /insert into public\.store_sales/);
  assert.match(migration, /on conflict \(order_id\) do nothing/);
});

test("delivery changes are server-side, version checked and audited", () => {
  assert.match(migration, /create or replace function public\.update_store_order_delivery/);
  assert.match(migration, /p_expected_version/);
  assert.match(migration, /order_version_conflict/);
  assert.match(migration, /delivery fee is locked after payment/);
  assert.match(migration, /'delivery_changed'/);
  assert.match(detailPage, /Free Delivery/);
  assert.match(detailPage, /Paid Delivery/);
});

test("orders UI has truthful empty state", () => {
  assert.match(listPage, /No orders yet\./);
  assert.match(listPage, /first successful storefront order will appear here automatically/i);
});
