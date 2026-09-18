import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const cms = fs.readFileSync("src/lib/cms.ts", "utf8");
const cmsQuery = fs.readFileSync("src/lib/cmsQuery.ts", "utf8");

test("public CMS uses the curated Edge Function and preserves the last good snapshot", () => {
  assert.match(cms, /createServerFn/);
  assert.match(cms, /functions\/v1\/public-cms/);
  assert.match(cms, /lastSuccessfulCmsSnapshot/);
  assert.match(cms, /CMS_BROWSER_FALLBACK_KEY/);
  assert.match(cms, /readBrowserCmsFallback/);
  assert.match(cms, /writeBrowserCmsFallback/);
  assert.match(cms, /fallback \?\? EMPTY_CMS/);
  assert.match(cms, /cache: "no-store"/);
  assert.doesNotMatch(cms, /from\("cms_brands"/);
});

test("CMS placeholder state never becomes persisted query data", () => {
  assert.match(cmsQuery, /queryFn: fetchCmsSnapshot/);
  assert.match(cmsQuery, /placeholderData: EMPTY_CMS/);
  assert.match(cmsQuery, /refetchOnMount: "always"/);
  assert.doesNotMatch(cmsQuery, /initialData:/);
  assert.doesNotMatch(cmsQuery, /staleTime: Number\.POSITIVE_INFINITY/);
});
