import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    else if (/\.(?:ts|tsx|css)$/.test(entry.name)) files.push(path);
  }
  return files;
}

test("storefront source is fully detached from Shopify", async () => {
  assert.equal(existsSync("src/lib/shopify.ts"), false);

  const files = await sourceFiles("src");
  assert.ok(files.length > 0);

  for (const path of files) {
    const source = await readFile(path, "utf8");
    assert.doesNotMatch(source, /@\/lib\/shopify/);
    assert.doesNotMatch(source, /\bShopify(?:Product|Collection|Brand|Showcase)\b/);
    assert.doesNotMatch(source, /shopify/i);
  }
});

test("canonical storefront types remain available from storeTypes", async () => {
  const source = await readFile("src/lib/storeTypes.ts", "utf8");
  assert.match(source, /export interface StoreProduct/);
  assert.match(source, /export interface StoreCollection/);
});
