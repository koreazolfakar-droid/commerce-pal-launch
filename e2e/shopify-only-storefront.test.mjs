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

test("legacy CMS cannot become a second storefront runtime source of truth", async () => {
  const [cms, cmsQuery] = await Promise.all([
    read("src/lib/cms.ts"),
    read("src/lib/cmsQuery.ts"),
  ]);

  assert.match(
    cms,
    /export async function fetchCmsSnapshot\(\): Promise<CmsSnapshot> \{\s*return EMPTY_CMS;\s*\}/,
  );
  assert.doesNotMatch(
    cms,
    /createServerFn|functions\/v1\/public-cms|loadCmsSnapshot\s*\(|cmsSnapshotFn\s*\(/,
  );
  assert.match(cmsQuery, /queryFn: async \(\) => EMPTY_CMS/);
  assert.match(cmsQuery, /staleTime: Number\.POSITIVE_INFINITY/);
  assert.doesNotMatch(cmsQuery, /fetchCmsSnapshot|refetchOnMount: "always"/);
});
