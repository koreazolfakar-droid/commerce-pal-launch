import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const facade = fs.readFileSync("src/lib/storefrontData.ts", "utf8");
const queries = fs.readFileSync("src/lib/queries.ts", "utf8");
const productRoute = fs.readFileSync("src/routes/product.$handle.tsx", "utf8");
const storeTypes = fs.readFileSync("src/lib/storeTypes.ts", "utf8");

test("public storefront resolves through Supabase-native data facade", () => {
  assert.match(queries, /from "@\/lib\/storefrontData"/);
  assert.match(facade, /from "@\/lib\/nativeStore"/);
  assert.doesNotMatch(facade, /withShopifyFallback|fetchShopify|storefrontApiRequest/);
});

test("canonical storefront types are Supabase-native with no Shopify compatibility facade", () => {
  assert.match(storeTypes, /export interface StoreProduct/);
  assert.match(storeTypes, /export interface StoreCollection/);
  assert.doesNotMatch(storeTypes, /Shopify|GraphQL|STOREFRONT_URL|ACCESS_TOKEN/);
  assert.equal(fs.existsSync("src/lib/shopify.ts"), false);
});

test("storefront path cannot introduce Shopify Admin or Storefront credentials", () => {
  for (const source of [facade, queries, productRoute, storeTypes]) {
    assert.doesNotMatch(source, /SHOPIFY_ADMIN_API_TOKEN|SHOPIFY_STOREFRONT_TOKEN|X-Shopify-Access-Token|admin\/api/i);
  }
});
