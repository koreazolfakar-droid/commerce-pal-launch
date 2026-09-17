import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const cms = fs.readFileSync("src/lib/cms.ts", "utf8");
const cmsQuery = fs.readFileSync("src/lib/cmsQuery.ts", "utf8");

test("public storefront CMS bridge is permanently disconnected from dashboard runtime", () => {
  assert.match(
    cms,
    /export async function fetchCmsSnapshot\(\): Promise<CmsSnapshot> \{\s*return EMPTY_CMS;\s*\}/,
  );
  assert.doesNotMatch(cms, /createServerFn/);
  assert.doesNotMatch(cms, /functions\/v1\/public-cms/);
  assert.doesNotMatch(cms, /lastSuccessfulCmsSnapshot|CMS_BROWSER_FALLBACK_KEY/);
  assert.doesNotMatch(cms, /localStorage|loadCmsSnapshot|cmsSnapshotFn/);
});

test("storefront CMS compatibility query is static and cannot refetch dashboard data", () => {
  assert.match(cmsQuery, /queryKey: \["storefront", "dashboard-disconnected"\]/);
  assert.match(cmsQuery, /queryFn: async \(\) => EMPTY_CMS/);
  assert.match(cmsQuery, /initialData: EMPTY_CMS/);
  assert.match(cmsQuery, /staleTime: Number\.POSITIVE_INFINITY/);
  assert.match(cmsQuery, /gcTime: Number\.POSITIVE_INFINITY/);
  assert.match(cmsQuery, /refetchOnMount: false/);
  assert.match(cmsQuery, /refetchOnWindowFocus: false/);
  assert.doesNotMatch(cmsQuery, /fetchCmsSnapshot|placeholderData/);
});
