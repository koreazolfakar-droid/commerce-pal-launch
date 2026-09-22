import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";
const engineMode = process.env.UI_ENGINE ?? "all";
const suiteMode = process.env.UI_SUITE ?? "all";
const routeGroup = process.env.UI_ROUTE_GROUP ?? "all";

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

const supplementalCases = [
  { width: 390, height: 844, lang: "en", theme: "light" },
  { width: 390, height: 844, lang: "ar", theme: "dark" },
  { width: 1440, height: 1000, lang: "en", theme: "light" },
];

const criticalRouteGroups = {
  catalog: ["/", "/shop", "/search", "/categories", "/brands"],
  commerce: ["/product/fixture-phone-1", "/cart", "/wishlist", "/compare"],
};

const criticalRoutes =
  routeGroup === "all"
    ? [...criticalRouteGroups.catalog, ...criticalRouteGroups.commerce]
    : criticalRouteGroups[routeGroup] ?? [];

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

  const headerControls = page.locator(
    "header.sticky > div:first-child :is(button,a):visible",
  );
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
    .locator(".sc-product-card:visible, .market-product-card:visible, .product-list-card:visible")
    .first();

  if (!(await card.count())) return;

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
      titleMetrics.scrollWidth <= titleMetrics.clientWidth + 2 ||
        titleMetrics.height > titleMetrics.lineHeight,
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

async function assertLanguageAndTheme(page, testCase, label) {
  const expectedDir = testCase.lang === "ar" ? "rtl" : "ltr";
  assert.equal(
    await page.locator("html").getAttribute("dir"),
    expectedDir,
    `${label}: direction mismatch`,
  );
  assert.equal(
    await page.locator("html").getAttribute("data-theme"),
    testCase.theme,
    `${label}: theme mismatch`,
  );
}

async function runResponsiveSuite(browser) {
  for (const testCase of responsiveCases) {
    const page = await browser.newPage({
      viewport: { width: testCase.width, height: testCase.height },
    });
    await configure(page, testCase.lang, testCase.theme);

    try {
      for (const route of ["/", "/shop"]) {
        const response = await page.goto(`${baseURL}${route}`, { waitUntil: "load" });
        assert.ok(response && response.status() < 400, `${route}: failed to load`);
        await page.waitForTimeout(180);

        const label = `${testCase.width}px ${testCase.lang}/${testCase.theme} ${route}`;
        await assertLanguageAndTheme(page, testCase, label);
        await assertViewportHealth(page, label);
      }

      console.log(
        `PASS responsive ${testCase.width}px ${testCase.lang}/${testCase.theme}: home + shop`,
      );
    } finally {
      await page.close();
    }
  }
}

async function runCriticalRouteSuite(browser) {
  assert.ok(criticalRoutes.length > 0, `unknown route group: ${routeGroup}`);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await configure(page, "en", "light");
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    for (const route of criticalRoutes) {
      const response = await page.goto(`${baseURL}${route}`, { waitUntil: "load" });
      assert.ok(response && response.status() < 400, `${route}: failed route smoke`);
      await page.waitForTimeout(120);
      await assertViewportHealth(page, `critical route ${route}`);
    }

    assert.deepEqual(pageErrors, [], `page errors detected: ${pageErrors.join(" | ")}`);
    console.log(`PASS critical storefront routes (${routeGroup}): no overflow or page errors`);
  } finally {
    await page.close();
  }
}

async function runSupplementalSuite(engineName, browser) {
  for (const testCase of supplementalCases) {
    const page = await browser.newPage({
      viewport: { width: testCase.width, height: testCase.height },
    });
    await configure(page, testCase.lang, testCase.theme);
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    try {
      for (const route of ["/", "/shop", "/cart"]) {
        const response = await page.goto(`${baseURL}${route}`, { waitUntil: "load" });
        assert.ok(response && response.status() < 400, `${engineName} ${route}: failed to load`);
        await page.waitForTimeout(140);

        const label = `${engineName} ${testCase.width}px ${testCase.lang}/${testCase.theme} ${route}`;
        await assertLanguageAndTheme(page, testCase, label);
        await assertViewportHealth(page, label);
      }

      assert.deepEqual(
        pageErrors,
        [],
        `${engineName} page errors detected: ${pageErrors.join(" | ")}`,
      );
    } finally {
      await page.close();
    }
  }

  console.log(`PASS ${engineName}: responsive LTR/RTL light/dark smoke checks`);
}

if (engineMode === "all" || engineMode === "chromium") {
  const engineScope = process.env.UI_BROWSER_ENGINE ?? "all";
const browser = engineScope === "cross" ? null : await chromium.launch({ headless: true });
  try {
    if (suiteMode === "all" || suiteMode === "responsive") {
      await runResponsiveSuite(browser);
    }
    if (suiteMode === "all" || suiteMode === "routes") {
      await runCriticalRouteSuite(browser);
    }
  } finally {
    await browser.close();
  }
}

const supplementalEngines = [
  { name: "firefox", launcher: firefox },
  { name: "webkit", launcher: webkit },
];

if (engineScope !== "chromium") {
for (const engine of supplementalEngines) {
  if (engineMode !== "all" && engineMode !== engine.name) continue;

  const browser = await engine.launcher.launch({ headless: true });
  try {
    await runSupplementalSuite(engine.name, browser);
  } finally {
    await browser.close();
  }
}

}
