import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = () =>
  readFile(new URL("../src/components/WhyShop.tsx", import.meta.url), "utf8");

test("Why Shop stays compact and consolidates useful service actions", async () => {
  const whyShop = await source();

  assert.match(whyShop, /data-testid="why-shop"/);
  assert.match(whyShop, /data-testid="home-quick-actions"/);
  assert.match(whyShop, /Live stock & pricing/);
  assert.match(whyShop, /Easy product discovery/);
  assert.match(whyShop, /Clear checkout/);
  assert.doesNotMatch(whyShop, /title:\s*\{\s*en:\s*"Direct support"/);
  assert.match(whyShop, /توفر مباشر، أسعار واضحة ودعم عند الحاجة/);
  assert.match(whyShop, /grid gap-2\.5 sm:grid-cols-3/);
  assert.match(whyShop, /serviceSavedFavorites/);
  assert.match(whyShop, /serviceDeals/);
  assert.match(whyShop, /serviceWhatsApp/);
  assert.match(whyShop, /to:\s*"\/wishlist"/);
  assert.match(whyShop, /generalWhatsAppUrl/);

  const reasonTitles = whyShop.match(/title:\s*\{\s*en:/g) ?? [];
  assert.equal(reasonTitles.length, 3);
  const quickActions = whyShop.match(/title:\s*"service/g) ?? [];
  assert.equal(quickActions.length, 3);
});
