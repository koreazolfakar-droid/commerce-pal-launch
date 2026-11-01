import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";
const { browser, context } = await createDashboardBrowser();
await context.route("**/rest/v1/store_purchase_orders**", (route) => {
  const offset = Number(new URL(route.request().url()).searchParams.get("offset") || 0);
  return route.fulfill({
    json: offset
      ? []
      : [
          {
            id: "po-1",
            supplier_id: "s1",
            location_id: "l1",
            po_number: "PO-001",
            status: "pending_approval",
            currency: "USD",
            expected_at: "2026-11-10T10:00:00Z",
            ordered_at: "2026-11-02T10:00:00Z",
            created_at: "2026-11-01T10:00:00Z",
            updated_at: "2026-11-01T10:00:00Z",
            exchange_rate: 1,
            discount_amount: 0,
            tax_amount: 0,
            shipping_amount: 0,
          },
        ],
  });
});
const page = await context.newPage();
try {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(
    `${process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173"}/dashboard/purchase-orders`,
  );
  const region = page.getByRole("region", { name: "Purchase Orders", exact: true });
  await region.waitFor({ timeout: 30000 });
  assert.equal(
    await region.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    true,
    "PO table fits on desktop",
  );
  assert.match(await region.innerText(), /Pending approval/);
  await page.setViewportSize({ width: 390, height: 844 });
  const card = page.locator("article").filter({ hasText: "PO-001" });
  await card.waitFor();
  assert.match(await card.innerText(), /Created date/);
  assert.match(await card.innerText(), /Issued date/);
} finally {
  await browser.close();
}
