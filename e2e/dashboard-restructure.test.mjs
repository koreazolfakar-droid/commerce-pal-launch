import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("dashboard navigation exposes every management area in grouped sections", async () => {
  const [navigation, sidebar] = await Promise.all([
    read("src/dashboard/config/navigation.ts"),
    read("src/dashboard/components/DashboardSidebar.tsx"),
  ]);

  assert.match(navigation, /DASHBOARD_NAV_GROUPS/);
  assert.match(navigation, /operations/);
  assert.match(navigation, /catalog/);
  assert.match(navigation, /storefront/);
  assert.match(navigation, /growth/);
  assert.match(navigation, /system/);

  for (const route of [
    "/dashboard/products",
    "/dashboard/inventory",
    "/dashboard/categories",
    "/dashboard/brands",
    "/dashboard/collections",
    "/dashboard/hero",
    "/dashboard/sections",
    "/dashboard/navigation",
    "/dashboard/seo",
    "/dashboard/analytics",
    "/dashboard/settings",
  ]) {
    assert.match(navigation, new RegExp(route.replaceAll("/", "\\/")));
  }

  assert.match(sidebar, /DASHBOARD_NAV_GROUPS\.map/);
  assert.match(sidebar, /sidebar-counts/);
  assert.match(sidebar, /store_product_variants/);
  assert.match(sidebar, /stock_quantity <= 5/);
});

test("dashboard overview is replaced by the focused Tabler operations view", async () => {
  const [route, tabler] = await Promise.all([
    read("src/routes/dashboard.index.tsx"),
    read("src/dashboard/components/TablerDashboardOverview.tsx"),
  ]);

  assert.match(route, /TablerDashboardOverview/);
  assert.match(tabler, /Space Call Commerce OS/);
  assert.match(tabler, /RevenueChartCard/);
  assert.match(tabler, /OrdersTrendCard/);
  assert.match(tabler, /Recent orders|الطلبات الأخيرة/);
  assert.match(tabler, /Inventory status|حالة المخزون/);
  assert.match(tabler, /Top products|أفضل المنتجات/);
  assert.doesNotMatch(route, /DashboardManagementHub/);
});

test("products route provides overview and keeps the full native editor", async () => {
  const [route, workspace] = await Promise.all([
    read("src/routes/dashboard.products.tsx"),
    read("src/components/admin/CatalogWorkspace.tsx"),
  ]);

  assert.match(route, /CatalogWorkspace/);
  assert.match(workspace, /NativeCatalogManager/);
  assert.match(workspace, /Catalog overview/);
  assert.match(workspace, /Product editor/);
  assert.match(workspace, /store_products/);
  assert.match(workspace, /store_product_variants/);
  assert.match(workspace, /store_product_images/);
  assert.match(workspace, /variantCount/);
  assert.match(workspace, /Total units/);
  assert.match(workspace, /Quantity/);
});

test("settings route provides a control center without removing the existing settings editor", async () => {
  const [route, workspace] = await Promise.all([
    read("src/routes/dashboard.settings.tsx"),
    read("src/components/admin/SettingsWorkspace.tsx"),
  ]);

  assert.match(route, /SettingsWorkspace/);
  assert.match(workspace, /SettingsEditor/);
  assert.match(workspace, /Hero & banners/);
  assert.match(workspace, /Homepage sections/);
  assert.match(workspace, /Menus & icons/);
  assert.match(workspace, /SEO settings/);
  assert.match(workspace, /Brands/);
  assert.match(workspace, /Collections/);
});

test("dashboard replacement does not add Shopify Admin secrets or destructive catalog migrations", async () => {
  const paths = [
    "src/dashboard/components/TablerDashboardOverview.tsx",
    "src/components/admin/CatalogWorkspace.tsx",
    "src/components/admin/SettingsWorkspace.tsx",
    "src/dashboard/components/DashboardSidebar.tsx",
  ];
  const content = (await Promise.all(paths.map(read))).join("\n");

  assert.doesNotMatch(content, /SHOPIFY_ADMIN_(API_TOKEN|CLIENT_SECRET|ACCESS_TOKEN)/);
  assert.doesNotMatch(content, /DROP TABLE|TRUNCATE TABLE|ALTER TABLE/i);
});
