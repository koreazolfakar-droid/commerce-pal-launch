import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const categoryRoute = await readFile(
  new URL("../src/routes/category.$slug.tsx", import.meta.url),
  "utf8",
);
const migration = await readFile(
  new URL("../supabase/migrations/20260921082500_deduplicate_store_categories.sql", import.meta.url),
  "utf8",
);

test("legacy duplicate category URLs redirect to canonical categories", () => {
  assert.match(categoryRoute, /"mobile-phones": "smartphone"/);
  assert.match(categoryRoute, /"wall-charger": "charger"/);
  assert.match(categoryRoute, /"charging-cable": "cable"/);
  assert.match(categoryRoute, /throw redirect\(/);
  assert.match(categoryRoute, /to: "\/category\/\$slug"/);
});

test("category migration moves products before deleting duplicate category rows", () => {
  const updateIndex = migration.indexOf("update public.store_products");
  const deleteIndex = migration.indexOf("delete from public.store_categories");
  assert.ok(updateIndex > 0, "product migration update must exist");
  assert.ok(deleteIndex > updateIndex, "duplicate categories must be deleted after product migration");
  assert.match(migration, /product_type = case/);
  assert.match(migration, /category_id = case/);
  assert.match(migration, /category_merged/);
});

test("category migration protects canonical rows and prevents blank slugs", () => {
  assert.match(migration, /canonical Smartphone category missing/);
  assert.match(migration, /canonical Charger category missing/);
  assert.match(migration, /canonical Cable category missing/);
  assert.match(migration, /store_categories_slug_nonempty/);
  assert.match(migration, /check \(length\(trim\(slug\)\) > 0\)/);
});
