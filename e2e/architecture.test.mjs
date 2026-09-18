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

test("homepage brand shelves backfill missing products without expanding the global catalog", async () => {
  const [queries, shelves] = await Promise.all([
    read("src/lib/queries.ts"),
    read("src/components/BrandShowcaseSections.tsx"),
  ]);
  assert.match(queries, /fetchCatalogProducts\(60\)/);
  assert.match(queries, /homeVendorProductsQueryOptions/);
  assert.match(queries, /fetchProductsByVendor\(normalizedVendor, 4\)/);
  assert.match(shelves, /homeVendorProductsQueryOptions/);
  assert.match(shelves, /HOME_BRAND_PRODUCT_TARGET = 4/);
  assert.match(shelves, /IntersectionObserver/);
  assert.match(shelves, /rootMargin:\s*"1000px 0px"/);
  assert.match(shelves, /mergeUniqueProducts\(indexedProducts, vendorProducts\)/);
});

test("native cart keeps local totals and defers authoritative validation to checkout", async () => {
  const store = await read("src/stores/cartStore.ts");

  assert.match(store, /function localCartState/);
  assert.match(store, /set\(localCartState\(next\)\)/);
  assert.match(store, /syncCart:\s*async \(\) => \{[\s\S]*await hydrateCartStore\(\)/);
  assert.match(store, /export function hydrateCartStore\(\): Promise<void>/);
  assert.match(store, /useCartStore\.persist\.rehydrate\(\)/);
  assert.match(store, /getCheckoutUrl:\s*\(\) => null/);
  assert.doesNotMatch(store, /remoteState\(result\.cart\)/);
  assert.doesNotMatch(store, /quantity:\s*i\.quantity\s*\+/);
});

test("server applies mutation abuse guards and hardened browser headers", async () => {
  const server = await read("src/server.ts");
  assert.match(server, /MAX_REQUEST_BYTES/);
  assert.match(server, /RATE_LIMIT_MAX_MUTATIONS/);
  assert.match(server, /sec-fetch-site/);
  assert.match(server, /Cross-site mutation blocked/);
  assert.match(server, /Content-Security-Policy/);
  assert.match(server, /frame-ancestors 'self'/);
  assert.match(server, /Strict-Transport-Security/);
  assert.match(server, /Cross-Origin-Resource-Policy/);
});

test("secret environment files and private keys cannot be committed accidentally", async () => {
  const gitignore = await read(".gitignore");
  assert.match(gitignore, /^\.env$/m);
  assert.match(gitignore, /^\.env\.\*$/m);
  assert.match(gitignore, /^!\.env\.example$/m);
  assert.match(gitignore, /^\*\.pem$/m);
  assert.match(gitignore, /^\*\.key$/m);
});
