import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";
const { browser, context } = await createDashboardBrowser();
const page = await context.newPage();
try {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(
    `${process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173"}/dashboard/products`,
  );
  const nav = page.getByRole("navigation", { name: "Workspace navigation" });
  const product = nav.getByRole("button", { name: "Products", exact: true });
  await product.waitFor();
  const box = await product.boundingBox();
  assert.ok(box.height <= 40, `Desktop navigation row is ${box.height}px`);
  const catalog = nav.getByRole("button", { name: "Catalog", exact: true });
  await catalog.click();
  assert.equal(await product.isVisible(), true);
  assert.equal(await product.getAttribute("aria-current"), "page");
  assert.equal(await nav.getByRole("button", { name: "Brands", exact: true }).count(), 0);
} finally {
  await browser.close();
}
