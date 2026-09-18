import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public storefront queries use the provider-neutral facade", async () => {
  const queries = await read("src/lib/queries.ts");

  assert.match(queries, /from "@\/lib\/storefrontFacade"/);
  assert.doesNotMatch(queries, /from "@\/lib\/shopify"/);
  assert.match(queries, /fetchCatalogProducts/);
  assert.match(queries, /fetchCollectionByHandle/);
  assert.match(queries, /fetchProductByHandle/);
  assert.match(queries, /fetchBrandVendors/);
});

test("dashboard CMS is exposed only through the curated public gateway", async () => {
  const [cms, cmsQuery] = await Promise.all([
    read("src/lib/cms.ts"),
    read("src/lib/cmsQuery.ts"),
  ]);

  assert.match(cms, /functions\/v1\/public-cms/);
  assert.match(cms, /fetchCmsSnapshot/);
  assert.match(cmsQuery, /queryFn: fetchCmsSnapshot/);
  assert.match(cmsQuery, /placeholderData: EMPTY_CMS/);
  assert.doesNotMatch(cms, /SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
});
