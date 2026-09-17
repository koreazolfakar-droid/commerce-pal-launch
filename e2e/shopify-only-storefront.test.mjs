import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public storefront queries use Shopify directly instead of the hybrid dashboard catalog", async () => {
  const queries = await read("src/lib/queries.ts");

  assert.match(queries, /from "@\/lib\/shopify"/);
  assert.doesNotMatch(queries, /@\/lib\/hybridStore|@\/lib\/nativeStore/);
  assert.match(queries, /fetchCatalogProducts/);
  assert.match(queries, /fetchCollectionByHandle/);
  assert.match(queries, /fetchProductByHandle/);
  assert.match(queries, /fetchBrandVendors/);
});

test("dashboard CMS cannot become a second storefront runtime source of truth", async () => {
  const [cms, cmsQuery] = await Promise.all([
    read("src/lib/cms.ts"),
    read("src/lib/cmsQuery.ts"),
  ]);

  assert.match(cms, /export async function fetchCmsSnapshot\(\): Promise<CmsSnapshot> \{\s*return EMPTY_CMS;\s*\}/);
  assert.doesNotMatch(cms, /createServerFn|functions\/v1\/public-cms|loadCmsSnapshot\s*\(|cmsSnapshotFn\s*\(/);
  assert.match(cmsQuery, /\["storefront", "dashboard-disconnected"\]/);
  assert.match(cmsQuery, /queryFn: async \(\) => EMPTY_CMS/);
  assert.match(cmsQuery, /staleTime: Number\.POSITIVE_INFINITY/);
  assert.doesNotMatch(cmsQuery, /fetchCmsSnapshot|refetchOnMount: "always"/);
});

test("dashboard editors remain available but isolated from public storefront data", async () => {
  const [heroEditor, productEditor, settingsEditor] = await Promise.all([
    read("src/routes/dashboard.hero.tsx"),
    read("src/routes/dashboard.products.tsx"),
    read("src/components/admin/SettingsEditor.tsx"),
  ]);

  assert.match(heroEditor, /cms_hero_slides/);
  assert.match(productEditor, /store_products|Shopify/i);
  assert.match(settingsEditor, /cms_settings/);
});
