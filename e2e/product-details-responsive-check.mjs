import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { createStorefrontPage } from "./helpers/storefront-fixture-fetch.mjs";

const base = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const cases = [
  { width: 320, height: 720, language: "en", theme: "light" },
  { width: 390, height: 844, language: "en", theme: "light" },
  { width: 430, height: 932, language: "ar", theme: "dark" },
  { width: 768, height: 1024, language: "ar", theme: "light" },
  { width: 1440, height: 1000, language: "en", theme: "dark" },
];

try {
  for (const item of cases) {
    const page = await createStorefrontPage(browser, { viewport: { width: item.width, height: item.height } });
    const jsErrors = [];
    page.on("pageerror", (error) => jsErrors.push(error.message));
    await page.addInitScript(({ lang, theme }) => {
      localStorage.setItem("space-cell-language", lang);
      localStorage.setItem("space-cell:theme", theme);
    }, { lang: item.language, theme: item.theme });
    const response = await page.goto(base + "/product/fixture-phone-1", { waitUntil: "load" });
    assert.ok(response?.ok(), "Product route failed at " + item.width);
    const section = page.getByTestId("product-information");
    await section.waitFor({ state: "visible", timeout: 15000 });
    const expectedTitle = item.language === "ar" ? "معلومات المنتج" : "Product information";
    // SSR uses English, then the LanguageProvider restores the stored locale after hydration.
    await page.waitForFunction((lang) =>
      document.body.dataset.language === lang && document.documentElement.lang === lang,
      item.language,
    );
    await section.locator("h2").first().getByText(expectedTitle, { exact: true })
      .waitFor({ state: "visible", timeout: 10000 });
    const tabs = section.getByRole("tab");
    assert.ok(await tabs.count() >= 2, "Expected both product information tabs");
    assert.ok(await section.getByRole("tabpanel").first().isVisible(), "Description should be visible first");
    const specsTab = section.getByRole("tab", {
      name: item.language === "ar" ? "المواصفات التقنية" : "Specifications",
    });
    await specsTab.click();
    await page.getByTestId("product-specification-sheet").waitFor({ state: "visible" });
    const grid = page.getByTestId("product-specification-sheet");
    assert.ok((await grid.innerText()).includes("Samsung"), "Real brand spec is missing");
    const metrics = await page.evaluate(() => ({
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      tabsWidth: document.querySelector('[data-testid="product-information"]')?.getBoundingClientRect().width,
    }));
    assert.ok(metrics.scrollWidth <= metrics.width + 1,
      "Product information overflow at " + item.width + ": " + metrics.scrollWidth);
    assert.ok((metrics.tabsWidth ?? 0) <= metrics.width + 1);
    if (item.width < 640) {
      const purchase = await page.getByTestId("product-purchase-bar").boundingBox();
      const nav = await page.getByTestId("bottom-nav").boundingBox();
      assert.ok(purchase && nav && purchase.y + purchase.height <= nav.y + 1,
        "Sticky purchase bar overlaps navigation at " + item.width);
    }
    const recommendationHandles = new Set();
    for (const id of ["similar-products", "more-from-brand"]) {
      const sectionElement = page.locator('section[aria-labelledby="' + id + '"]');
      if (!(await sectionElement.count())) continue;
      const handles = await sectionElement.locator('[data-testid="product-card"]').evaluateAll((cards) =>
        cards.map((card) => card.querySelector('a[href^="/product/"]')?.getAttribute("href")).filter(Boolean));
      assert.equal(handles.length, new Set(handles).size, "Duplicate cards in " + id);
      for (const handle of handles) {
        assert.ok(!recommendationHandles.has(handle), "Duplicate product across sections: " + handle);
        assert.notEqual(handle, "/product/fixture-phone-1", "Current product appears in recommendations");
        recommendationHandles.add(handle);
      }
    }
    assert.equal(jsErrors.length, 0, jsErrors.join("\n"));
    await page.close();
    console.log("PASS product details: " + item.width + "px " + item.language + "/" + item.theme);
  }
} finally {
  await browser.close();
}
