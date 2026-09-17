import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const queries = fs.readFileSync("src/lib/queries.ts", "utf8");
const productRoute = fs.readFileSync("src/routes/product.$handle.tsx", "utf8");
const tsconfig = fs.readFileSync("tsconfig.json", "utf8");

test("public storefront data reads resolve directly to Shopify", () => {
  assert.match(queries, /from "@\/lib\/shopify"/);
  assert.doesNotMatch(queries, /from "@\/lib\/hybridStore"|from "@\/lib\/nativeStore"/);
  assert.match(productRoute, /from "@\/lib\/shopify"/);
});

test("the @/lib/shopify alias points at the real Shopify module", () => {
  const config = JSON.parse(tsconfig);
  assert.equal(config.compilerOptions.paths["@/lib/shopify"], undefined);
  assert.deepEqual(config.compilerOptions.paths["@/*"], ["./src/*"]);
});

test("Shopify-only storefront path does not introduce Admin API writes or secrets", () => {
  for (const source of [queries, productRoute]) {
    assert.doesNotMatch(source, /SHOPIFY_ADMIN_API_TOKEN/);
    assert.doesNotMatch(source, /X-Shopify-Access-Token/);
    assert.doesNotMatch(source, /admin\/api/i);
    assert.doesNotMatch(source, /\.insert\(|\.update\(|\.delete\(/);
  }
});
