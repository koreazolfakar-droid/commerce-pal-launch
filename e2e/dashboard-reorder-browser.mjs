import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";
const { browser, context } = await createDashboardBrowser();
const products = Array.from({ length: 45 }, (_, i) => ({
  id: `product-${i}`,
  title: `Phone ${String(i).padStart(2, "0")}`,
  sku: `SKU-${i}`,
  status: i === 1 ? "draft" : "active",
  track_inventory: true,
  stock_quantity: 1,
}));
await context.route("**/rest/v1/store_products**", (route) => {
  const offset = Number(new URL(route.request().url()).searchParams.get("offset") || 0);
  return route.fulfill({ json: offset ? [] : products });
});
const page = await context.newPage();
try {
  await page.goto(
    `${process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173"}/dashboard/procurement`,
  );
  const search = page.getByRole("searchbox", { name: "Search products", exact: true });
  await search.waitFor({ timeout: 30000 });
  const table = page.getByRole("table");
  assert.equal(await table.locator("tbody tr").count(), 20);
  await search.fill("Phone 01");
  assert.equal(await table.locator("tbody tr").count(), 1);
  assert.match(await table.locator("tbody").innerText(), /Draft/);
} finally {
  await browser.close();
}
