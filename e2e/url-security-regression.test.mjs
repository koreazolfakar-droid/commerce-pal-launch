import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const safeUrl = await readFile(new URL("../src/lib/safeUrl.ts", import.meta.url), "utf8");
const cmsControls = await readFile(
  new URL("../src/components/CmsStoreControls.tsx", import.meta.url),
  "utf8",
);
const brandDirectory = await readFile(
  new URL("../src/lib/brandDirectory.ts", import.meta.url),
  "utf8",
);
const brandData = await readFile(
  new URL("../src/dashboard/data/brands.ts", import.meta.url),
  "utf8",
);
const navigationData = await readFile(
  new URL("../src/dashboard/data/navigation.ts", import.meta.url),
  "utf8",
);

test("storefront URL allowlist rejects executable and credential-bearing destinations", () => {
  assert.match(safeUrl, /parsed\.protocol !== "https:" && parsed\.protocol !== "http:"/);
  assert.match(safeUrl, /parsed\.username \|\| parsed\.password/);
  assert.match(safeUrl, /raw\.startsWith\("\/"\) && !raw\.startsWith\("\/\/"\)/);
  assert.doesNotMatch(safeUrl, /javascript:|data:/i);
});

test("CMS navigation and brand links are revalidated at the rendering boundary", () => {
  assert.match(cmsControls, /safeStoreHref\(item\.href\)/);
  assert.match(brandDirectory, /safeStoreHref\(override\?\.href\)/);
  assert.match(brandDirectory, /safeStoreHref\(brand\.href\)/);
});

test("dashboard saves reject unsafe navigation and brand destinations", () => {
  assert.match(navigationData, /const safe = safeStoreHref\(href\)/);
  assert.match(brandData, /const safeWebsite = rawWebsite \? safeStoreHref\(rawWebsite\) : null/);
  assert.match(brandData, /Brand website must be a site path/);
});
