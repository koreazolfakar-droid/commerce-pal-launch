import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const queries = fs.readFileSync("src/lib/queries.ts", "utf8");
const productRoute = fs.readFileSync("src/routes/product.$handle.tsx", "utf8");
const tsconfig = fs.readFileSync("tsconfig.json", "utf8");

test("public storefront catalogue reads resolve through the neutral facade", () => {
  assert.match(queries, /from "@\/lib\/storefrontFacade"/);
  assert.doesNotMatch(queries, /from "@\/lib\/shopify"/);
  assert.match(productRoute, /from "@\/lib\/shopify"/);
});

test("legacy Shopify type imports are not redirected through tsconfig aliases", () => {
  const config = JSON.parse(tsconfig);
  assert.equal(config.compilerOptions.paths["@/lib/shopify"], undefined);
  assert.deepEqual(config.compilerOptions.paths["@/*"], ["./src/*"]);
});

test("provider-neutral storefront path does not introduce Shopify Admin writes or secrets", () => {
  for (const source of [queries, productRoute]) {
    assert.doesNotMatch(source, /SHOPIFY_ADMIN_API_TOKEN/);
    assert.doesNotMatch(source, /X-Shopify-Access-Token/);
    assert.doesNotMatch(source, /admin\/api/i);
    assert.doesNotMatch(source, /\.insert\(|\.update\(|\.delete\(/);
  }
});
