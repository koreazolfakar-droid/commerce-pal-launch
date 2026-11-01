import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";
const { browser, context } = await createDashboardBrowser();
const page = await context.newPage();
try {
  await page.goto(
    `${process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173"}/dashboard/orders`,
  );
  const search = page.getByRole("searchbox", { name: "Search orders", exact: true });
  await search.waitFor({ timeout: 30000 });
  assert.equal(await page.getByText("Search orders", { exact: true }).isVisible(), true);
} finally {
  await browser.close();
}
