import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";

const { browser, context } = await createDashboardBrowser();
let release;
let requestStarted;
const started = new Promise((resolve) => {
  requestStarted = resolve;
});
const pending = new Promise((resolve) => {
  release = resolve;
});
let productRequests = 0;
let pauseRefresh = false;
let releaseRefresh;
let refreshStarted;
const refreshPending = new Promise((resolve) => {
  releaseRefresh = resolve;
});
const refreshStart = new Promise((resolve) => {
  refreshStarted = resolve;
});
await context.route("**/rest/v1/**", async (route) => {
  const url = new URL(route.request().url());
  if (url.pathname.endsWith("/store_products")) {
    productRequests += 1;
    if (productRequests === 1) {
      requestStarted();
      await pending;
    }
    if (pauseRefresh && Number(url.searchParams.get("offset") || 0) === 0) {
      refreshStarted();
      await refreshPending;
    }
    return route.fulfill({
      json: Number(url.searchParams.get("offset") || 0)
        ? []
        : [
            {
              id: "product-1",
              title: "Fixture phone",
              handle: "fixture-phone",
              sku: "SKU-1",
              status: "active",
              base_price: 10,
              stock_quantity: 1,
            },
          ],
    });
  }
  return route.fallback();
});
const page = await context.newPage();
try {
  await page.goto(
    `${process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173"}/dashboard/products`,
  );
  await started;
  const status = page.getByRole("status").filter({ hasText: /results|loading/i });
  assert.equal(
    await status.getByText(/0 results/i).count(),
    0,
    "Loading must not announce zero results",
  );
  release();
  await page.getByRole("button", { name: "Fixture phone", exact: false }).first().waitFor();
  assert.equal((await page.getByText(/1 results/i).count()) > 0, true);
  pauseRefresh = true;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await refreshStart;
  assert.equal(
    await page.getByRole("button", { name: "Fixture phone", exact: false }).first().isVisible(),
    true,
  );
  assert.equal((await page.getByText("Refreshing…", { exact: false }).count()) > 0, true);
  pauseRefresh = false;
  releaseRefresh();
  await page.getByRole("button", { name: "Refresh", exact: true }).waitFor({ state: "visible" });
} finally {
  release();
  releaseRefresh();
  await browser.close();
}
