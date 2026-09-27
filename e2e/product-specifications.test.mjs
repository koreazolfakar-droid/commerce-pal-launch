import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [
  specifications,
  filters,
  aiPanel,
  categories,
  catalogView,
  productRoute,
  compareRoute,
  migration,
  nativeStore,
] = await Promise.all([
  read("src/lib/specifications.ts"),
  read("src/lib/filters.ts"),
  read("src/dashboard/components/ai/AiAssistPanel.tsx"),
  read("src/dashboard/data/categories.ts"),
  read("src/components/CatalogView.tsx"),
  read("src/routes/product.$handle.tsx"),
  read("src/routes/compare.tsx"),
  read("supabase/migrations/20260926153325_final_category_product_specifications.sql"),
  read("src/lib/nativeStore.ts"),
]);

test("legacy specification JSON survives dashboard normalization", () => {
  assert.match(specifications, /legacy\?: unknown/);
  assert.match(specifications, /legacy: raw/);
  assert.match(specifications, /"legacy" in row/);
});

test("specification filters OR values within one key and accept full stored lengths", () => {
  assert.match(filters, /=\.\{1,240\}\$/);
  assert.match(filters, /function specificationSelections/);
  assert.match(filters, /values\.some/);
  assert.match(filters, /\[\.\.\.selections\]\.every/);
});

test("AI empty-only auto selection is scoped to specification fields", () => {
  assert.match(aiPanel, /suggestion\.field\.startsWith\("spec__"\)/);
  assert.match(aiPanel, /!currentData\[suggestion\.field\]\?\.trim\(\)/);
});

test("category template and metadata update atomically", () => {
  assert.match(categories, /update_store_category_with_spec_template/);
  assert.match(categories, /p_spec_template: parseTemplate\(category\.specTemplate\)/);
  assert.doesNotMatch(categories, /Updating specification template failed/);
});

test("specification facets stay available after selecting their own values", () => {
  assert.match(catalogView, /facetProducts = products/);
  assert.match(catalogView, /if \(selectedKey === key\) return true/);
  assert.match(catalogView, /selectedSpecGroups\.has\(key\)/);
});

test("structured product specs retain supplemental variant and identity details", () => {
  assert.match(productRoute, /const supplementalRows: SpecRow\[\]/);
  assert.match(productRoute, /selectedVariant\?\.selectedOptions/);
  assert.match(productRoute, /label: "SKU"/);
  assert.match(productRoute, /label: "Barcode"/);
  assert.match(productRoute, /label: "Weight"/);
  assert.match(productRoute, /structuredLabels/);
});

test("comparison ignores stale requests and identifies rows by field key", () => {
  assert.match(compareRoute, /requestIdRef/);
  assert.match(compareRoute, /requestId !== requestIdRef\.current/);
  assert.match(compareRoute, /key: field\.key/);
  assert.match(compareRoute, /item\.key === row\.key/);
});

test("database rollout is legacy-safe, validates later, and accepts empty uncategorized specs", () => {
  assert.match(migration, /'legacy', specifications/);
  assert.match(migration, /not valid;/i);
  assert.match(migration, /validate constraint store_products_specs_shape/i);
  assert.match(
    migration,
    /coalesce\(new\.specifications->'values', '\{\}'::jsonb\) = '\{\}'::jsonb/,
  );
  assert.match(
    migration,
    /coalesce\(new\.specifications->'keySpecs', '\[\]'::jsonb\) = '\[\]'::jsonb/,
  );
  assert.match(migration, /for share;/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /update_store_category_with_spec_template/);
});


test("catalog hydration batches category templates instead of querying per product", () => {
  assert.match(nativeStore, /STOREFRONT_CATEGORY_SELECT/);
  assert.match(
    nativeStore,
    /publicSupabase\.from\("store_categories"\)\.select\(STOREFRONT_CATEGORY_SELECT\)/,
  );
  assert.match(nativeStore, /templatesByCategoryId/);
  assert.match(nativeStore, /parseTemplate\(row\.spec_template\)/);
  assert.match(
    nativeStore,
    /row\.category_id \? templatesByCategoryId\.get\(row\.category_id\) : undefined/,
  );
});
