import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("production dashboard keeps reusable API-ready architecture", async () => {
  const [route, shell, service, charts, sidebar, header, styles] = await Promise.all([
    read("src/routes/dashboard.index.tsx"),
    read("src/components/admin/DashboardShell.tsx"),
    read("src/dashboard/services/dashboardService.ts"),
    read("src/dashboard/components/DashboardCharts.tsx"),
    read("src/dashboard/components/DashboardSidebar.tsx"),
    read("src/dashboard/components/DashboardHeader.tsx"),
    read("src/styles/admin-dashboard.css"),
  ]);

  assert.match(route, /DashboardPageHeader/);
  assert.match(route, /RecentOrdersTable/);
  assert.match(route, /TopSellingProductsCard/);
  assert.match(route, /InventoryStatusCard/);
  assert.match(route, /DashboardPromoBanner/);
  assert.match(service, /getDashboardOverview/);
  assert.match(service, /store_orders/);
  assert.match(service, /store_order_items/);
  assert.match(charts, /ResponsiveContainer/);
  assert.match(charts, /AreaChart/);
  assert.match(charts, /BarChart/);
  assert.match(sidebar, /spacecall:dashboard-sidebar-collapsed|DashboardSidebar/);
  assert.match(shell, /data-sidebar-collapsed/);
  assert.match(header, /GlobalDashboardSearch/);
  assert.match(styles, /--sc-sidebar: #0b1428/);
  assert.match(styles, /max-width: 1560px/);
});

test("dashboard does not expose Shopify Admin credentials to client UI", async () => {
  const paths = [
    "src/routes/dashboard.index.tsx",
    "src/components/admin/DashboardShell.tsx",
    "src/dashboard/services/dashboardService.ts",
    "src/dashboard/components/DashboardHeader.tsx",
    "src/dashboard/components/DashboardSidebar.tsx",
  ];
  const content = (await Promise.all(paths.map(read))).join("\n");
  assert.doesNotMatch(content, /SHOPIFY_ADMIN_(API_TOKEN|CLIENT_SECRET|ACCESS_TOKEN)/);
});

test("dashboard retains responsive mobile and desktop structures", async () => {
  const [route, shell, orders] = await Promise.all([
    read("src/routes/dashboard.index.tsx"),
    read("src/components/admin/DashboardShell.tsx"),
    read("src/dashboard/components/RecentOrdersTable.tsx"),
  ]);

  assert.match(route, /sm:grid-cols-2/);
  assert.match(route, /xl:grid-cols-4/);
  assert.match(route, /xl:grid-cols-12/);
  assert.match(shell, /lg:ps-\[80px\]/);
  assert.match(shell, /lg:ps-\[252px\]/);
  assert.match(shell, /lg:hidden/);
  assert.match(orders, /md:hidden/);
  assert.match(orders, /hidden overflow-x-auto md:block/);
});
