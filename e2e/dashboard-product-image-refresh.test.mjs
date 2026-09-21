import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [products, variants, nativeStore, router] = await Promise.all([
  read("src/dashboard/components/products/ProductMediaManager.tsx"),
  read("src/dashboard/components/products/ProductVariantManager.tsx"),
  read("src/lib/nativeStore.ts"),
  read("src/router.tsx"),
]);

test("adjusting an existing product image persists immediately after editor save", () => {
  const start = products.indexOf('title: "Adjust existing product image"');
  assert.notEqual(start, -1);
  const block = products.slice(start, start + 1200);

  assert.match(block, /void replace\(\s*edited,\s*image,/);
  assert.match(block, /Image adjustment saved\. Storefront refresh requested\./);
  assert.doesNotMatch(block, /setPendingReplaceFile\(edited\)/);
});

test("adjusting an existing variant image persists immediately after editor save", () => {
  const start = variants.indexOf('title: "Adjust existing variant image"');
  assert.notEqual(start, -1);
  const block = variants.slice(start, start + 1200);

  assert.match(block, /void upload\(\s*edited,/);
  assert.match(block, /Variant image adjustment saved\. Storefront refresh requested\./);
  assert.doesNotMatch(block, /setPendingImageFile\(edited\)/);
});

test("dashboard catalogue mutations broadcast a storefront refresh across tabs", () => {
  assert.match(nativeStore, /space-call-storefront-refresh-v1/);
  assert.match(nativeStore, /space-call:storefront-refresh/);
  assert.match(nativeStore, /localStorage\.setItem/);
  assert.match(nativeStore, /window\.dispatchEvent\(new Event\(STOREFRONT_REFRESH_EVENT\)\)/);
  assert.match(nativeStore, /window\.addEventListener\("storage", storageRefresh\)/);
  assert.match(nativeStore, /invalidateNativeStoreCache\(\{ broadcast: false \}\)/);
});

test("storefront query cache refetches Supabase data when dashboard signals a change", () => {
  assert.match(router, /subscribeStorefrontRefresh/);
  assert.match(router, /queryClient\.invalidateQueries/);
  assert.match(router, /query\.queryKey\[0\] === "supabase"/);
});
