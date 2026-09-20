import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public storefront queries use the native Supabase facade", async () => {
  const [queries, facade] = await Promise.all([
    read("src/lib/queries.ts"),
    read("src/lib/storefrontData.ts"),
  ]);
  assert.match(queries, /@\/lib\/storefrontData/);
  assert.match(facade, /@\/lib\/nativeStore/);
  assert.doesNotMatch(facade, /storefrontApiRequest|SHOPIFY_STOREFRONT|myshopify\.com/);
});

test("public CMS is Supabase-backed and resilient", async () => {
  const [cms, cmsQuery] = await Promise.all([
    read("src/lib/cms.ts"),
    read("src/lib/cmsQuery.ts"),
  ]);
  assert.match(cms, /functions\/v1\/public-cms/);
  assert.match(cms, /return EMPTY_CMS/);
  assert.match(cmsQuery, /fetchCmsSnapshot/);
});
