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
  assert.match(whyShop, /data-testid="why-shop-benefits"/);
  assert.match(whyShop, /divide-y divide-border\/70 lg:grid lg:grid-cols-3 lg:divide-y-0/);
  assert.match(whyShop, /grid grid-cols-2 gap-2 md:grid-cols-3/);
  assert.match(whyShop, /col-span-2 min-h-\[72px\] flex-row items-center/);
  assert.match(whyShop, /focus-visible:ring-2/);
  assert.match(whyShop, /Quick links/);
  assert.match(whyShop, /روابط سريعة/);
  assert.match(whyShop, /rtl:rotate-180/);
  assert.match(whyShop, /availability: "on-sale"/);
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
