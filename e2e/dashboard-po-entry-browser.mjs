import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";

const { browser, context } = await createDashboardBrowser();
let withoutPrerequisites = false;
await context.route("**/rest/v1/**", async (route) => {
  const url = new URL(route.request().url());
  const name = url.pathname.split("/").at(-1);
  const offset = Number(url.searchParams.get("offset") || 0);
  if (name === "store_suppliers")
    return route.fulfill({
      json:
        offset || withoutPrerequisites
          ? []
          : [{ id: "supplier-1", name: "Supplier", code: "S1", is_active: true }],
    });
  if (name === "store_procurement_locations")
    return route.fulfill({
      json:
        offset || withoutPrerequisites
          ? []
          : [{ id: "location-1", name: "Warehouse", code: "W1", is_active: true }],
    });
  if (name === "store_products")
    return route.fulfill({
      json:
        offset || withoutPrerequisites
          ? []
          : [
              {
                id: "product-1",
                title: "Phone",
                sku: "P1",
                stock_quantity: 2,
                status: "active",
                track_inventory: true,
              },
            ],
    });
  return route.fallback();
});
const page = await context.newPage();
try {
  await page.goto(
    `${process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173"}/dashboard/purchase-orders`,
  );
  const create = page.getByRole("button", { name: "New PO", exact: true });
  await create.waitFor();
  await page.getByText("Active suppliers", { exact: true }).first().waitFor();
  assert.equal(
    await create.isEnabled(),
    true,
    "The list does not load product choices; it must still allow navigation to creation",
  );
  await create.click();
  await page.waitForURL(/\/dashboard\/purchase-orders\/new$/);
  await page
    .getByRole("combobox", { name: "Supplier", exact: true })
    .waitFor({ timeout: 30000 })
    .catch(async (error) => {
      console.error((await page.locator("body").innerText()).slice(-4000));
      throw error;
    });
  assert.equal(
    await page.getByRole("combobox", { name: "Supplier", exact: true }).inputValue(),
    "supplier-1",
  );
  assert.equal(
    await page.getByRole("combobox", { name: "Store / Warehouse", exact: true }).inputValue(),
    "location-1",
  );
  withoutPrerequisites = true;
  await page.reload();
  await page.getByText("A purchase order requires:", { exact: true }).waitFor();
  for (const missing of ["An active supplier", "An active location", "A tracked product"])
    assert.equal(await page.getByText(missing, { exact: true }).isVisible(), true);
  assert.equal(
    await page.getByRole("button", { name: "Manage suppliers and locations" }).isVisible(),
    true,
  );
  assert.equal(await page.getByRole("button", { name: "Manage products" }).isVisible(), true);
} finally {
  await browser.close();
}
