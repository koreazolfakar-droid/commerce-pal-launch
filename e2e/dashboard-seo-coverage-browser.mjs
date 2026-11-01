import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";
const { browser, context } = await createDashboardBrowser();
await context.route("**/rest/v1/cms_seo_pages**", (route) =>
  route.fulfill({
    json: [
      {
        page_slug: "home",
        title: "Home",
        title_en: "Home",
        title_ar: "",
        description: "",
        description_en: "",
        description_ar: "",
        is_public: true,
        robots: "index,follow",
        json_ld: {},
        updated_at: "2026-11-01",
      },
      {
        page_slug: "brands",
        title: "Brands",
        title_en: "Brands",
        title_ar: "",
        description: "",
        description_en: "",
        description_ar: "",
        is_public: true,
        robots: "index,follow",
        json_ld: {},
        updated_at: "2026-11-01",
      },
    ],
  }),
);
const page = await context.newPage();
try {
  await page.goto(
    `${process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173"}/dashboard/seo`,
  );
  const home = page.getByRole("row").filter({ hasText: "home" });
  const brands = page.getByRole("row").filter({ hasText: "brands" });
  await home.waitFor();
  assert.match(await home.innerText(), /Prepared/);
  assert.match(await brands.innerText(), /Connected/);
  assert.match(await page.locator("main").innerText(), /JSON-LD.*not.*applied/i);
} finally {
  await browser.close();
}
