import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";
const cases = [
  { width: 320, height: 568 },
  { width: 360, height: 740 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
];
const expectedIds = ["home", "categories", "search", "cart", "account"];

const browser = await chromium.launch({ headless: true });

async function waitForNav(page) {
  const nav = page.locator('[data-testid="bottom-nav"]');
  await nav.waitFor({ state: "visible" });
  return nav;
}

async function assertActive(page, id) {
  const item = page.locator(`[data-nav-id="${id}"]`);
  assert.equal(await item.getAttribute("data-active"), "true", `${id} should be active`);
  assert.equal(await item.getAttribute("aria-current"), "page", `${id} should expose aria-current`);
}

try {
  for (const testCase of cases) {
    const page = await browser.newPage({ viewport: testCase });
    await page.goto(baseURL, { waitUntil: "load" });
    await page.waitForTimeout(250);

    const nav = await waitForNav(page);
    const navMetrics = await nav.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    assert.ok(navMetrics.left >= -1, `${testCase.width}px: nav starts outside viewport`);
    assert.ok(
      navMetrics.right <= navMetrics.viewportWidth + 1,
      `${testCase.width}px: nav exceeds viewport`,
    );
    assert.ok(
      Math.abs(navMetrics.bottom - navMetrics.viewportHeight) <= 1,
      `${testCase.width}px: nav is not fixed to the viewport bottom`,
    );
    assert.ok(
      navMetrics.scrollWidth <= navMetrics.viewportWidth,
      `${testCase.width}px: horizontal overflow detected`,
    );

    const items = nav.locator("[data-nav-id]");
    assert.equal(await items.count(), 5, `${testCase.width}px: expected five navigation items`);

    for (let index = 0; index < expectedIds.length; index += 1) {
      const item = items.nth(index);
      assert.equal(
        await item.getAttribute("data-nav-id"),
        expectedIds[index],
        `${testCase.width}px: navigation order changed`,
      );
      const box = await item.boundingBox();
      assert.ok(box, `${testCase.width}px: missing touch target for ${expectedIds[index]}`);
      assert.ok(box.width >= 44, `${testCase.width}px: ${expectedIds[index]} target is too narrow`);
      assert.ok(box.height >= 44, `${testCase.width}px: ${expectedIds[index]} target is too short`);
      assert.ok(
        (await item.getAttribute("aria-label"))?.trim(),
        `${testCase.width}px: ${expectedIds[index]} is missing aria-label`,
      );
    }

    await assertActive(page, "home");
    console.log(`PASS ${testCase.width}px: layout, touch targets, active state and overflow`);
    await page.close();
  }

  const routingPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await routingPage.goto(`${baseURL}/categories`, { waitUntil: "load" });
  await waitForNav(routingPage);
  await assertActive(routingPage, "categories");
  await routingPage.reload({ waitUntil: "load" });
  await assertActive(routingPage, "categories");

  await routingPage.goto(`${baseURL}/search`, { waitUntil: "load" });
  await assertActive(routingPage, "search");
  await routingPage.goBack({ waitUntil: "load" });
  await assertActive(routingPage, "categories");

  await routingPage.goto(`${baseURL}/cart`, { waitUntil: "load" });
  await assertActive(routingPage, "cart");

  await routingPage.evaluate(() => document.documentElement.classList.add("dark"));
  const darkBackground = await routingPage
    .locator('[data-testid="bottom-nav"] > div')
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  assert.notEqual(darkBackground, "rgba(0, 0, 0, 0)", "dark mode nav background is transparent");
  await routingPage.close();

  const badgePage = await browser.newPage({ viewport: { width: 360, height: 740 } });
  await badgePage.goto(baseURL, { waitUntil: "load" });
  await badgePage.evaluate(async () => {
    const { useCartStore } = await import("/src/stores/cartStore.ts");
    const price = { amount: "1.00", currencyCode: "USD" };
    useCartStore.setState({
      items: [
        {
          lineId: null,
          variantId: "gid://shopify/ProductVariant/test",
          variantTitle: "Test variant",
          price,
          quantity: 105,
          selectedOptions: [],
          product: {
            node: {
              id: "gid://shopify/Product/test",
              title: "Test product",
              handle: "test-product",
              description: "",
              availableForSale: true,
              priceRange: { minVariantPrice: price },
              images: { edges: [] },
              collections: { edges: [] },
              variants: { edges: [] },
              options: [],
            },
          },
        },
      ],
    });
  });
  const badge = badgePage.locator('[data-testid="bottom-nav-cart-badge"]');
  await badge.waitFor({ state: "visible" });
  assert.equal((await badge.textContent())?.trim(), "99+", "cart badge should cap counts at 99+");
  await badgePage.close();

  const rtlPage = await browser.newPage({ viewport: { width: 360, height: 740 } });
  await rtlPage.addInitScript(() => localStorage.setItem("space-cell-language", "ar"));
  await rtlPage.goto(baseURL, { waitUntil: "load" });
  await waitForNav(rtlPage);
  const rtlOverflow = await rtlPage.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  assert.equal(rtlOverflow, false, "Arabic/RTL bottom navigation causes horizontal overflow");
  await rtlPage.close();

  console.log("PASS routing, refresh/back, cart badge, dark mode and RTL checks");
} finally {
  await browser.close();
}
