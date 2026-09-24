import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migratedFiles = [
  "src/components/CartDrawer.tsx",
  "src/components/CatalogView.tsx",
  "src/components/CheckoutDetailsForm.tsx",
  "src/components/CompactProductCard.tsx",
  "src/components/DealSpotlight.tsx",
  "src/components/ProductCard.tsx",
  "src/components/ProductGrid.tsx",
  "src/components/ProductRail.tsx",
  "src/components/WhatsAppCheckoutForm.tsx",
  "src/components/product/QuickViewButton.tsx",
  "src/components/product/QuickViewDialog.tsx",
  "src/routes/brand.$slug.tsx",
  "src/routes/product.$handle.tsx",
  "src/routes/sitemap[.]xml.ts",
  "src/stores/cartStore.ts",
];

test("migrated storefront UI no longer imports the Shopify compatibility facade", async () => {
  for (const path of migratedFiles) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /@\/lib\/shopify/);
    assert.doesNotMatch(source, /\bShopify(?:Product|Collection)\b/);
  }
});

test("product-facing UI consumes canonical store types", async () => {
  for (const path of [
    "src/components/CatalogView.tsx",
    "src/components/CompactProductCard.tsx",
    "src/components/DealSpotlight.tsx",
    "src/components/ProductCard.tsx",
    "src/components/ProductGrid.tsx",
    "src/components/ProductRail.tsx",
    "src/components/product/QuickViewButton.tsx",
    "src/components/product/QuickViewDialog.tsx",
    "src/routes/brand.$slug.tsx",
    "src/routes/product.$handle.tsx",
    "src/routes/sitemap[.]xml.ts",
    "src/stores/cartStore.ts",
  ]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(source, /@\/lib\/storeTypes/);
  }
});
