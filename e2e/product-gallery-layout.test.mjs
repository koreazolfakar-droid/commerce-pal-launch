import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (file) => readFile(new URL(file, root), "utf8");

test("product gallery uses premium multi-image hierarchy", async () => {
  const gallery = await source("src/components/product/ProductGallery.tsx");

  assert.match(gallery, /data-testid="product-gallery-counter"/);
  assert.match(gallery, /data-testid=\{compact \? undefined : "product-gallery-thumbnails"\}/);
  assert.match(gallery, /aspect-\[1\/0\.92\]/);
  assert.match(gallery, /snap-x/);
  assert.match(gallery, /lg:flex-col/);
  assert.match(gallery, /\{index \+ 1\} \/ \{images\.length\}/);
  assert.doesNotMatch(gallery, /mobile-dot-/);
});

test("multi-image thumbnails stay compact and variant-safe", async () => {
  const gallery = await source("src/components/product/ProductGallery.tsx");

  assert.match(gallery, /onClick=\{\(\) => onSelect\(thumbIndex\)\}/);
  assert.match(gallery, /aria-pressed=\{thumbIndex === index\}/);
  assert.match(gallery, /h-12 w-12/);
  assert.match(gallery, /lg:h-\[4\.75rem\] lg:w-\[4\.75rem\]/);
  assert.match(gallery, /object-contain/);
});
