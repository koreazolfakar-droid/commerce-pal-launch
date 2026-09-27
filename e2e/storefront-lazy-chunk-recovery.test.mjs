import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

const [helper, toaster, mobileTopBar, siteHeader, cartDrawer, desktopHeader, home, quickView] =
  await Promise.all([
    read("src/lib/lazyChunkRecovery.ts"),
    read("src/components/DeferredToaster.tsx"),
    read("src/components/MobileTopBar.tsx"),
    read("src/components/SiteHeader.tsx"),
    read("src/components/DeferredCartDrawer.tsx"),
    read("src/components/DeferredDesktopHeader.tsx"),
    read("src/routes/index.tsx"),
    read("src/components/product/QuickViewButton.tsx"),
  ]);

test("storefront lazy chunks recover once from a stale deployed asset", () => {
  assert.match(helper, /failed to fetch dynamically imported module/i);
  assert.match(helper, /importing a module script failed/i);
  assert.match(helper, /sessionStorage\.getItem\(storageKey\)/);
  assert.match(helper, /sessionStorage\.setItem\(storageKey, "1"\)/);
  assert.match(helper, /window\.location\.reload\(\)/);
  assert.match(helper, /sessionStorage\.removeItem\(storageKey\)/);
});

test("first storefront interaction cannot use an unguarded toaster chunk", () => {
  assert.match(toaster, /"pointerdown"/);
  assert.match(toaster, /importWithChunkRecovery\("toaster"/);
  assert.doesNotMatch(toaster, /lazy\(\(\) =>\s*import\(/);
});

test("storefront deferred UI and homepage sections use guarded lazy imports", () => {
  for (const source of [mobileTopBar, siteHeader, cartDrawer, desktopHeader, home, quickView]) {
    assert.match(source, /importWithChunkRecovery/);
    assert.doesNotMatch(source, /lazy\(\(\) =>\s*import\(/);
  }

  assert.match(mobileTopBar, /importWithChunkRecovery\("mobile-menu"/);
  assert.match(mobileTopBar, /importWithChunkRecovery\("mobile-category-rail"/);
  assert.match(mobileTopBar, /importWithChunkRecovery\("search-overlay"/);
  assert.match(home, /importWithChunkRecovery\("product-rail"/);
});
