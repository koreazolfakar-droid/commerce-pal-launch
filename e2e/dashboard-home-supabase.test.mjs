import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8");
const routes = await readFile(
  new URL("../src/dashboard/config/routes.tsx", import.meta.url),
  "utf8",
);
const page = await readFile(
  new URL("../src/dashboard/pages/DashboardHomePage.tsx", import.meta.url),
  "utf8",
);
const data = await readFile(
  new URL("../src/dashboard/data/home.ts", import.meta.url),
  "utf8",
);
const performanceMigration = await readFile(
  new URL("../supabase/migrations/20260928090000_dashboard_performance_realtime_hardening.sql", import.meta.url),
  "utf8",
);

test("dashboard root uses the lazy Supabase-backed home page", () => {
  assert.match(routes, /const homePage = lazyPage\(\(\) => import\("@\/dashboard\/pages\/DashboardHomePage"\)\)/);
  assert.match(routes, /id: "home"[\s\S]*path: "\/dashboard"[\s\S]*page: homePage/);
  assert.match(app, /resolveDashboardRoute\(route\)/);
  assert.doesNotMatch(app, /import DashboardHomePage from/);
});

test("live dashboard home does not import mock business data", () => {
  assert.doesNotMatch(page, /@\/dashboard\/mock\//);
  assert.doesNotMatch(data, /@\/dashboard\/mock\//);
  assert.doesNotMatch(page, /124,892|1,842|1,206|January 31, 2026/);
});

test("dashboard home reads one bounded server-side aggregate snapshot", () => {
  assert.match(data, /looseSupabase\.rpc\("get_dashboard_home_snapshot"/);
  assert.match(data, /p_start: start\.toISOString\(\)/);
  assert.match(data, /p_end: end\.toISOString\(\)/);
  assert.doesNotMatch(data, /\.from\("store_products"\)|\.from\("store_product_variants"\)|\.from\("store_order_items"\)/);
  assert.match(performanceMigration, /create or replace function public\.get_dashboard_home_snapshot/);
  assert.match(performanceMigration, /p_end - p_start > interval '90 days'/);
});

test("dashboard home sales metrics only use completed eligible sales", () => {
  assert.match(performanceMigration, /payment_status in \('paid', 'partially_refunded'\)/);
  assert.match(performanceMigration, /from public\.store_sales/);
  assert.match(performanceMigration, /join public\.store_order_items oi on oi\.order_id = ps\.order_id/);
  assert.match(page, /Gross sales/);
  assert.match(page, /Completed paid sales · full refunds excluded/);
});

test("dashboard home has truthful empty states", () => {
  assert.match(page, /No orders exist yet/);
  assert.match(page, /No sales data yet/);
  assert.match(page, /No brand sales data yet/);
});
