import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const cms = fs.readFileSync("src/lib/cms.ts", "utf8");
const cmsQuery = fs.readFileSync("src/lib/cmsQuery.ts", "utf8");

test("CMS refresh failures preserve the last known-good public snapshot", () => {
  assert.match(cms, /lastSuccessfulCmsSnapshot/);
  assert.match(cms, /CMS_BROWSER_FALLBACK_KEY/);
  assert.match(cms, /readBrowserCmsFallback/);
  assert.match(cms, /writeBrowserCmsFallback/);
  assert.match(cms, /fallback \?\? EMPTY_CMS/);
  assert.match(cms, /cache: "no-store"/);
});

test("CMS placeholder state is not written into React Query as real data", () => {
  assert.match(cmsQuery, /placeholderData: EMPTY_CMS/);
  assert.doesNotMatch(cmsQuery, /initialData:/);
  assert.doesNotMatch(cmsQuery, /initialDataUpdatedAt:/);
});
