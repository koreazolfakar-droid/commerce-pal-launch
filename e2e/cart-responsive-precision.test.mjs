import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const cart = await readFile(new URL("../src/routes/cart.tsx", import.meta.url), "utf8");
const checkout = await readFile(
  new URL("../src/components/CheckoutDetailsForm.tsx", import.meta.url),
  "utf8",
);

test("cart uses compact responsive sizing from small phones through desktop", () => {
  assert.match(cart, /max-w-\[74rem\]/);
  assert.match(cart, /min-\[390px\]:h-\[5\.25rem\]/);
  assert.match(cart, /sm:grid-cols-3/);
  assert.match(cart, /xl:grid-cols-\[minmax\(0,1fr\)_22\.5rem\]/);
  assert.match(cart, /lg:top-\[5\.75rem\]/);
});

test("mobile benefits scroll instead of crushing three cards into narrow columns", () => {
  assert.match(cart, /snap-x snap-mandatory/);
  assert.match(cart, /min-w-\[9\.75rem\]/);
  assert.match(cart, /\[scrollbar-width:none\]/);
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
