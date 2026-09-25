import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = () =>
  readFile(new URL("../src/components/HomeCategorySection.tsx", import.meta.url), "utf8");

test("homepage categories keep dashboard data rules and premium rail rhythm", async () => {
  const categories = await source();

  assert.match(categories, /\.eq\("is_active", true\)/);
  assert.match(categories, /\.eq\("is_featured", true\)/);
  assert.match(categories, /\.order\("sort_order", \{ ascending: true \}\)/);

  assert.match(categories, /category-home-rail flex snap-x snap-proximity gap-3/);
  assert.match(categories, /category-home-item group flex w-\[5\.9rem\]/);
  assert.match(categories, /category-home-media relative grid h-\[5\.25rem\] w-\[5\.25rem\]/);
  assert.match(categories, /rounded-xl border border-border\/45 bg-card/);
  assert.match(categories, /cdnImage\(category\.image \|\| artwork\?\.image\?\.url, 192\)/);
  assert.match(categories, /loading="lazy"/);
  assert.match(categories, /className="relative h-full w-full object-contain p-1"/);
  assert.match(categories, /text-\[11\.5px\] font-semibold leading-\[1\.25\]/);
  assert.match(categories, /w-7 bg-gradient-to-l from-background via-background\/75 to-transparent/);
  assert.match(categories, /to="\/categories"[\s\S]*?preload="intent"/);
  assert.match(categories, /to="\/category\/\$slug"[\s\S]*?preload="intent"/);
});
