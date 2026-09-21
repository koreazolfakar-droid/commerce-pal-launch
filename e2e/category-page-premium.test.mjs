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

test("category detail keeps Dashboard-managed description without a custom hero", () => {
  assert.match(category, /select\("name,name_ar,slug,description,image_url"\)/);
  assert.match(category, /loaderData\.description/);
  assert.match(category, /description=\{loaderData\.description\?\.trim\(\) \|\| undefined\}/);
  assert.doesNotMatch(category, /topContent=\{topContent\}/);
  assert.doesNotMatch(category, /hideHeading/);
  assert.doesNotMatch(category, /CategoryGlyph/);
  assert.doesNotMatch(category, /Live availability/);
});

test("catalog controls remain usable on narrow phones and precise on desktop", () => {
  assert.match(catalog, /\[scrollbar-width:none\]/);
  assert.match(catalog, /sm:flex-nowrap/);
  assert.match(catalog, /lg:grid-cols-\[224px_minmax\(0,1fr\)\]/);
  assert.match(catalog, /xl:grid-cols-\[240px_minmax\(0,1fr\)\]/);
  assert.match(catalog, /sticky top-\[5\.75rem\]/);
});
