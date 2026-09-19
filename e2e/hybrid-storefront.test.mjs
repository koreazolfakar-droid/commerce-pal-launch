import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const facade = fs.readFileSync("src/lib/storefrontData.ts", "utf8");
const queries = fs.readFileSync("src/lib/queries.ts", "utf8");
const productRoute = fs.readFileSync("src/routes/product.$handle.tsx", "utf8");
const compat = fs.readFileSync("src/lib/shopify.ts", "utf8");

test("public storefront resolves through Supabase-native data facade", () => {
  assert.match(queries, /from "@\/lib\/storefrontData"/);
  assert.match(facade, /from "@\/lib\/nativeStore"/);
  assert.doesNotMatch(facade, /withShopifyFallback|fetchShopify|storefrontApiRequest/);
});

test("legacy Shopify-named compatibility module contains types and pricing helpers only", () => {
  assert.match(compat, /export interface ShopifyProduct/);
  assert.match(compat, /from "@\/lib\/productPricing"/);
  assert.doesNotMatch(compat, /fetch\(|createServerFn|GraphQL|STOREFRONT_URL|ACCESS_TOKEN/);
});

test("storefront path cannot introduce Shopify Admin or Storefront credentials", () => {
  for (const source of [facade, queries, productRoute, compat]) {
    assert.doesNotMatch(source, /SHOPIFY_ADMIN_API_TOKEN|SHOPIFY_STOREFRONT_TOKEN|X-Shopify-Access-Token|admin\/api/i);
  }
});
