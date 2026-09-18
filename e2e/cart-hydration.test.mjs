import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("native cart mutations share a single persisted hydration gate", async () => {
  const source = await read("src/stores/cartStore.ts");

  assert.match(source, /let cartHydrationPromise: Promise<void> \| null = null/);
  assert.match(source, /export function hydrateCartStore\(\): Promise<void>/);
  assert.match(source, /cartHydrationPromise = Promise\.resolve\(useCartStore\.persist\.rehydrate\(\)\)/);

  for (const mutation of ["addItem", "updateQuantity", "removeItem", "syncCart"]) {
    const start = source.indexOf(`${mutation}: async`);
    assert.notEqual(start, -1, `${mutation} implementation remains defined`);
    const window = source.slice(start, start + 700);
    assert.match(window, /await hydrateCartStore\(\)/, `${mutation} waits for persisted hydration`);
  }
});

test("React hydration hook reuses the cart hydration gate", async () => {
  const source = await read("src/hooks/usePersistedStoreHydration.ts");

  assert.match(source, /import \{ hydrateCartStore \} from "@\/stores\/cartStore"/);
  assert.match(source, /hydrateCartStore\(\)/);
  assert.doesNotMatch(source, /useCartStore\.persist\.rehydrate\(\)/);
});
