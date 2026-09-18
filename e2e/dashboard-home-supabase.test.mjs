import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8");
const page = await readFile(
  new URL("../src/dashboard/pages/DashboardHomePage.tsx", import.meta.url),
  "utf8",
);
const data = await readFile(
  new URL("../src/dashboard/data/home.ts", import.meta.url),
  "utf8",
);

test("dashboard root uses the Supabase-backed home page", () => {
  assert.match(app, /DashboardHomePage/);
  assert.match(
    app,
    /route === "\/dashboard"[\s\S]+content = <DashboardHomePage \/>/,
  );
});

test("live dashboard home does not import mock business data", () => {
  assert.doesNotMatch(page, /@\/dashboard\/mock\//);
  assert.doesNotMatch(data, /@\/dashboard\/mock\//);
  assert.doesNotMatch(page, /124,892|1,842|1,206|January 31, 2026/);
});

test("dashboard home reads truthful metrics from Supabase", () => {
  assert.match(data, /from\("store_orders"\)/);
  assert.match(data, /from\("store_order_items"\)/);
  assert.match(data, /from\("store_customers"\)/);
  assert.match(data, /from\("store_products"\)/);
  assert.match(data, /from\("store_product_variants"\)/);
  assert.match(data, /from\("cms_brands"\)/);
});

test("dashboard home has truthful empty states", () => {
  assert.match(page, /No orders exist yet/);
  assert.match(page, /No sales data yet/);
  assert.match(page, /No brand sales data yet/);
});
