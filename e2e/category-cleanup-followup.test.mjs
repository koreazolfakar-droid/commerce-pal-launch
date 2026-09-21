import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../supabase/migrations/20260921123000_category_cleanup_audit_and_subtype_tags.sql", import.meta.url),
  "utf8",
);
const route = await readFile(
  new URL("../src/routes/category.$slug.tsx", import.meta.url),
  "utf8",
);
const dashboardCategories = await readFile(
  new URL("../src/dashboard/data/categories.ts", import.meta.url),
  "utf8",
);

test("cleaned category aliases remain redirected to canonical pages", () => {
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

test("dashboard canonicalizes known duplicate category families", () => {
  assert.match(dashboardCategories, /CATEGORY_FAMILY_ALIASES/);
  assert.match(dashboardCategories, /canonicalCategoryFamilySlug/);
  assert.match(dashboardCategories, /"foldable-smartphone": "smartphone"/);
  assert.match(dashboardCategories, /"gaming-tablet": "tablet"/);
});

test("cleanup follow-up preserves subtype metadata and an audit trail", () => {
  assert.match(migration, /foldable-smartphone/);
  assert.match(migration, /smartphone-bundle/);
  assert.match(migration, /gaming-tablet/);
  assert.match(migration, /category_merged/);
  assert.match(migration, /category_normalized/);
  assert.match(migration, /where not exists/);
});
