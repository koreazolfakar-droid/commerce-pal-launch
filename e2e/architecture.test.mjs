import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("store identity and public settings are centralized", async () => {
  const [config, source] = await Promise.all([
    read("src/lib/storeConfig.ts"),
    Promise.all([
      read("src/components/SiteHeader.tsx"),
      read("src/components/MobileTopBar.tsx"),
      read("src/components/SiteFooter.tsx"),
      read("src/lib/i18n.tsx"),
      read("src/lib/seo.ts"),
    ]).then((files) => files.join("\n")),
  ]);
  assert.match(config, /VITE_STORE_NAME/);
  assert.match(config, /"Space Call"/);
  assert.doesNotMatch(source, /Space Cell/);
});

test("Shopify operations are bounded and product pages avoid the catalog query", async () => {
  const [documents, shopify, productRoute] = await Promise.all([
    read("src/lib/shopifyDocuments.ts"),
    read("src/lib/shopify.ts"),
    read("src/routes/product.$handle.tsx"),
  ]);
  assert.doesNotMatch(`${documents}\n${shopify}`, /first:\s*250/);
  assert.doesNotMatch(shopify, /2025-07/);
  assert.doesNotMatch(productRoute, /catalogQueryOptions/);
  assert.match(productRoute, /vendorProductsQueryOptions/);
});

test("Shopify cart responses contain authoritative merchandise prices and totals", async () => {
  const [documents, store] = await Promise.all([
    read("src/lib/shopifyDocuments.ts"),
    read("src/stores/cartStore.ts"),
  ]);
  assert.match(documents, /cost\s*\{/);
  assert.match(documents, /merchandise\s*\{/);
  assert.match(store, /set\(remoteState\(result\.cart\)\)/);
  assert.doesNotMatch(store, /quantity:\s*i\.quantity\s*\+/);
});
