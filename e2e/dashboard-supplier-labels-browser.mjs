import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";
const { browser, context } = await createDashboardBrowser();
const page = await context.newPage();
try {
  await page.goto(
    `${process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173"}/dashboard/suppliers`,
  );
  await page.getByRole("button", { name: "New supplier", exact: true }).click();
  const name = page.getByRole("textbox", { name: "Supplier name", exact: true });
  await name.waitFor({ timeout: 30000 }).catch(async (error) => {
    console.error(await page.locator("fieldset").first().ariaSnapshot());
    throw error;
  });
  assert.equal(await name.count(), 1, "Supplier name has a persistent label");
  await page.getByRole("button", { name: "Save supplier", exact: true }).click();
  assert.equal(await name.getAttribute("aria-invalid"), "true");
  const errorId = await name.getAttribute("aria-describedby");
  assert.ok(errorId);
  assert.equal(await page.locator(`#${errorId}`).innerText(), "Supplier name is required.");
  assert.equal(await name.evaluate((element) => element === document.activeElement), true);
} finally {
  await browser.close();
}
