import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = () =>
  readFile(new URL("../src/components/WhyShop.tsx", import.meta.url), "utf8");

test("Why Shop stays compact, bilingual and limited to four distinct benefits", async () => {
  const whyShop = await source();

  assert.match(whyShop, /data-testid="why-shop"/);
  assert.match(whyShop, /Live stock & pricing/);
  assert.match(whyShop, /Easy product discovery/);
  assert.match(whyShop, /Clear checkout/);
  assert.match(whyShop, /Direct support/);
  assert.match(whyShop, /توفر مباشر، أسعار واضحة ودعم عند الحاجة/);
  assert.match(whyShop, /grid gap-2\.5 sm:grid-cols-2/);
  assert.match(whyShop, /h-9 w-9/);
  assert.match(whyShop, /rounded-xl border border-border\/65/);

  assert.doesNotMatch(whyShop, /title: "Live catalogue"/);
  assert.doesNotMatch(whyShop, /title: "Accurate pricing"/);
  assert.doesNotMatch(whyShop, /title: "Focused discovery"/);
  assert.doesNotMatch(whyShop, /title: "Order clarity"/);

  const reasonTitles = whyShop.match(/title:\s*\{\s*en:/g) ?? [];
  assert.equal(reasonTitles.length, 4);
});
