import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("production dashboard keeps reusable API-ready architecture", async () => {
  const [route, tabler, shell, service, charts, sidebar, header, styles] = await Promise.all([
    read("src/routes/dashboard.index.tsx"),
    read("src/dashboard/components/TablerDashboardOverview.tsx"),
    read("src/components/admin/DashboardShell.tsx"),
    read("src/dashboard/services/dashboardService.ts"),
    read("src/dashboard/components/DashboardCharts.tsx"),
    read("src/dashboard/components/DashboardSidebar.tsx"),
    read("src/dashboard/components/DashboardHeader.tsx"),
    read("src/styles/admin-dashboard.css"),
  ]);

  assert.match(route, /TablerDashboardOverview/);
  assert.match(tabler, /Space Call Commerce OS/);
  assert.match(tabler, /RevenueChartCard/);
  assert.match(tabler, /OrdersTrendCard/);
  assert.match(tabler, /Recent orders|الطلبات الأخيرة/);
  assert.match(tabler, /Inventory status|حالة المخزون/);
  assert.match(tabler, /Top products|أفضل المنتجات/);
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

test("dashboard overview replacement preserves auth shell and does not expose Shopify Admin credentials", async () => {
  const paths = [
    "src/routes/dashboard.index.tsx",
    "src/dashboard/components/TablerDashboardOverview.tsx",
    "src/components/admin/DashboardShell.tsx",
    "src/dashboard/services/dashboardService.ts",
    "src/dashboard/components/DashboardHeader.tsx",
    "src/dashboard/components/DashboardSidebar.tsx",
  ];
  const content = (await Promise.all(paths.map(read))).join("\n");

  assert.doesNotMatch(content, /SHOPIFY_ADMIN_(API_TOKEN|CLIENT_SECRET|ACCESS_TOKEN)/);

  const dashboardRoute = await read("src/routes/dashboard.tsx");
  const login = await read("src/components/admin/AdminLogin.tsx");
  assert.match(dashboardRoute, /DashboardLanguageProvider/);
  assert.match(login, /useDashboardLanguage/);
});

test("Tabler overview retains responsive mobile and desktop structures", async () => {
  const [tabler, shell] = await Promise.all([
    read("src/dashboard/components/TablerDashboardOverview.tsx"),
    read("src/components/admin/DashboardShell.tsx"),
  ]);

  assert.match(tabler, /sm:grid-cols-2/);
  assert.match(tabler, /xl:grid-cols-4/);
  assert.match(tabler, /xl:grid-cols-12/);
  assert.match(tabler, /overflow-x-auto/);
  assert.match(shell, /lg:ps-\[80px\]/);
  assert.match(shell, /lg:ps-\[252px\]/);
  assert.match(shell, /lg:hidden/);
});

test("Tabler overview replacement stays data-preserving and frontend-only", async () => {
  const source = await read("src/dashboard/components/TablerDashboardOverview.tsx");

  assert.match(source, /getDashboardOverview/);
  assert.doesNotMatch(source, /\.insert\(/);
  assert.doesNotMatch(source, /\.update\(/);
  assert.doesNotMatch(source, /\.delete\(/);
  assert.doesNotMatch(source, /supabase\.from/);
});
