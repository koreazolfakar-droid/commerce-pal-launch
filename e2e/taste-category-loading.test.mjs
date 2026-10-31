import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("home categories use their own geometry-matched loading placeholder", () => {
  const index = read("src/routes/index.tsx");
  assert.match(index, /key: "categories"[\s\S]*?<HomeCategorySkeleton \/>[\s\S]*?key: "brands"/);
  assert.match(index, /key: "brands"[\s\S]*?<BrandRailSkeleton \/>/);
});

test("initial and managed category placeholders share the same item shape", () => {
  const skeleton = read("src/components/LoadingSkeletons.tsx");
  const category = read("src/components/HomeCategorySection.tsx");
  assert.match(skeleton, /export function HomeCategorySkeletonItems/);
  assert.match(skeleton, /export function HomeCategorySkeleton/);
  assert.match(skeleton, /category-home-rail/);
  assert.match(skeleton, /w-\[5\.9rem\]/);
  assert.match(skeleton, /h-\[5\.25rem\]/);
  assert.match(category, /managedCategoriesPending\s*\? <HomeCategorySkeletonItems \/>/);
});
