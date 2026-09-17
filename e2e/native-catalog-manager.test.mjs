import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync("src/routes/dashboard.products.tsx", "utf8");
const workspace = fs.readFileSync("src/components/admin/CatalogWorkspace.tsx", "utf8");
const manager = fs.readFileSync("src/components/admin/NativeCatalogManager.tsx", "utf8");
const migration = fs.readFileSync(
  "supabase/migrations/20260916184231_native_catalog_audit_log.sql",
  "utf8",
);

test("dashboard products route keeps the native Space Call catalog manager behind the professional workspace", () => {
  assert.match(route, /CatalogWorkspace/);
  assert.match(workspace, /NativeCatalogManager/);
  assert.match(manager, /store_products/);
  assert.match(manager, /store_product_variants/);
  assert.match(manager, /base_price/);
  assert.match(manager, /stock_quantity/);
  assert.match(manager, /compare_at_price/);
});

test("native catalog manager never writes to Shopify", () => {
  assert.doesNotMatch(manager, /SHOPIFY_ADMIN_API_TOKEN/);
  assert.doesNotMatch(manager, /storefrontApiRequest/);
  assert.doesNotMatch(manager, /graphql\.json/);
  assert.doesNotMatch(manager, /X-Shopify-Access-Token/);
});

test("existing products are archived instead of permanently deleted", () => {
  assert.match(manager, /status:\s*"archived"/);
  const archiveStart = manager.indexOf("const archiveProduct");
  assert.ok(archiveStart >= 0);
  const archiveEnd = manager.indexOf("const addVariant", archiveStart);
  const archiveFunction = manager.slice(archiveStart, archiveEnd >= 0 ? archiveEnd : undefined);
  assert.match(archiveFunction, /\.from\("store_products" as never\)/);
  assert.match(
    archiveFunction,
    /\.update\(\{ status: "archived", published_at: null \} as never\)/,
  );
  assert.doesNotMatch(manager, /\.from\("store_products" as never\)[\s\S]{0,160}\.delete\(\)/);
});

test("catalog audit migration is additive and staff-readable", () => {
  assert.match(migration, /create table if not exists public\.store_catalog_audit_log/);
  assert.match(migration, /after insert or update or delete on public\.store_products/);
  assert.match(migration, /after insert or update or delete on public\.store_product_variants/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /private\.is_dashboard_staff/);
  assert.doesNotMatch(migration, /drop table\s+public\.store_products/i);
  assert.doesNotMatch(migration, /truncate/i);
});
