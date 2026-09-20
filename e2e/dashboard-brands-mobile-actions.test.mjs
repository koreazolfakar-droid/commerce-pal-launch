import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("catalog actions use a mobile bottom sheet instead of covering list rows", async () => {
  const [actions, brands, categories] = await Promise.all([
    read("src/dashboard/components/CatalogRowActions.tsx"),
    read("src/dashboard/components/brands/BrandList.tsx"),
    read("src/dashboard/components/categories/CategoryList.tsx"),
  ]);

  assert.match(actions, /role="menu"/);
  assert.match(actions, /fixed inset-x-3 bottom-\[calc\(4\.75rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(actions, /z-\[60\]/);
  assert.match(actions, /bg-slate-950\/20/);
  assert.match(actions, /lg:absolute/);
  assert.match(actions, /lg:top-11/);
  assert.match(actions, /lg:w-48/);
  assert.match(actions, /role="menuitem"/);

  assert.match(brands, /entityType="Brand"/);
  assert.match(categories, /entityType="Category"/);
});
