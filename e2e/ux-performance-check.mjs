import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";
const cases = [
  { width: 320, height: 700 },
  { width: 360, height: 780 },
  { width: 375, height: 812 },
  { width: 390, height: 844, deep: true },
  { width: 412, height: 915, slow: true },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 900, deep: true },
];

const browser = await chromium.launch({ headless: true });

async function assertNoHorizontalOverflow(page, name) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  assert.ok(
    metrics.scrollWidth <= metrics.innerWidth + 1,
    `${name}: document horizontal overflow (${metrics.scrollWidth} > ${metrics.innerWidth})`,
  );
  assert.ok(
    metrics.bodyScrollWidth <= metrics.innerWidth + 1,
    `${name}: body horizontal overflow (${metrics.bodyScrollWidth} > ${metrics.innerWidth})`,
  );
}

async function assertMobileNavigation(page, testCase) {
  const nav = page.getByTestId("bottom-nav");
  await nav.waitFor({ state: "visible" });
  const items = nav.locator("a, button");
  assert.equal(await items.count(), 5, `${testCase.width}px: bottom nav must contain five actions`);

  for (const item of await items.all()) {
    const box = await item.boundingBox();
    assert.ok(box, `${testCase.width}px: bottom nav item is not measurable`);
    assert.ok(box.width >= 44, `${testCase.width}px: bottom nav target is narrower than 44px`);
    assert.ok(box.height >= 44, `${testCase.width}px: bottom nav target is shorter than 44px`);
  }

  const geometry = await page.evaluate(() => {
    const navElement = document.querySelector('[data-testid="bottom-nav"]');
    const layout = document.querySelector(".store-layout");
    if (!(navElement instanceof HTMLElement) || !(layout instanceof HTMLElement)) return null;
    const navRect = navElement.getBoundingClientRect();
    return {
      bottom: navRect.bottom,
      viewportHeight: window.innerHeight,
      navHeight: navRect.height,
      layoutPaddingBottom: Number.parseFloat(getComputedStyle(layout).paddingBottom),
    };
  });
  assert.ok(geometry, `${testCase.width}px: mobile navigation geometry unavailable`);
  assert.ok(
    geometry.bottom <= geometry.viewportHeight + 1,
    `${testCase.width}px: bottom nav exceeds viewport`,
  );
  assert.ok(
    geometry.layoutPaddingBottom >= geometry.navHeight - 2,
    `${testCase.width}px: content padding does not reserve bottom-nav space`,
  );

  const quick = page.getByTestId("home-quick-access");
  await quick.waitFor({ state: "visible" });
  assert.equal(
    await quick.locator("a").count(),
    4,
    `${testCase.width}px: quick access must expose four routes`,
  );
  for (const item of await quick.locator("a").all()) {
    const box = await item.boundingBox();
    assert.ok(box && box.height >= 44, `${testCase.width}px: quick access target is below 44px`);
  }

  const search = nav.getByRole("button", { name: "Search", exact: true });
  await search.click();
  await page.getByRole("textbox", { name: "Search products" }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Close search" }).click();
}

async function assertScrollAndBackFlow(page, name) {
  const productLink = page.locator('article a[href^="/product/"]').first();
  await productLink.waitFor({ state: "visible", timeout: 15_000 });
  await productLink.scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  const before = await page.evaluate(() => window.scrollY);
  assert.ok(before > 100, `${name}: product flow did not move down the homepage`);

  await productLink.click();
  await page.waitForURL(/\/product\//, { timeout: 15_000 });
  await assertNoHorizontalOverflow(page, `${name} product`);

  await page.goBack({ waitUntil: "load" });
  await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });
  await page.waitForTimeout(700);
  const restored = await page.evaluate(() => window.scrollY);
  assert.ok(
    Math.abs(restored - before) <= 260,
    `${name}: back navigation lost scroll position (${before} -> ${restored})`,
  );
}

try {
  for (const testCase of cases) {
    const name = `${testCase.width}x${testCase.height}`;
    const context = await browser.newContext({
      viewport: { width: testCase.width, height: testCase.height },
      hasTouch: testCase.width < 1024,
      isMobile: testCase.width < 768,
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    if (testCase.slow) {
      await page.route("**/*", async (route) => {
        if (route.request().resourceType() === "image") {
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
        await route.continue();
      });
    }

    await page.goto(baseURL, { waitUntil: "load", timeout: 30_000 });
    await page.getByTestId("home-hero").waitFor({ state: "visible" });
    await page.getByTestId("home-quick-access").waitFor({ state: "visible" });
    await page.waitForTimeout(420);

    await assertNoHorizontalOverflow(page, name);

    const heroBefore = await page.getByTestId("home-hero").boundingBox();
    assert.ok(
      heroBefore && heroBefore.width > 0 && heroBefore.height > 0,
      `${name}: hero has no stable box`,
    );
    await page.waitForTimeout(350);
    const heroAfter = await page.getByTestId("home-hero").boundingBox();
    assert.ok(heroAfter, `${name}: hero disappeared after load`);
    assert.ok(
      Math.abs(heroBefore.height - heroAfter.height) <= 1,
      `${name}: hero height shifted while loading`,
    );

    if (testCase.width < 1024) {
      await assertMobileNavigation(page, testCase);
    } else {
      await page.getByTestId("bottom-nav").waitFor({ state: "hidden" });
    }

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(150);
    assert.ok((await page.evaluate(() => window.scrollY)) > 0, `${name}: full-page scroll failed`);
    await assertNoHorizontalOverflow(page, `${name} after scroll`);

    if (testCase.deep) {
      await page.goto(baseURL, { waitUntil: "load" });
      await page.waitForTimeout(500);
      await assertScrollAndBackFlow(page, name);
    }

    assert.deepEqual(pageErrors, [], `${name}: runtime page errors: ${pageErrors.join(" | ")}`);
    console.log(`PASS ${name}: scroll, overflow, touch navigation and layout stability OK`);
    await context.close();
  }
} finally {
  await browser.close();
}
