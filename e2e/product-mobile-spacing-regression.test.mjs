import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("product page reserves mobile purchase-bar space only once", () => {
  const product = read("src/routes/product.$handle.tsx");
  const layout = read("src/components/StoreLayout.tsx");
  assert.match(layout, /productPurchaseBar \? "max-sm:pb-\[calc\(4\.75rem\+env\(safe-area-inset-bottom,0px\)\)\]"/);
  assert.match(product, /max-w-7xl px-4 py-4 pb-6 sm:px-5/);
  assert.doesNotMatch(product, /pb-\[calc\(var\(--mobile-nav-height\)\+/);
  assert.match(product, /data-testid="product-purchase-bar"/);
});

test("recommendation view controls stay in the heading without a separate empty row", () => {
  const product = read("src/components/product/ProductSuggestions.tsx");
  assert.match(product, /id="similar-products"[\s\S]*?<ProductViewToggle\s+mode=\{recommendationViewMode\}/);
  assert.match(product, /<ProductGrid\s+products=\{similar\}\s+viewMode=\{recommendationViewMode\}[\s\S]*?showViewToggle=\{false\}/);
  assert.match(product, /aria-labelledby="more-from-brand"/);
});

test("mobile footer uses compact section spacing without removing links", () => {
  const footer = read("src/components/SiteFooter.tsx");
  assert.match(footer, /px-4 py-8 sm:py-12/);
  assert.match(footer, /gap-6 sm:gap-10 md:grid-cols-2/);
  assert.match(footer, /<FooterColumn title=\{isAr \? "المتجر" : "Shop"\}/);
  assert.match(footer, /<FooterColumn title=\{isAr \? "الشركة" : "Company"\}/);
});
