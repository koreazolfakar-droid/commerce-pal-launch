import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = () =>
  readFile(new URL("../src/components/TopBrands.tsx", import.meta.url), "utf8");

test("Top Brands keeps generous spacing and a clear centered emphasis", async () => {
  const topBrands = await source();

  assert.match(topBrands, /Math\.min\(118, Math\.max\(104, 96 \+ compactLength \* 2\)\)/);
  assert.match(topBrands, /gap-3 px-1\.5 sm:gap-4 sm:px-2 lg:gap-5/);
  assert.match(topBrands, /h-14[\s\S]*sm:h-16/);
  assert.match(topBrands, /const isHighlighted = isActive \|\| \(!activeSlug && isFeatured\)/);
  assert.match(topBrands, /data-brand-highlighted=\{isHighlighted \? "true" : undefined\}/);
  assert.match(topBrands, /scale-\[1\.10\] opacity-100/);
  assert.match(topBrands, /opacity-\[0\.78\] sm:opacity-\[0\.84\]/);
  assert.match(topBrands, /size=\{36\}/);
});
