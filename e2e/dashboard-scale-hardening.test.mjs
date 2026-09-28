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
      new URL("../supabase/migrations/20260928085807_dashboard_performance_realtime_hardening_20260928.sql", import.meta.url),
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
  assert.match(migration, /v_limit integer := greatest\(1, least\(coalesce\(p_limit, 8\), 20\)\)/);
  assert.match(migration, /position\(v_query in lower\(coalesce\(p\.title, ''\)\)\) > 0/);
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
  assert.match(
    ordersPage,
    /useDashboardRealtimeRefresh\(\["store_orders", "store_order_items"\]/,
  );
  assert.match(
    inventoryPage,
    /useDashboardRealtimeRefresh\(\["store_product_variants", "store_inventory_movements"\]/,
  );
});

test("performance migration also closes advisor and realtime gaps", () => {
  const staffGuards = migration.match(/not private\.is_dashboard_staff\(\)/g) ?? [];
  assert.ok(staffGuards.length >= 3);
  assert.doesNotMatch(migration, /security definer/i);
  assert.match(migration, /store_order_items_product_fk_idx/);
  assert.match(migration, /cms_brands_authenticated_read/);
  assert.match(migration, /alter publication supabase_realtime add table public\.store_orders/);
  assert.match(migration, /alter publication supabase_realtime add table public\.store_product_variants/);
});
