import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";
const cases = [
  { width: 320, height: 568, mobile: true, name: "320x568" },
  { width: 390, height: 844, mobile: true, name: "390x844" },
  { width: 430, height: 932, mobile: true, name: "430x932" },
  { width: 1440, height: 900, mobile: false, name: "1440x900" },
];

const browser = await chromium.launch({ headless: true });

try {
  for (const testCase of cases) {
    const page = await browser.newPage({ viewport: { width: testCase.width, height: testCase.height } });
    await page.goto(baseURL, { waitUntil: "load" });
    await page.waitForTimeout(350);

    const hero = page.locator('[data-testid="home-hero"]');
    await hero.waitFor({ state: "visible" });

    const metrics = await hero.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        viewportWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    assert.ok(metrics.left >= -1, `${testCase.name}: hero starts outside viewport`);
    assert.ok(metrics.right <= metrics.viewportWidth + 1, `${testCase.name}: hero exceeds viewport`);
    assert.ok(metrics.scrollWidth <= metrics.viewportWidth, `${testCase.name}: horizontal overflow`);
    assert.equal(await hero.getAttribute("data-hero-source"), "shopify-collection");
    assert.equal(await hero.getAttribute("data-hero-handle"), "homepage-hero");
    assert.equal(await hero.locator('a[href^="/product/"]').count(), 0);
    assert.equal(await hero.locator('[data-testid="home-hero-content"]').count(), 0);
    assert.equal(await hero.locator('[data-testid="home-hero-mobile-controls"]').count(), 0);

    const image = hero.locator("img");
    await image.waitFor({ state: "visible" });
    assert.equal(await image.getAttribute("alt"), "Merchant artwork homepage-hero");

    const mediaBox = await page.locator('[data-testid="home-hero-media"]').boundingBox();
    assert.ok(mediaBox, `${testCase.name}: hero media is missing`);
    assert.ok(Math.abs(mediaBox.width - metrics.width) <= 2, `${testCase.name}: media width mismatch`);
    assert.ok(Math.abs(mediaBox.height - metrics.height) <= 2, `${testCase.name}: media height mismatch`);

    if (testCase.mobile) {
      const ratio = metrics.height / metrics.width;
      assert.ok(ratio > 0.55 && ratio < 0.575, `${testCase.name}: mobile hero is not 16:9`);
    } else {
      assert.ok(metrics.height >= 400, `${testCase.name}: desktop hero became too short`);
    }

    console.log(`PASS ${testCase.name}: independent hero, no product content, overflow OK`);
    await page.close();
  }
} finally {
  await browser.close();
}
