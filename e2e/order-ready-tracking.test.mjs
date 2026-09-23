import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../supabase/migrations/20260923144500_order_ready_tracking_status.sql", import.meta.url),
  "utf8",
);
const data = await readFile(new URL("../src/dashboard/data/orders.ts", import.meta.url), "utf8");
const detail = await readFile(
  new URL("../src/dashboard/pages/OrderDetailPage.tsx", import.meta.url),
  "utf8",
);
const storefront = await readFile(new URL("../src/routes/my-orders.tsx", import.meta.url), "utf8");

test("ready is a real guarded order state between processing and delivery", () => {
  assert.match(migration, /'processing',[\s\S]+'ready',[\s\S]+'out_for_delivery'/);
  assert.match(migration, /v_before\.status = 'processing' and p_status in \('ready', 'out_for_delivery', 'cancelled'\)/);
  assert.match(migration, /v_before\.status = 'ready' and p_status in \('out_for_delivery', 'cancelled'\)/);
  assert.match(migration, /order_version_conflict/);
  assert.match(migration, /insert into public\.store_order_audit_log/);
  assert.match(migration, /insert into public\.store_sales/);
});

test("dashboard exposes ready in types, counts, and next-state progression", () => {
  assert.match(data, /\| "ready"/);
  assert.match(data, /countOrders\("ready"\)/);
  assert.match(data, /status === "processing"\) return "ready"/);
  assert.match(data, /status === "ready"\) return "out_for_delivery"/);
  assert.match(detail, /nextStatus === "ready"/);
  assert.match(detail, /"processing", "ready", "out_for_delivery"/);
});

test("customer My Orders renders a five-stage tracker and refreshes status automatically", () => {
  assert.match(storefront, /CUSTOMER_STAGES/);
  assert.match(storefront, /Received/);
  assert.match(storefront, /Preparing/);
  assert.match(storefront, /Ready/);
  assert.match(storefront, /On the way/);
  assert.match(storefront, /Delivered/);
  assert.match(storefront, /refetchInterval: 10_000/);
  assert.match(storefront, /customerStatusLabel\(order\.status, ar\)/);
});
