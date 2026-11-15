import assert from "node:assert/strict";
import { expect } from "@playwright/test";
import { createStorefrontPage } from "./helpers/storefront-fixture-fetch.mjs";

/** Exercise the actual card, dialog, variant picker and persisted native cart. */
export async function runQuickViewChecks(browser, baseURL) {
  for (const item of [
    { width: 320, height: 720, lang: "ar", theme: "dark" },
    { width: 768, height: 1024, lang: "en", theme: "light" },
    { width: 1440, height: 1000, lang: "ar", theme: "dark" },
  ]) {
    const page = await createStorefrontPage(browser, {
      viewport: { width: item.width, height: item.height },
    });
    try {
      await page.addInitScript(({ lang, theme }) => {
        localStorage.setItem("space-cell-language", lang);
        localStorage.setItem("space-cell:theme", theme);
        localStorage.removeItem("space-call-cart");
      }, item);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const route of ["/", "/shop"]) {
        await page.goto(baseURL + route, { waitUntil: "load" });
        await page.waitForFunction((lang) => document.documentElement.lang === lang, item.lang);
        const card = page.getByTestId("product-card").filter({
          has: page.locator('a[href="/product/fixture-phone-1"]'),
        }).first();
        await card.waitFor({ state: "visible" });
        const trigger = card.getByRole("button", { name: /Quick view|معاينة سريعة/ });
        await expect(trigger).toHaveCount(1);
        await trigger.scrollIntoViewIfNeeded();
        await expect(trigger).toBeVisible();
        const before = await page.evaluate(() => ({ url: location.href, y: scrollY }));
        await trigger.click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole("heading", { name: /Samsung Fixture Phone/ })).toBeVisible();
        await expect(dialog.getByTestId("quick-view-stock")).toContainText(/In stock|متوفر/);
        const box = await dialog.boundingBox();
        assert.ok(box && box.x >= -1 && box.x + box.width <= item.width + 1,
          `Quick view overflows ${item.width}px ${route}`);
        assert.ok(box.y >= -1 && box.y + box.height <= item.height + 1,
          `Quick view exceeds viewport height ${item.width}px`);
        const quantity = dialog.getByRole("spinbutton");
        const add = dialog.getByRole("button", { name: /Add to cart|أضف إلى السلة/ });
        await quantity.fill("0");
        await expect(add).toBeDisabled();
        await quantity.fill("21");
        await expect(add).toBeDisabled();
        await quantity.fill("1");
        await expect(add).toBeEnabled();
        await dialog.getByRole("button", { name: /^(Storage|التخزين): 512GB$/ }).click();
        await expect(dialog.getByText("$599.00", { exact: true })).toBeVisible();
        // Escape must return focus and retain the same catalog URL/scroll position.
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
        assert.equal(page.url(), before.url);
        assert.ok(Math.abs(await page.evaluate(() => scrollY) - before.y) <= 2);
        await trigger.click();
        await expect(dialog).toBeVisible();
        await dialog.getByRole("button", { name: /^(Storage|التخزين): 512GB$/ }).click();
        await quantity.fill("2");
        await add.click();
        await expect(dialog).toHaveCount(0);
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("space-call-cart")));
        const selected = saved.state.items.find((entry) => entry.variantId === "fixture-variant-1-2");
        assert.equal(selected?.quantity, 2);
        assert.equal(Number(selected?.price.amount), 599);
        assert.deepEqual(selected?.selectedOptions, [{ name: "Storage", value: "512GB" }]);
        assert.equal(page.url(), before.url);
      }
      assert.deepEqual(errors, [], `Quick view JavaScript errors at ${item.width}px`);
      console.log(`PASS quick view: ${item.width}px ${item.lang} ${item.theme}`);
    } finally {
      await page.close();
    }
  }
}
