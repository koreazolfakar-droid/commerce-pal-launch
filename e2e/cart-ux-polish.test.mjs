import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const cart = await readFile(new URL("../src/routes/cart.tsx", import.meta.url), "utf8");
const checkout = await readFile(
  new URL("../src/components/CheckoutDetailsForm.tsx", import.meta.url),
  "utf8",
);

test("cart keeps the purchase flow compact and visible", () => {
  assert.match(cart, /reviewStep/);
  assert.match(cart, /deliveryStep/);
  assert.match(cart, /whatsappStep/);
  assert.match(cart, /Fast delivery/);
  assert.match(cart, /Protected order/);
  assert.match(cart, /After order save/);
});

test("cart summary remains sticky on desktop and links directly to checkout", () => {
  assert.match(cart, /lg:sticky lg:top-24/);
  assert.match(cart, /href="#whatsapp-checkout"/);
  assert.match(cart, /const grandTotal = subtotal \+ deliveryFee/);
});

test("checkout shows the reviewed total in its header and primary action", () => {
  assert.match(checkout, /const checkoutTotal = total \+ deliveryFee/);
  assert.match(checkout, /formatPrice\(checkoutTotal, currency\)/);
  assert.match(checkout, /Step 2 of 3/);
  assert.match(checkout, /saved before opening WhatsApp/i);
});
