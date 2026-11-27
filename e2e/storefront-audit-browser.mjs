// Read-only commerce QA; cart and wishlist mutations are browser-local. Never submits an order.
import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const errors = [];
const page = await context.newPage();
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.log("PAGEERROR", page.url(), e.message);
});
const base = process.env.E2E_BASE_URL || "http://127.0.0.1:4173";
for (const path of ["shipping", "returns", "warranty"]) {
  await page.goto(`${base}/${path}`, { waitUntil: "load", timeout: 60000 });
  await expect(page.locator(".policy-content")).toBeVisible();
  await expect(page.locator(".policy-content")).toContainText("Effective 10 November 2026");

  console.log("PASS policy", path);
}
await page.goto(`${base}/product/acefast-a119-45w-gan-usb-c-charger-set`, {
  waitUntil: "load",
  timeout: 60000,
});
await expect(page.getByRole("button", { name: "Save to wishlist" }).first()).toBeVisible({
  timeout: 30000,
});
await page.getByRole("button", { name: "Save to wishlist" }).first().click();
await expect(page.getByRole("button", { name: "Remove from wishlist" }).first()).toBeVisible();
await page.reload({ waitUntil: "load" });
await expect(page.getByRole("button", { name: "Remove from wishlist" }).first()).toBeVisible({
  timeout: 30000,
});
console.log("PASS wishlist survives reload");
await page.goto(`${base}/shop`, { waitUntil: "load", timeout: 60000 });
console.log("USED visible", await page.locator('a[href="/used-phones"]:visible').count());
await page.screenshot({ path: "/tmp/spacecall-shop-desktop.png" });
await page.goto(`${base}/search?q=ACEFAST`, { waitUntil: "load", timeout: 60000 });
await expect(page.locator('a[href*="/product/acefast-"]').first()).toBeVisible({ timeout: 30000 });
console.log("PASS search ACEFAST");
await page.goto(`${base}/product/acefast-a119-45w-gan-usb-c-charger-set`, {
  waitUntil: "load",
  timeout: 60000,
});
console.log(
  "PRODUCT BUTTONS",
  (await page.getByRole("button").allTextContents()).filter(Boolean).slice(-15),
);
const add = page
  .getByRole("button", { name: /^Add to cart|^Add to bag/i })
  .filter({ visible: true })
  .first();
await expect(add).toBeEnabled({ timeout: 30000 });
await add.click();
await page.goto(`${base}/cart`, { waitUntil: "load", timeout: 60000 });
await expect(page.getByText(/ACEFAST A119/).first()).toBeVisible({ timeout: 30000 });
console.log("PASS cart persists across navigation");
await page.goto(`${base}/checkout`, { waitUntil: "load", timeout: 60000 });
await expect(page.getByRole("button", { name: "Sign in to place order" })).toBeVisible({
  timeout: 30000,
});
await expect(page.getByLabel("Full name", { exact: false })).toBeVisible();
console.log("PASS checkout form and authenticated-order gate");
await page.goto(`${base}/brands`, { waitUntil: "load", timeout: 60000 });
for (const slug of ["bange", "cmf", "mark-ryden", "wiwu"]) {
  await expect(page.locator(`a[href="/brand/${slug}"]`).first()).toBeVisible({ timeout: 30000 });
}
console.log("PASS repaired brands appear in directory");
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}/shop`, { waitUntil: "load", timeout: 60000 });
await expect(page.locator("article").first()).toBeVisible({ timeout: 30000 });
const size = await page.evaluate(() => ({
  scroll: document.documentElement.scrollWidth,
  width: innerWidth,
}));
expect(size.scroll).toBe(size.width);
console.log("PASS mobile no horizontal overflow");
await page.screenshot({ path: "/tmp/spacecall-shop-mobile.png" });
console.log("ERRORS", JSON.stringify(errors));
expect(errors).toEqual([]);
await browser.close();
