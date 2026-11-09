import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("full shop catalog uses the same Supabase snapshot as product search by default", async () => {
  const store = await read("src/lib/nativeStore.ts");
  const search = store.slice(store.indexOf("export async function searchStorefront("));
  const full = store.slice(
    store.indexOf("export async function fetchCatalogProducts("),
    store.indexOf("export async function fetchHomepageProducts("),
  );

  assert.match(search, /publicProducts\(snapshot\)/);
  assert.match(full, /publicProducts\(await loadSnapshot\(\)\)/);
  assert.match(full, /RUST_CATALOG_CANARY_ENABLED/);
  assert.match(store, /VITE_STOREFRONT_RUST_CATALOG_CANARY\s*===\s*"true"/);
  assert.match(store, /return fetchSupabaseCatalogPreview\(first\)/);
});

test("optional brand metadata cannot block the full product list", async () => {
  const queries = await read("src/lib/queries.ts");
  const catalog = queries.slice(
    queries.indexOf("async function fetchCatalogIndexSafely"),
    queries.indexOf("export const catalogPreviewQueryOptions"),
  );
  assert.match(catalog, /fetchCatalogProducts\(first\)/);
  assert.match(catalog, /fetchBrandVendors\(\)\.catch/);
});

test("shop exposes loading and retry states for incomplete catalog", async () => {
  const shop = await read("src/routes/shop.tsx");
  assert.match(shop, /fullCatalog \?\? previewCatalog/);
  assert.match(shop, /shop-catalog-load-state/);
  assert.match(shop, /fullCatalogError/);
  assert.match(shop, /refetchFullCatalog\(\)/);
});

test("catalog automatically expands on scroll while retaining button fallback", async () => {
  const view = await read("src/components/CatalogView.tsx");
  assert.match(view, /new IntersectionObserver\(/);
  assert.match(view, /observer\.observe\(target\)/);
  assert.match(view, /count \+ CATALOG_RENDER_PAGE_SIZE/);
  assert.match(view, /ref=\{loadMoreRef\}/);
  assert.match(view, /loadMoreProducts/);
});
