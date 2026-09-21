import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [app, nav, page, data, migration] = await Promise.all([
  readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/config/navigation.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/SalesPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/sales.ts", import.meta.url), "utf8"),
  readFile(
    new URL("../supabase/migrations/20260921053341_secure_order_workflow.sql", import.meta.url),
    "utf8",
  ),
]);

test("Sales is a real dashboard route backed by Supabase", () => {
  assert.match(app, /import SalesPage from "@\/dashboard\/pages\/SalesPage"/);
  assert.match(app, /route === "\/dashboard\/sales"\) content = <SalesPage \/>/);
  assert.match(nav, /label: "Sales", href: "\/dashboard\/sales"/);
  assert.match(data, /from\("store_sales"\)/);
});

test("Sales contains no mock business data", () => {
  for (const source of [page, data]) {
    assert.doesNotMatch(source, /@\/dashboard\/mock\//);
    assert.doesNotMatch(source, /mock state|demo sale|fake sale/i);
  }
});

test("DONE creates exactly one persistent sales snapshot per order", () => {
  assert.match(migration, /create table if not exists public\.store_sales/);
  assert.match(migration, /order_id uuid not null unique/);
  assert.match(migration, /v_before\.status = 'delivered' and p_status = 'done'/);
  assert.match(migration, /insert into public\.store_sales/);
  assert.match(migration, /on conflict \(order_id\) do nothing/);
});

test("Sales UI is read only and links back to the source order", () => {
  assert.doesNotMatch(data, /\.insert\(|\.update\(|\.delete\(/);
  assert.match(page, /Read-only sales ledger created when an order reaches DONE/);
  assert.match(page, /\/dashboard\/orders\/\$\{sale\.orderId\}/);
});
