import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";
const { browser, context } = await createDashboardBrowser();
await context.route("**/rest/v1/**", async (route) => {
  const name = new URL(route.request().url()).pathname.split("/").at(-1);
  if (name === "store_collections")
    return route.fulfill({
      json: [
        {
          id: "collection-1",
          title: "Everyday phones",
          handle: "phones",
          sort_order: 0,
          is_active: true,
          is_featured: false,
        },
      ],
    });
  if (name === "cms_sections")
    return route.fulfill({
      json: [
        {
          id: "00000000-0000-4000-8000-000000000010",
          section_key: "brands",
          section_type: "brand_rail",
          title_en: "Top Brands",
          is_visible: true,
          content: { builder: { name: "Top Brands" } },
        },
      ],
    });
  return route.fallback();
});
const page = await context.newPage();
const origin = process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173";
const errors = [];
try {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/dashboard/collections`);
  const action = page.getByRole("button", { name: "Add products", exact: true });
  await action.waitFor();
  if (process.env.SPACE_CALL_SCREENSHOT_DIR)
    await page.screenshot({ path: `${process.env.SPACE_CALL_SCREENSHOT_DIR}/collections.png` });
  for (const mode of ["light", "dark"]) {
    if (mode === "dark") await page.getByRole("button", { name: "Switch to dark mode" }).click();
    for (const language of ["en", "ar"]) {
      if (language === "ar") await page.getByRole("button", { name: "AR", exact: true }).click();
      for (const width of [320, 375, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const button = page.getByRole("button", {
          name: language === "ar" ? "إضافة منتجات" : "Add products",
          exact: true,
        });
        if (!(await button.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)))
          errors.push(`Collection action clipped at ${width}, ${language}, ${mode}`);
      }
      if (language === "ar") await page.getByRole("button", { name: "EN", exact: true }).click();
    }
  }
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.goto(`${origin}/dashboard/homepage`);
  const name = page
    .getByRole("button", { name: /Top Brands/ })
    .first()
    .locator("div")
    .first();
  await name.waitFor();
  if (process.env.SPACE_CALL_SCREENSHOT_DIR)
    await page.screenshot({ path: `${process.env.SPACE_CALL_SCREENSHOT_DIR}/homepage.png` });
  for (const mode of ["light", "dark"]) {
    if (mode === "dark") await page.getByRole("button", { name: "Switch to dark mode" }).click();
    for (const language of ["en", "ar"]) {
      if (language === "ar") await page.getByRole("button", { name: "AR", exact: true }).click();
      for (const width of [320, 375, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        if (!(await name.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)))
          errors.push(`Homepage name clipped at ${width}, ${language}, ${mode}`);
      }
      if (language === "ar") await page.getByRole("button", { name: "EN", exact: true }).click();
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
