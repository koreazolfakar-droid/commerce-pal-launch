import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [ordersData, catalogData, homeData, ordersPage, inventoryPage, realtimeHook, migration] =
  await Promise.all([
    readFile(new URL("../src/dashboard/data/orders.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/dashboard/data/catalog.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/dashboard/data/home.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/dashboard/pages/OrdersPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/dashboard/pages/InventoryManagerPage.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../src/dashboard/hooks/useDashboardRealtimeRefresh.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../supabase/migrations/20260928113000_dashboard_scale_hardening.sql", import.meta.url),
      "utf8",
    ),
  ]);

test("orders use one aggregate status RPC instead of nine count queries", () => {
  assert.match(ordersData, /get_dashboard_order_stats/);
  assert.doesNotMatch(ordersData, /async function countOrders/);
  assert.doesNotMatch(ordersData, /countOrders\("new"\)/);
  assert.match(migration, /create or replace function public\.get_dashboard_order_stats/);
});

test("global dashboard product search is bounded and server-side", () => {
  assert.match(catalogData, /searchDashboardProducts/);
  assert.match(catalogData, /search_dashboard_products/);
  assert.doesNotMatch(catalogData, /listDashboardProductSearchIndex/);
  assert.match(migration, /create or replace function public\.search_dashboard_products/);
  assert.match(migration, /v_limit integer := least\(25/);
  assert.match(migration, /pg_trgm/);
});

test("dashboard home uses a single aggregate RPC", () => {
  assert.match(homeData, /get_dashboard_home_snapshot/);
  assert.doesNotMatch(homeData, /from\("store_products"\)/);
  assert.doesNotMatch(homeData, /from\("store_product_variants"\)/);
  assert.match(migration, /create or replace function public\.get_dashboard_home_snapshot/);
  assert.match(migration, /period_sales/);
  assert.match(migration, /payment_status in \('paid', 'partially_refunded'\)/);
});

test("orders and inventory refresh from Supabase Realtime", () => {
  assert.match(realtimeHook, /postgres_changes/);
  assert.match(realtimeHook, /REALTIME_DEBOUNCE_MS = 350/);
  assert.match(realtimeHook, /supabase\.removeChannel\(channel\)/);
  assert.match(ordersPage, /useDashboardRealtimeRefresh\(\["store_orders"\]/);
  assert.match(inventoryPage, /useDashboardRealtimeRefresh\(\["store_product_variants"\]/);
});

test("new performance RPCs keep dashboard authorization at the database boundary", () => {
  const staffGuards = migration.match(/not private\.is_dashboard_staff\(\)/g) ?? [];
  assert.ok(staffGuards.length >= 3);
  assert.doesNotMatch(migration, /security definer/i);
  assert.match(migration, /grant execute on function public\.get_dashboard_order_stats\(\) to authenticated/);
});
