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

test("dashboard home reads one server-side aggregate snapshot", () => {
  assert.match(data, /get_dashboard_home_snapshot/);
  assert.match(data, /normalizeSnapshot/);
  assert.doesNotMatch(data, /from\("store_orders"\)/);
  assert.doesNotMatch(data, /from\("store_sales"\)/);
  assert.doesNotMatch(data, /from\("store_product_variants"\)/);
});

test("dashboard home labels gross completed sales accurately", () => {
  assert.match(page, /Gross sales/);
  assert.match(page, /Completed paid sales · full refunds excluded/);
});

test("dashboard home has truthful empty states", () => {
  assert.match(page, /No orders exist yet/);
  assert.match(page, /No sales data yet/);
  assert.match(page, /No brand sales data yet/);
});
