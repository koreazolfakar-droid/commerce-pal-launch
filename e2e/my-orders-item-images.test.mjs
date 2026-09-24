import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const edge = await readFile(
  new URL("../supabase/functions/customer-orders/index.ts", import.meta.url),
  "utf8",
);
const account = await readFile(
  new URL("../src/lib/customerAccount.ts", import.meta.url),
  "utf8",
);
const orders = await readFile(
  new URL("../src/routes/my-orders.tsx", import.meta.url),
  "utf8",
);

test("customer order items include the primary product image", () => {
  assert.match(edge, /from\("store_product_images"\)/);
  assert.match(edge, /order\("is_primary", \{ ascending: false \}\)/);
  assert.match(edge, /image_url:/);
  assert.match(account, /imageUrl: string/);
  assert.match(account, /imageUrl: text\(row\.image_url\)/);
});

test("My Orders item rows show image and quantity without a line price", () => {
  assert.match(orders, /item\.imageUrl/);
  assert.match(orders, /object-contain/);
  assert.match(orders, /×\{item\.quantity\}/);
  assert.doesNotMatch(orders, /formatMoney\(item\.lineTotal/);
  assert.match(orders, /PackageOpen/);
});
