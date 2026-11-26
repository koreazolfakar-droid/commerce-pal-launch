import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";

const { browser, context } = await createDashboardBrowser();
const origin = process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173";

try {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(origin + "/dashboard");
  const tools = page.getByRole("region", { name: "Work tools" });
  await tools.getByRole("link", { name: "View orders" }).waitFor();
  for (const [group, destination] of [
    ["Catalog", "/dashboard/products/new"],
    ["Store content", "/dashboard/homepage"],
    ["Stock & purchasing", "/dashboard/purchase-orders/new"],
  ]) {
    await tools.getByRole("button", { name: group, exact: true }).click();
    assert.equal(await tools.locator('a[href="' + destination + '"]').count(), 1);
  }
  const summary = page.locator(".dashboard-stock-summary");
  await summary.locator("summary").click();
  await summary.getByText("Units on hand", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
  await page.getByRole("button", { name: "AR", exact: true }).click();

  await page.route("**/rpc/get_dashboard_home_snapshot", (route) =>
    route.fulfill({ status: 503, json: { message: "Test report unavailable" } }),
  );
  await page.reload();
  await page.getByText("Test report unavailable", { exact: false }).first().waitFor();
  const arabicTools = page.getByRole("region", { name: "أدوات العمل" });
  assert.equal(
    await arabicTools.getByRole("button", { name: "المخزون والمشتريات" }).getAttribute("aria-pressed"),
    "true",
  );
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    const fits = await arabicTools.locator("a, button").evaluateAll((controls) =>
      controls.every((control) => {
        const rect = control.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth && rect.height >= 44;
      }),
    );
    assert.ok(fits, "Arabic work tools fit at " + width);
  }
  await arabicTools.getByRole("link", { name: "أمر شراء جديد" }).click();
  await page.waitForURL("**/dashboard/purchase-orders/new");
  console.log("Verified work groups, summary, saved choice, Arabic dark layout and report failure navigation.");
} finally {
  await browser.close();
}
