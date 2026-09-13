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
    const page = await browser.newPage({
      viewport: { width: testCase.width, height: testCase.height },
    });

    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="home-hero"]').waitFor({ state: "visible" });

    const metrics = await page.locator('[data-testid="home-hero"]').evaluate((element) => {
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
    assert.ok(
      metrics.right <= metrics.viewportWidth + 1,
      `${testCase.name}: hero exceeds viewport width`,
    );
    assert.ok(
      metrics.scrollWidth <= metrics.viewportWidth,
      `${testCase.name}: page has horizontal overflow`,
    );

    const mediaBox = await page.locator('[data-testid="home-hero-media"]').boundingBox();
    assert.ok(mediaBox, `${testCase.name}: hero media is missing`);

    if (testCase.mobile) {
      const ratio = metrics.height / metrics.width;
      assert.ok(ratio > 0.55 && ratio < 0.575, `${testCase.name}: hero is not 16:9`);
      assert.ok(
        Math.abs(mediaBox.width - metrics.width) <= 2,
        `${testCase.name}: media width does not match hero`,
      );
      assert.ok(
        Math.abs(mediaBox.height - metrics.height) <= 2,
        `${testCase.name}: media height does not match hero`,
      );

      const mobileControlsVisible = await page
        .locator('[data-testid="home-hero-mobile-controls"]')
        .isVisible();
      const dotsVisible = await page.locator('[data-testid="home-hero-dots"]').isVisible();
      const desktopContentVisible = await page.locator('[data-testid="home-hero-content"]').isVisible();

      assert.equal(mobileControlsVisible, true, `${testCase.name}: mobile CTA is hidden`);
      assert.equal(dotsVisible, true, `${testCase.name}: pagination dots are hidden`);
      assert.equal(desktopContentVisible, false, `${testCase.name}: desktop content leaks into mobile`);
    } else {
      assert.ok(metrics.height >= 400, `${testCase.name}: desktop hero became too short`);
      assert.equal(
        await page.locator('[data-testid="home-hero-content"]').isVisible(),
        true,
        `${testCase.name}: desktop hero content is hidden`,
      );
      assert.equal(
        await page.locator('[data-testid="home-hero-mobile-controls"]').isVisible(),
        false,
        `${testCase.name}: mobile controls leak into desktop`,
      );
    }

    console.log(
      `PASS ${testCase.name}: hero ${Math.round(metrics.width)}x${Math.round(metrics.height)}, overflow OK`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
