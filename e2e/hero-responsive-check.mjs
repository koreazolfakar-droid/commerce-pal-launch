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
    assert.ok(
      metrics.right <= metrics.viewportWidth + 1,
      `${testCase.name}: hero exceeds viewport`,
    );
    assert.ok(
      metrics.scrollWidth <= metrics.viewportWidth,
      `${testCase.name}: horizontal overflow`,
    );
    const source = await hero.getAttribute("data-hero-source");
    assert.ok(
      source === "supabase-cms" || source === "placeholder",
      `${testCase.name}: unexpected hero source ${source}`,
    );

    const contentCount = await hero.locator('[data-testid="home-hero-content"]').count();
    if (source === "supabase-cms") {
      assert.equal(contentCount, 1, `${testCase.name}: CMS hero content missing`);
    } else {
      assert.equal(contentCount, 0, `${testCase.name}: placeholder should not render CMS content`);
    }

    const image = hero.locator("img");
    await image.waitFor({ state: "visible" });
    const alt = await image.getAttribute("alt");
    assert.ok(alt !== null, `${testCase.name}: hero image alt attribute missing`);

    const media = page.locator('[data-testid="home-hero-media"]');
    const mediaBox = await media.boundingBox();
    assert.ok(mediaBox, `${testCase.name}: hero media is missing`);
    assert.ok(
      Math.abs(mediaBox.width - metrics.width) <= 2,
      `${testCase.name}: media width mismatch`,
    );
    assert.ok(
      Math.abs(mediaBox.height - metrics.height) <= 2,
      `${testCase.name}: media height mismatch`,
    );

    if (source === "supabase-cms" && testCase.mobile) {
      const ratio = mediaBox.width / mediaBox.height;
      assert.ok(
        ratio >= 1.7 && ratio <= 1.85,
        `${testCase.name}: mobile CMS hero is not close to 16:9`,
      );
    } else if (source === "supabase-cms") {
      assert.ok(metrics.height >= 318, `${testCase.name}: desktop CMS hero became too short`);
      assert.ok(metrics.height <= 442, `${testCase.name}: desktop CMS hero became too tall`);
    } else if (testCase.mobile) {
      assert.ok(metrics.height >= 239, `${testCase.name}: mobile placeholder became too short`);
      assert.ok(metrics.height <= 321, `${testCase.name}: mobile placeholder became too tall`);
    } else {
      assert.ok(metrics.height >= 400, `${testCase.name}: desktop placeholder became too short`);
      assert.ok(metrics.height <= 500, `${testCase.name}: desktop placeholder became too tall`);
    }

    const before = page.url();
    await media.click({ position: { x: 8, y: 8 } });
    await page.waitForTimeout(100);
    assert.equal(page.url(), before, `${testCase.name}: hero media click changed route`);

    console.log(`PASS ${testCase.name}: responsive hero layout, CMS content and inert media click OK`);
    await page.close();
  }
} finally {
  await browser.close();
}
