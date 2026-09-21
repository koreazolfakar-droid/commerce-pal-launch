import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("brand deletion keeps products safe, confirms in UI and cleans unused media", async () => {
  const [page, data] = await Promise.all([
    read("src/dashboard/pages/BrandsPage.tsx"),
    read("src/dashboard/data/brands.ts"),
  ]);

  assert.match(page, /setDeleteTarget\(brand\)/);
  assert.match(page, /Move products to/);
  assert.match(page, /This permanently removes the brand record/);
  assert.match(page, /disabled=\{deleting\}/);
  assert.match(page, /Brand deleted safely\. Product assignments were preserved\./);

  const start = data.indexOf("export async function deleteDashboardBrand");
  const end = data.indexOf("export async function reorderDashboardBrands", start);
  assert.ok(start >= 0 && end > start);
  const deleteSource = data.slice(start, end);

  assert.match(deleteSource, /select\("logo_url,cover_image_url"\)/);
  assert.match(deleteSource, /rpc\(\s*"delete_store_brand"/);
  assert.match(deleteSource, /removeDashboardBrandImage/);
  assert.match(deleteSource, /invalidateNativeStoreCache\(\)/);
});
