import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const route = await readFile(new URL("../src/routes/category.$slug.tsx", import.meta.url), "utf8");
const categories = await readFile(new URL("../src/routes/categories.tsx", import.meta.url), "utf8");
const dashboardData = await readFile(
  new URL("../src/dashboard/data/categories.ts", import.meta.url),
  "utf8",
);
const dashboardForm = await readFile(
  new URL("../src/dashboard/components/categories/CategoryForm.tsx", import.meta.url),
  "utf8",
);
const migration = await readFile(
  new URL("../supabase/migrations/20260921112000_cleanup_duplicate_categories.sql", import.meta.url),
  "utf8",
);

test("legacy duplicate category URLs redirect to canonical categories", () => {
  for (const [legacy, canonical] of [
    ["mobile-phones", "smartphone"],
    ["foldable-smartphone", "smartphone"],
    ["smartphone-bundle", "smartphone"],
    ["gaming-tablet", "tablet"],
    ["wall-charger", "charger"],
    ["charging-cable", "cable"],
    ["هاتف-مستعمل", "used-phone"],
  ]) {
    assert.match(route, new RegExp(`"${legacy}": "${canonical}"`));
  }
  assert.match(route, /throw redirect\(/);
});

test("category grid only uses custom dashboard images and falls back to unique glyphs", () => {
  assert.match(categories, /cdnImage\(category\.image_url \|\| undefined, 240\)/);
  assert.doesNotMatch(categories, /findCategoryArtworkCollection/);
  assert.match(categories, /<CategoryGlyph/);
});

test("migration preserves products while consolidating duplicate top-level categories", () => {
  assert.match(migration, /set category_id = v_smartphone/);
  assert.match(migration, /set category_id = v_tablet/);
  assert.match(migration, /set category_id = v_charger/);
  assert.match(migration, /set category_id = v_cable/);
  assert.match(migration, /name_ar = coalesce\(nullif\(name_ar, ''\), 'هواتف ذكية'\)/);
  assert.match(migration, /name = 'Used Phone'/);
  assert.match(migration, /store_categories_slug_not_blank/);
  assert.match(migration, /store_categories_slug_format/);
  assert.match(migration, /store_categories_slug_lower_uidx/);
});

test("Dashboard and database both reject recreated duplicate category families", () => {
  assert.match(dashboardData, /canonicalCategoryFamilySlug/);
  assert.match(dashboardData, /"wall-charger": "charger"/);
  assert.match(dashboardForm, /duplicateFamily/);
  assert.match(dashboardForm, /Use the existing/);
  assert.match(migration, /prevent_duplicate_store_category_family/);
  assert.match(migration, /duplicate_category_family/);
});
