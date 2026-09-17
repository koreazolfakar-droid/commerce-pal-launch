import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const hybrid = fs.readFileSync("src/lib/hybridStore.ts", "utf8");
const nativeStore = fs.readFileSync("src/lib/nativeStore.ts", "utf8");
const facade = fs.readFileSync("src/lib/storefrontFacade.ts", "utf8");
const queries = fs.readFileSync("src/lib/queries.ts", "utf8");
const productRoute = fs.readFileSync("src/routes/product.$handle.tsx", "utf8");
const tsconfig = fs.readFileSync("tsconfig.json", "utf8");

test("public storefront data reads resolve directly to Shopify", () => {
  assert.match(queries, /from "@\/lib\/shopify"/);
  assert.doesNotMatch(queries, /from "@\/lib\/hybridStore"|from "@\/lib\/nativeStore"/);
  assert.match(productRoute, /from "@\/lib\/shopify"/);
});

test("the @/lib/shopify alias no longer redirects through the hybrid facade", () => {
  const config = JSON.parse(tsconfig);
  assert.equal(config.compilerOptions.paths["@/lib/shopify"], undefined);
  assert.deepEqual(config.compilerOptions.paths["@/*"], ["./src/*"]);
});

test("legacy hybrid and native implementations are isolated compatibility code", () => {
  assert.match(facade, /export \* from "\.\/shopify"/);
  assert.match(facade, /from "\.\/hybridStore"/);
  assert.match(hybrid, /import \* as nativeStore from "@\/lib\/nativeStore"/);
  assert.match(nativeStore, /store_products/);

  // These files may remain for dashboard migration/history, but the active
  // storefront query layer must not import them.
  assert.doesNotMatch(queries, /hybridStore|nativeStore|storefrontFacade/);
});

test("Shopify-only storefront path does not introduce Admin API writes or secrets", () => {
  for (const source of [queries, productRoute]) {
    assert.doesNotMatch(source, /SHOPIFY_ADMIN_API_TOKEN/);
    assert.doesNotMatch(source, /X-Shopify-Access-Token/);
    assert.doesNotMatch(source, /admin\/api/i);
    assert.doesNotMatch(source, /\.insert\(|\.update\(|\.delete\(/);
  }
});
