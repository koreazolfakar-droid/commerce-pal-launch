import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";
const { browser, context } = await createDashboardBrowser();
const productId = "00000000-0000-4000-8000-000000000099";
await context.route("**/rest/v1/store_catalog_audit_log**", (route) =>
  route.fulfill({
    json: [
      {
        id: 1,
        action: "update",
        entity_type: "product",
        product_id: productId,
        changed_by: "00000000-0000-4000-8000-000000000088",
        created_at: "2026-11-01T10:00:00Z",
      },
    ],
  }),
);
const page = await context.newPage();
try {
  await page.goto(
    `${process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173"}/dashboard/activity`,
  );
  const record = page.getByRole("link", { name: /product/i });
  await record.waitFor({ timeout: 30000 });
  assert.equal(await record.getAttribute("href"), `/dashboard/products/${productId}`);
  assert.ok((await page.locator("main").innerText()).includes(productId));
  assert.ok(
    (await page.locator("main").innerText()).includes("00000000-0000-4000-8000-000000000088"),
  );
} finally {
  await browser.close();
}
