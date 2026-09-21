import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("store identity and public settings are centralized without Shopify configuration", async () => {
  const [config, env, source] = await Promise.all([
    read("src/lib/storeConfig.ts"),
    read(".env.example"),
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
  assert.doesNotMatch(config, /shopifyDomain|shopifyApiVersion|SHOPIFY_ACCOUNT_URL/);
  assert.doesNotMatch(env, /SHOPIFY_STOREFRONT|VITE_SHOPIFY/);
  assert.doesNotMatch(source, /Space Cell/);
});

test("storefront commerce reads resolve only through the native Supabase gateway", async () => {
  const [facade, compat, productRoute, collectionRoute] = await Promise.all([
    read("src/lib/storefrontData.ts"),
    read("src/lib/shopify.ts"),
    read("src/routes/product.$handle.tsx"),
    read("src/routes/collections.$handle.tsx"),
  ]);
  assert.match(facade, /import \* as nativeStore from "@\/lib\/nativeStore"/);
  for (const fn of ["fetchCatalogProducts","fetchCollectionByHandle","fetchProductByHandle","searchStorefront"]) {
    assert.match(facade, new RegExp(`nativeStore\\.${fn}`));
  }
  assert.doesNotMatch(facade, /withShopifyFallback|storefrontApiRequest|SHOPIFY_STOREFRONT/);
  assert.doesNotMatch(compat, /fetch\(|createServerFn|storefrontApiRequest|SHOPIFY_STOREFRONT|myshopify/);
  assert.doesNotMatch(productRoute, /catalogQueryOptions|checkoutUrl|getCheckoutUrl/);
  assert.match(collectionRoute, /@\/lib\/storefrontData/);
});

test("homepage uses bounded product reads and keeps brand shelves lazy", async () => {
  const [queries, index, shelves, nativeStore, homeSections] = await Promise.all([
    read("src/lib/queries.ts"),
    read("src/routes/index.tsx"),
    read("src/components/BrandShowcaseSections.tsx"),
    read("src/lib/nativeStore.ts"),
    read("src/components/HomeSections.tsx"),
  ]);

  assert.match(queries, /fetchHomepageProducts\(48\)/);
  assert.match(queries, /homepageCatalogQueryOptions/);
  const homepageQueryStart = queries.indexOf("async function fetchHomepageCatalogIndex");
  const homepageQueryEnd = queries.indexOf("async function fetchCatalogIndexSafely", homepageQueryStart);
  assert.ok(homepageQueryStart >= 0 && homepageQueryEnd > homepageQueryStart);
  assert.doesNotMatch(
    queries.slice(homepageQueryStart, homepageQueryEnd),
    /fetchNavigationCatalogFacets/,
  );
  assert.match(index, /homepageCatalogQueryOptions/);
  assert.doesNotMatch(index, /catalogQueryOptions/);
  assert.match(index, /categories: navigationCatalog\?\.categories \?\? catalog\.categories/);
  assert.match(index, /brands: navigationCatalog\?\.brands \?\? catalog\.brands/);
  assert.match(queries, /homeVendorProductsQueryOptions/);
  assert.match(queries, /fetchProductsByVendor\(normalizedVendor, 4\)/);
  assert.match(shelves, /homeVendorProductsQueryOptions/);
  assert.match(shelves, /HOME_BRAND_PRODUCT_TARGET = 4/);
  assert.match(shelves, /IntersectionObserver/);

  const homepageStart = nativeStore.indexOf("export async function fetchHomepageProducts");
  const homepageEnd = nativeStore.indexOf("export async function fetchBrandVendors", homepageStart);
  assert.ok(homepageStart >= 0 && homepageEnd > homepageStart);
  assert.doesNotMatch(nativeStore.slice(homepageStart, homepageEnd), /loadSnapshot/);

  const newestStart = nativeStore.indexOf("export async function fetchNewestProducts");
  const newestEnd = nativeStore.indexOf("export async function fetchBestSellingProducts", newestStart);
  assert.ok(newestStart >= 0 && newestEnd > newestStart);
  assert.doesNotMatch(nativeStore.slice(newestStart, newestEnd), /loadSnapshot/);

  const bestStart = newestEnd;
  const bestEnd = nativeStore.indexOf("export async function fetchProductsByVendor", bestStart);
  assert.ok(bestStart >= 0 && bestEnd > bestStart);
  assert.doesNotMatch(nativeStore.slice(bestStart, bestEnd), /loadSnapshot/);

  const vendorStart = bestEnd;
  const vendorEnd = nativeStore.indexOf("export async function fetchAllProductsByVendor", vendorStart);
  assert.ok(vendorStart >= 0 && vendorEnd > vendorStart);
  assert.doesNotMatch(nativeStore.slice(vendorStart, vendorEnd), /loadSnapshot/);

  assert.match(homeSections, /productsByHandlesQueryOptions/);
  assert.match(homeSections, /handles\.slice\(0, 6\)/);
});

test("global navigation uses lightweight facets instead of the full catalog snapshot", async () => {
  const [queries, header, menu, nativeStore] = await Promise.all([
    read("src/lib/queries.ts"),
    read("src/components/SiteHeader.tsx"),
    read("src/components/MobileMenu.tsx"),
    read("src/lib/nativeStore.ts"),
  ]);

  assert.match(queries, /navigationCatalogQueryOptions/);
  assert.match(queries, /fetchNavigationCatalogFacets/);
  assert.match(header, /navigationCatalogQueryOptions/);
  assert.match(menu, /navigationCatalogQueryOptions/);
  assert.doesNotMatch(header, /catalogQueryOptions/);
  assert.doesNotMatch(menu, /catalogQueryOptions/);

  const start = nativeStore.indexOf("export async function fetchNavigationCatalogFacets");
  const end = nativeStore.indexOf("export async function fetchProductByHandle", start);
  assert.ok(start >= 0 && end > start);
  const navigationRead = nativeStore.slice(start, end);
  assert.doesNotMatch(navigationRead, /store_product_variants|store_product_images/);
  assert.doesNotMatch(navigationRead, /STOREFRONT_VARIANT_SELECT|STOREFRONT_IMAGE_SELECT/);
  assert.match(navigationRead, /STOREFRONT_NAVIGATION_COLLECTION_SELECT/);
  assert.match(navigationRead, /STOREFRONT_NAVIGATION_COLLECTION_LINK_SELECT/);
  assert.doesNotMatch(navigationRead, /\.order\("sort_order"/);
});

test("native cart keeps local totals and native checkout", async () => {
  const [store, drawer, productRoute] = await Promise.all([
    read("src/stores/cartStore.ts"),
    read("src/components/CartDrawer.tsx"),
    read("src/routes/product.$handle.tsx"),
  ]);
  assert.match(store, /function localCartState/);
  assert.match(store, /syncCart:\s*async \(\) => undefined/);
  assert.match(drawer, /href="\/cart"/);
  assert.doesNotMatch(drawer, /checkoutShopify|getCheckoutUrl|myshopify/);
  assert.match(productRoute, /window\.location\.assign\("\/cart"\)/);
});

test("server blocks Shopify runtime secrets and applies hardened browser headers", async () => {
  const [server, csp] = await Promise.all([
    read("src/server.ts"),
    read("src/lib/contentSecurityPolicy.ts"),
  ]);
  assert.doesNotMatch(server, /SHOPIFY_STOREFRONT/);
  assert.match(server, /MAX_REQUEST_BYTES/);
  assert.match(server, /RATE_LIMIT_MAX_MUTATIONS/);
  assert.match(server, /Cross-site mutation blocked/);
  assert.doesNotMatch(csp, /connect-src[^\n]*myshopify|form-action[^\n]*myshopify|frame-src[^\n]*myshopify|checkout\.shopify\.com/);
  assert.match(csp, /frame-ancestors 'self'/);
});

test("secret environment files and private keys cannot be committed accidentally", async () => {
  const gitignore = await read(".gitignore");
  assert.match(gitignore, /^\.env$/m);
  assert.match(gitignore, /^\.env\.\*$/m);
  assert.match(gitignore, /^!\.env\.example$/m);
  assert.match(gitignore, /^\*\.pem$/m);
  assert.match(gitignore, /^\*\.key$/m);
});
