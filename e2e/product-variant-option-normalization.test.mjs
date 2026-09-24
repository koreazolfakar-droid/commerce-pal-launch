import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (file) => readFile(new URL(file, root), "utf8");

test("native storefront normalizes case-duplicate variant option names", async () => {
  const nativeStore = await source("src/lib/nativeStore.ts");

  assert.match(nativeStore, /function normalizeOptionName\(name: string\)/);
  assert.match(nativeStore, /function canonicalOptionNames\(values: Json\[\]\)/);
  assert.match(
    nativeStore,
    /canonicalOptionNames\(sortedVariants\.map\(\(variant\) => variant\.options\)\)/,
  );
  assert.match(nativeStore, /optionEntries\(variant\.options, canonicalNames\)/);
  assert.match(nativeStore, /selectedOptions: optionEntries\(variant\.options, canonicalNames\)/);
});

test("product variant controls remain compact on mobile", async () => {
  const picker = await source("src/components/product/VariantPicker.tsx");

  assert.match(picker, /grid gap-3 sm:gap-4/);
  assert.match(picker, /h-9 w-9/);
  assert.match(picker, /px-3\.5 py-2/);
  assert.doesNotMatch(picker, /selected\[option\.name\][\s\S]{0,140}text-\[13px\]/);
});
