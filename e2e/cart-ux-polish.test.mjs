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

test("cart is a dedicated shopping-bag view without checkout form clutter", () => {
  assert.match(cart, /Shopping bag/);
  assert.match(cart, /useCustomerAccount/);
  assert.match(cart, /selectedAddress/);
  assert.match(cart, /openAddressBook/);
  assert.match(cart, /to="\/checkout"/);
  assert.doesNotMatch(cart, /CheckoutDetailsForm/);
  assert.doesNotMatch(cart, /reviewStep/);
  assert.doesNotMatch(cart, /Protected order/);
  assert.doesNotMatch(cart, /After order save/);
});

test("cart keeps a compact sticky summary and mobile checkout action", () => {
  assert.match(cart, /lg:sticky lg:top-\[5\.75rem\]/);
  assert.match(cart, /bottom-\[calc\(4\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(cart, /const grandTotal = subtotal \+ deliveryFee/);
  assert.match(cart, /Continue to checkout/);
});

test("checkout moved to a dedicated route without changing order creation form", () => {
  assert.match(checkoutRoute, /createFileRoute\("\/checkout"\)/);
  assert.match(checkoutRoute, /CheckoutDetailsForm/);
  assert.match(checkoutRoute, /deliveryFee=\{deliveryFee\}/);
  assert.match(checkout, /const checkoutTotal = total \+ deliveryFee/);
  assert.match(checkout, /formatPrice\(checkoutTotal, currency\)/);
  assert.match(checkout, /Step 2 of 3/);
  assert.match(checkout, /before opening WhatsApp/i);
});
