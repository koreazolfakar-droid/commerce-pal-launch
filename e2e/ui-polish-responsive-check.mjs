import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";
const responsiveCases = [
  { width: 320, height: 700, lang: "en", theme: "light" },
  { width: 360, height: 780, lang: "en", theme: "light" },
  { width: 375, height: 812, lang: "en", theme: "light" },
  { width: 390, height: 844, lang: "en", theme: "light" },
  { width: 412, height: 915, lang: "en", theme: "light" },
  { width: 430, height: 932, lang: "en", theme: "light" },
  { width: 768, height: 1024, lang: "en", theme: "light" },
  { width: 1440, height: 1000, lang: "en", theme: "light" },
  { width: 320, height: 700, lang: "ar", theme: "dark" },
  { width: 390, height: 844, lang: "ar", theme: "dark" },
  { width: 768, height: 1024, lang: "ar", theme: "dark" },
  { width: 1440, height: 1000, lang: "ar", theme: "dark" },
];

const criticalRoutes = [
  "/",
  "/shop",
  "/product/fixture-phone-1",
  "/search",
  "/cart",
  "/wishlist",
  "/compare",
  "/categories",
  "/brands",
];

const browser = await chromium.launch({ headless: true });

async function configure(page, lang, theme) {
  await page.addInitScript(
    ({ language, selectedTheme }) => {
      localStorage.setItem("space-cell-language", language);
      localStorage.setItem("space-cell:theme", selectedTheme);
    },
    { language: lang, selectedTheme: theme },
  );
}

async function assertViewportHealth(page, label) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    bodyWidth: document.body.getBoundingClientRect().width,
    dir: document.documentElement.dir,
    theme: document.documentElement.getAttribute("data-theme"),
  }));

  assert.ok(
    metrics.scrollWidth <= metrics.innerWidth + 1,
    `${label}: horizontal overflow ${metrics.scrollWidth}px > ${metrics.innerWidth}px`,
  );
  assert.ok(metrics.bodyWidth <= metrics.innerWidth + 1, `${label}: body exceeds viewport`);

  const main = page.locator("main").first();
  if (await main.count()) {
    const mainBox = await main.boundingBox();
    if (mainBox) {
      assert.ok(mainBox.x >= -1, `${label}: main starts outside viewport`);
      assert.ok(
        mainBox.x + mainBox.width <= metrics.innerWidth + 1,
        `${label}: main extends outside viewport`,
      );
    }
  }

  const headerControls = page.locator("header :is(button,a):visible");
  const controlCount = Math.min(await headerControls.count(), 14);
  for (let index = 0; index < controlCount; index += 1) {
    const box = await headerControls.nth(index).boundingBox();
    if (!box) continue;
    assert.ok(box.x >= -1, `${label}: header control ${index} starts outside viewport`);
    assert.ok(
      box.x + box.width <= metrics.innerWidth + 1,
      `${label}: header control ${index} exceeds viewport`,
    );
  }

  const card = page
    .locator(".sc-product-card, .market-product-card, .product-list-card")
    .filter({ visible: true })
    .first();
  if (await card.count()) {
    const cardBox = await card.boundingBox();
    assert.ok(cardBox, `${label}: visible product card has no layout box`);
    assert.ok((cardBox?.width ?? 0) >= 72, `${label}: product card collapsed too narrow`);

    const title = card.locator(".product-card-title").first();
    if (await title.count()) {
      const titleMetrics = await title.evaluate((element) => ({
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
        height: element.getBoundingClientRect().height,
      }));
      assert.ok(
        titleMetrics.scrollWidth <= titleMetrics.clientWidth + 2 || titleMetrics.height > titleMetrics.lineHeight,
        `${label}: product title clips instead of wrapping`,
      );
    }

    const primary = card.locator(".product-card-primary-action:visible").first();
    if (await primary.count()) {
      const buttonBox = await primary.boundingBox();
      assert.ok(buttonBox, `${label}: primary product action has no layout box`);
      assert.ok((buttonBox?.height ?? 0) >= 36, `${label}: primary product action is too short`);
      assert.ok(
        (buttonBox?.x ?? 0) >= (cardBox?.x ?? 0) - 1 &&
          (buttonBox?.x ?? 0) + (buttonBox?.width ?? 0) <=
            (cardBox?.x ?? 0) + (cardBox?.width ?? 0) + 1,
        `${label}: primary product action escapes its card`,
      );
    }
  }
}

try {
  for (const testCase of responsiveCases) {
    const page = await browser.newPage({ viewport: { width: testCase.width, height: testCase.height } });
    await configure(page, testCase.lang, testCase.theme);

    for (const route of ["/", "/shop"]) {
      const response = await page.goto(`${baseURL}${route}`, { waitUntil: "load" });
      assert.ok(response && response.status() < 400, `${route}: failed to load`);
      await page.waitForTimeout(180);

      const expectedDir = testCase.lang === "ar" ? "rtl" : "ltr";
      assert.equal(
        await page.locator("html").getAttribute("dir"),
        expectedDir,
        `${testCase.width}px ${route}: direction mismatch`,
      );
      assert.equal(
        await page.locator("html").getAttribute("data-theme"),
        testCase.theme,
        `${testCase.width}px ${route}: theme mismatch`,
      );

      await assertViewportHealth(
        page,
        `${testCase.width}px ${testCase.lang}/${testCase.theme} ${route}`,
      );
    }

    console.log(
      `PASS responsive ${testCase.width}px ${testCase.lang}/${testCase.theme}: home + shop`,
    );
    await page.close();
  }

  const routePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await configure(routePage, "en", "light");
  const pageErrors = [];
  routePage.on("pageerror", (error) => pageErrors.push(error.message));

  for (const route of criticalRoutes) {
    const response = await routePage.goto(`${baseURL}${route}`, { waitUntil: "load" });
    assert.ok(response && response.status() < 400, `${route}: failed route smoke`);
    await routePage.waitForTimeout(120);
    await assertViewportHealth(routePage, `critical route ${route}`);
  }

  assert.deepEqual(pageErrors, [], `page errors detected: ${pageErrors.join(" | ")}`);
  await routePage.close();
  console.log("PASS critical storefront routes: no overflow or page errors");
} finally {
  await browser.close();
}
