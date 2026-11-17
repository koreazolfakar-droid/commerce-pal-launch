import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [builder, dataLayer, storefront, types] = await Promise.all([
  readFile(new URL("../src/dashboard/pages/HomepageBuilder.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/homepage.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/routes/index.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/homepageSections.ts", import.meta.url), "utf8"),
]);

test("new homepage sections can be inserted at the beginning or directly after any existing section", () => {
  assert.match(builder, /insertAfterId === null \? 0/);
  assert.match(builder, /next\.splice\(insertIndex, 0, item\)/);
  assert.match(builder, /next\.map\(\(section, index\) => \(\{ \.\.\.section, order: index \+ 1 \}\)\)/);
  assert.match(builder, /id="homepage-insert-position"/);
  assert.match(builder, /value=\{insertAfterId \?\? "__start__"\}/);
  assert.match(builder, /onInsertAfter=\{\(\) => \{/);
  assert.match(builder, /setInsertAfterId\(section\.id\)/);
});

test("builder explains exact placement and highlights selected section in unsaved preview", () => {
  assert.match(builder, /previousSection/);
  assert.match(builder, /nextSection/);
  assert.match(builder, /insertBefore/);
  assert.match(builder, /New section goes here/);
  assert.match(builder, /Selected section — position/);
  assert.match(builder, /showOnDesktop/);
  assert.match(builder, /showOnTablet/);
  assert.match(builder, /showOnMobile/);
  assert.match(builder, /homepageSectionStatus/);
  assert.match(builder, /SECTION_TYPE_GROUPS/);
});

test("new sections remain drafts until published and persist in storefront order", () => {
  assert.match(types, /status: "draft"/);
  assert.match(builder, /status: "draft"/);
  assert.match(dataLayer, /\.sort\(\(a, b\) => a\.order - b\.order\)/);
  assert.match(dataLayer, /sort_order: \(index \+ 1\) \* 10/);
  assert.match(dataLayer, /section\.status === "published" && section\.enabled && section\.showOnStorefront/);
  assert.match(storefront, /orderedBlocks = blocks/);
  assert.match(storefront, /\.sort\(\(a, b\) => a\.order - b\.order/);
});
