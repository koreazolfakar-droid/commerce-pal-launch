import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const cart = await readFile(new URL("../src/routes/cart.tsx", import.meta.url), "utf8");
const checkout = await readFile(
  new URL("../src/components/CheckoutDetailsForm.tsx", import.meta.url),
  "utf8",
);

test("cart uses compact responsive sizing from small phones through desktop", () => {
  assert.match(cart, /max-w-\[72rem\]/);
  assert.match(cart, /h-\[5\.25rem\] w-\[5\.25rem\]/);
  assert.match(cart, /xl:grid-cols-\[minmax\(0,1fr\)_22\.5rem\]/);
  assert.match(cart, /lg:top-\[5\.75rem\]/);
});

test("mobile cart uses a clean full-width sticky checkout action without a repeated total", () => {
  assert.match(cart, /bottom-\[calc\(4\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(cart, /data-testid="mobile-cart-checkout-bar"/);
  assert.match(cart, /max-w-md/);
  assert.match(cart, /min-h-12 w-full rounded-xl/);
  assert.match(cart, /Continue to checkout/);
  assert.doesNotMatch(
    cart,
    /data-testid="mobile-cart-checkout-bar"[\s\S]*?\{copy\.finalTotal\}[\s\S]*?\{formatPrice\(grandTotal, currency\)\}/,
  );
  assert.doesNotMatch(cart, /snap-x snap-mandatory/);
  assert.doesNotMatch(cart, /min-w-\[9\.75rem\]/);
});

test("cart quantity controls are locked while a cart mutation is in progress", () => {
  const disabledMatches = cart.match(/disabled=\{isLoading\}/g) ?? [];
  assert.ok(disabledMatches.length >= 3);
});

test("checkout honors safe-area spacing and responsive compact controls", () => {
  assert.match(checkout, /env\(safe-area-inset-bottom\)/);
  assert.match(checkout, /min-\[390px\]:min-h-14/);
  assert.match(checkout, /sm:min-h-12/);
  assert.match(checkout, /h-36 w-full border-0 min-\[390px\]:h-40 sm:h-48/);
});
