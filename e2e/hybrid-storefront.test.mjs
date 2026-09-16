import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const hybrid = fs.readFileSync("src/lib/hybridStore.ts", "utf8");
const facade = fs.readFileSync("src/lib/storefrontFacade.ts", "utf8");
const queries = fs.readFileSync("src/lib/queries.ts", "utf8");
const productRoute = fs.readFileSync("src/routes/product.$handle.tsx", "utf8");
const tsconfig = fs.readFileSync("tsconfig.json", "utf8");
const rlsMigration = fs.readFileSync(
  "supabase/migrations/20260916193000_fix_native_catalog_public_read_rls.sql",
  "utf8",
);

test("storefront data reads use the hybrid native plus Shopify layer", () => {
  assert.match(queries, /from "@\/lib\/hybridStore"/);
  assert.match(hybrid, /import \* as nativeStore from "@\/lib\/nativeStore"/);
  assert.match(hybrid, /import \* as shopifyStore from "\.\/shopify"/);
  assert.match(hybrid, /Promise\.allSettled/);
  assert.match(hybrid, /continuing with the other storefront source/);
});

test("existing @/lib/shopify imports resolve through the storefront compatibility facade", () => {
  const config = JSON.parse(tsconfig);
  assert.deepEqual(config.compilerOptions.paths["@/lib/shopify"], [
    "./src/lib/storefrontFacade.ts",
  ]);
  assert.match(facade, /export \* from "\.\/shopify"/);
  assert.match(facade, /fetchProductByHandle/);
  assert.match(facade, /from "\.\/hybridStore"/);

  // The product route intentionally stays unchanged at the call site. The exact
  // TS/Vite alias routes this loader through the facade, avoiding a risky rewrite.
  assert.match(productRoute, /fetchProductByHandle/);
  assert.match(productRoute, /from "@\/lib\/shopify"/);
});

test("native products win duplicate handles during gradual migration", () => {
  assert.match(hybrid, /for \(const product of \[\.\.\.nativeProducts, \.\.\.shopifyProducts\]\)/);
  assert.match(hybrid, /seen\.has\(key\)/);
  assert.match(hybrid, /if \(nativeProduct\)/);
  assert.match(hybrid, /return \(await enrichNativeBrands\(\[nativeProduct\]\)\)\[0\] \?\? nativeProduct/);
});

test("native brand names use the curated public CMS path without weakening CMS RLS", () => {
  assert.match(hybrid, /fetchCmsSnapshot/);
  assert.match(hybrid, /select\("id,brand_id"\)/);
  assert.match(hybrid, /cms\.brands\.filter\(\(brand\) => brand\.is_visible\)/);
  assert.doesNotMatch(hybrid, /from\("cms_brands"/);
});

test("hybrid storefront does not introduce Shopify Admin writes or secrets", () => {
  assert.doesNotMatch(hybrid, /SHOPIFY_ADMIN_API_TOKEN/);
  assert.doesNotMatch(hybrid, /X-Shopify-Access-Token/);
  assert.doesNotMatch(hybrid, /admin\/api/i);
  assert.doesNotMatch(hybrid, /\.insert\(/);
  assert.doesNotMatch(hybrid, /\.update\(/);
  assert.doesNotMatch(hybrid, /\.delete\(/);
});

test("public native catalog policies never call dashboard-only helpers", () => {
  assert.match(rlsMigration, /TO anon, authenticated/);
  assert.match(rlsMigration, /status = 'active'/);
  assert.match(rlsMigration, /published_at IS NULL OR published_at <= now\(\)/);
  assert.match(rlsMigration, /is_active/);
  assert.doesNotMatch(rlsMigration, /private\.is_dashboard_staff/);
  assert.doesNotMatch(rlsMigration, /GRANT\s+EXECUTE/i);
  assert.doesNotMatch(rlsMigration, /DISABLE\s+ROW\s+LEVEL\s+SECURITY/i);
});
