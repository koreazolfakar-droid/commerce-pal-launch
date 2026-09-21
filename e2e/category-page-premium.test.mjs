import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const category = await readFile(
  new URL("../src/routes/category.$slug.tsx", import.meta.url),
  "utf8",
);
const catalog = await readFile(
  new URL("../src/components/CatalogView.tsx", import.meta.url),
  "utf8",
);

test("category detail uses Dashboard-managed artwork and description", () => {
  assert.match(category, /select\("name,name_ar,slug,description,image_url"\)/);
  assert.match(category, /loaderData\.description/);
  assert.match(category, /loaderData\.imageUrl/);
  assert.match(category, /cdnImage\(loaderData\.imageUrl/);
  assert.match(category, /CategoryGlyph slug=\{slug\}/);
});

test("category page has one primary intro without duplicated count or SEO copy", () => {
  assert.match(category, /topContent=\{topContent\}/);
  assert.match(category, /hideHeading/);
  assert.match(category, /sm:grid-cols-\[minmax\(0,1fr\)_10\.5rem\]/);
  assert.match(category, /lg:grid-cols-\[minmax\(0,1fr\)_12rem\]/);
  assert.match(category, /Live availability/);
  assert.doesNotMatch(category, /const header =/);
  assert.doesNotMatch(category, /<PackageCheck/);
  assert.doesNotMatch(category, /header=\{header\}/);
});

test("catalog controls remain usable on narrow phones and precise on desktop", () => {
  assert.match(catalog, /\[scrollbar-width:none\]/);
  assert.match(catalog, /sm:flex-nowrap/);
  assert.match(catalog, /lg:grid-cols-\[224px_minmax\(0,1fr\)\]/);
  assert.match(catalog, /xl:grid-cols-\[240px_minmax\(0,1fr\)\]/);
  assert.match(catalog, /sticky top-\[5\.75rem\]/);
});
