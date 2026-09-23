import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const cart = await readFile(new URL("../src/routes/cart.tsx", import.meta.url), "utf8");
const checkoutRoute = await readFile(
  new URL("../src/routes/checkout.tsx", import.meta.url),
  "utf8",
);
const checkout = await readFile(
  new URL("../src/components/CheckoutDetailsForm.tsx", import.meta.url),
  "utf8",
);
const settings = await readFile(
  new URL("../src/dashboard/data/settings.ts", import.meta.url),
  "utf8",
);
const migration = await readFile(
  new URL("../supabase/migrations/20260921061500_default_delivery_fee_2.sql", import.meta.url),
  "utf8",
);

test("cart reads the public dashboard delivery fee and shows it in the total", () => {
  assert.match(cart, /cmsQueryOptions\(\)/);
  assert.match(cart, /settings\["delivery_fee"\]/);
  assert.match(cart, /const grandTotal = subtotal \+ deliveryFee/);
  assert.match(cart, /Fast delivery across Lebanon/);
});

test("checkout route passes the same delivery fee into the existing secure order form", () => {
  assert.match(checkoutRoute, /settings\["delivery_fee"\]/);
  assert.match(checkoutRoute, /deliveryFee=\{deliveryFee\}/);
  assert.match(checkout, /deliveryFee: number/);
  assert.match(checkout, /createdOrder\?\.shipping_total \?\? deliveryFee/);
  assert.match(checkout, /deliveryFee: invoiceDeliveryFee/);
  assert.match(checkout, /createdOrder\?\.total \?\? invoiceSubtotal \+ invoiceDeliveryFee/);
});

test("dashboard defaults new delivery configuration to USD 2.00", () => {
  assert.match(settings, /deliveryFee: "2\.00"/);
  assert.match(settings, /key: "delivery_fee"/);
});

test("migration seeds the live default delivery fee at USD 2.00", () => {
  assert.match(migration, /'delivery_fee'/);
  assert.match(migration, /'2\.00'/);
  assert.match(migration, /on conflict \(key\) do update/i);
});
