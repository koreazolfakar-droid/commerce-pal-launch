import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Tabler functional suite adds a live notification center without fake data", async () => {
  const [header, notifications] = await Promise.all([
    read("src/dashboard/components/DashboardHeader.tsx"),
    read("src/dashboard/components/DashboardNotifications.tsx"),
  ]);

  assert.match(header, /DashboardNotifications/);
  assert.match(notifications, /store_product_variants/);
  assert.match(notifications, /store_orders/);
  assert.match(notifications, /store_catalog_audit_log/);
  assert.match(notifications, /queryFn: loadNotifications/);
  assert.doesNotMatch(notifications, /mock|faker|Math\.random/i);
  assert.doesNotMatch(notifications, /SHOPIFY_ADMIN_(API_TOKEN|CLIENT_SECRET|ACCESS_TOKEN)/);
});

test("activity page is backed by the immutable catalog audit log", async () => {
  const [route, navigation] = await Promise.all([
    read("src/routes/dashboard.activity.tsx"),
    read("src/dashboard/config/navigation.ts"),
  ]);

  assert.match(route, /store_catalog_audit_log/);
  assert.match(route, /AdvancedDataTable/);
  assert.match(route, /useDashboardLanguage/);
  assert.match(route, /actionFilter/);
  assert.match(route, /entityFilter/);
  assert.match(navigation, /\/dashboard\/activity/);
  assert.match(navigation, /Activity Log/);
  assert.match(navigation, /سجل النشاط/);
  assert.doesNotMatch(route, /\.insert\(|\.update\(|\.delete\(/);
});

test("advanced data table transfers Tabler search sort selection pagination and export behavior", async () => {
  const table = await read("src/dashboard/components/AdvancedDataTable.tsx");

  assert.match(table, /setSearch/);
  assert.match(table, /changeSort/);
  assert.match(table, /selectedIds/);
  assert.match(table, /pageSizeOptions/);
  assert.match(table, /exportRows/);
  assert.match(table, /text\/csv/);
  assert.match(table, /overflow-x-auto/);
  assert.doesNotMatch(table, /bootstrap|List\(/i);
});

test("functional transfer stays additive and does not introduce destructive database work", async () => {
  const paths = [
    "src/dashboard/components/AdvancedDataTable.tsx",
    "src/dashboard/components/DashboardNotifications.tsx",
    "src/routes/dashboard.activity.tsx",
    "src/dashboard/config/navigation.ts",
  ];
  const source = (await Promise.all(paths.map(read))).join("\n");

  assert.doesNotMatch(source, /DROP TABLE|TRUNCATE TABLE|ALTER TABLE/i);
  assert.doesNotMatch(source, /SHOPIFY_ADMIN_(API_TOKEN|CLIENT_SECRET|ACCESS_TOKEN)/);
});
