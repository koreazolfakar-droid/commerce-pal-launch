import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const darkTheme = fs.readFileSync("src/dark-black.css", "utf8");
const productImage = fs.readFileSync("src/components/ProductImage.tsx", "utf8");
const productCard = fs.readFileSync("src/components/ProductCard.tsx", "utf8");
const compactProductCard = fs.readFileSync("src/components/CompactProductCard.tsx", "utf8");

function lightness(token) {
  const match = darkTheme.match(new RegExp(`--${token}:\\s*oklch\\((0(?:\\.\\d+)?|1(?:\\.0+)?)\\s`));
  assert.ok(match, `Missing or non-oklch token --${token}`);
  return Number(match[1]);
}

test("storefront dark surfaces preserve a clear elevation hierarchy", () => {
  const background = lightness("background");
  const surface = lightness("surface");
  const card = lightness("card");
  const popover = lightness("popover");

  assert.ok(background < surface, "surface must be lighter than page background");
  assert.ok(surface < card, "card must be lighter than surface");
  assert.ok(card < popover, "popover must be lighter than card");
});

test("storefront dark theme is not pure black", () => {
  assert.doesNotMatch(darkTheme, /--background:\s*oklch\(0\s+0\s+0\)/);
});

test("product media uses the semantic image-stage token", () => {
  assert.match(productImage, /bg-image-stage/);
  assert.doesNotMatch(productImage, /bg-white/);

  for (const source of [productCard, compactProductCard]) {
    assert.doesNotMatch(source, /bg-white/);
  }
});
