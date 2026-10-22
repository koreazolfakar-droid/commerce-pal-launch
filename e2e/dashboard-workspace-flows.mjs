import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";
const { browser, context, id } = await createDashboardBrowser();
const origin = process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173";
const products = Array.from({ length: 45 }, (_, index) => ({
  id: `product-${index}`,
  title: `Phone ${String(index).padStart(2, "0")}`,
  handle: `phone-${index}`,
  description: "",
  base_price: index + 10,
  stock_quantity: index === 0 ? 10 : 20,
  status: index < 25 ? "active" : "draft",
  sku: `SKU-${index}`,
  barcode: "",
  brand_id: "brand-1",
  category_id: "category-1",
  product_type: "Phones",
  seo_title: "",
  seo_description: "",
}));
const periods = [];
const errors = [];
await context.route("**/rest/v1/**", async (route) => {
  const url = new URL(route.request().url());
  const name = url.pathname.split("/").at(-1);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  if (name === "get_dashboard_home_snapshot") {
    const args = route.request().postDataJSON();
    periods.push(args);
    return route.fulfill({
      json: {
        periodStart: args.p_start,
        periodEnd: args.p_end,
        productCount: 45,
        activeProductCount: 25,
        totalSales: 1245,
        ordersLast30Days: 7,
        customerCount: 4,
        totalUnits: 200,
        lowStockVariants: 2,
        outOfStockVariants: 1,
        recentOrders: [],
        topProducts: [],
        topBrands: [],
        trend: [],
      },
    });
  }
  if (name === "store_products")
    return route.fulfill({ json: offset ? [] : products, headers: { "content-range": "0-44/45" } });
  if (name === "cms_brands")
    return route.fulfill({
      json: offset ? [] : [{ id: "brand-1", name: "Space", slug: "space", is_visible: true }],
    });
  if (name === "store_categories")
    return route.fulfill({
      json: offset ? [] : [{ id: "category-1", name: "Phones", slug: "phones", is_active: true }],
    });
  if (name === "search_dashboard_products")
    return route.fulfill({
      json: [{ id: "product-0", name: "Phone 00", brand: "Space", sku: "SKU-0" }],
    });
  return route.fallback();
});
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${origin}/dashboard/products`);
  await page.getByRole("heading", { name: "Products", exact: true }).waitFor();
  await page.getByRole("button", { name: "Phone 00", exact: false }).first().waitFor();
  const status = page.getByLabel("Status", { exact: true });
  await page.getByRole("button", { name: "AR", exact: true }).click();
  await page.getByLabel("الحالة", { exact: true }).selectOption("Draft");
  await page.getByRole("button", { name: "Phone 25", exact: false }).first().waitFor();
  assert.equal(await page.getByRole("button", { name: "Phone 00", exact: false }).count(), 0);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  assert.equal(await status.inputValue(), "Draft");
  await status.selectOption("All");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page.getByRole("button", { name: "Phone 20", exact: false }).first().waitFor();
  await page.getByRole("checkbox", { name: "Select visible", exact: true }).check();
  assert.equal(await page.getByRole("checkbox", { checked: true }).count(), 21);
  await page.getByRole("button", { name: "Clear selection", exact: true }).click();
  await page.getByLabel("Search products...", { exact: true }).last().fill("Phone 44");
  await page.getByRole("button", { name: "Phone 44", exact: false }).first().waitFor();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export results", exact: true }).click();
  const download = await downloadEvent;
  const csv = await readFile(await download.path(), "utf8");
  assert.ok(csv.includes("Phone 44"));
  assert.ok(!csv.includes("Phone 43"));
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.getByLabel("Stock", { exact: true }).selectOption("low");
  await page.getByRole("button", { name: "Phone 00", exact: false }).first().waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Phone 01", exact: false }).count(),
    0,
    "10 units is included in low stock",
  );
  for (const width of [390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `No overflow at ${width}`,
    );
    const filters = await page.locator(".dashboard-catalog-filters").boundingBox();
    const fields = await page
      .locator(".dashboard-catalog-filters select")
      .boundingBox()
      .catch(() => null);
    assert.ok(filters.width < width);
    if (fields) assert.ok(fields.x + fields.width <= width);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${origin}/dashboard`);
  await page.getByLabel("Report period", { exact: true }).waitFor();
  await page.getByLabel("Report period", { exact: true }).selectOption("7");
  await page.getByLabel("Report period", { exact: true }).waitFor();
  assert.equal(await page.getByLabel("Report period", { exact: true }).inputValue(), "7");
  assert.ok(new Date(periods.at(-1).p_end) - new Date(periods.at(-1).p_start) < 7 * 86400000);
  const attention = page.waitForURL(/attention=out/);
  await page.getByRole("button", { name: "Out of stock", exact: false }).click();
  await attention;
  await page.getByRole("button", { name: "Search workspace", exact: true }).click();
  const command = page.getByRole("dialog", { name: "Workspace command center", exact: true });
  const search = command.getByRole("combobox", { name: "Search workspace", exact: true });
  await search.fill("Products");
  await command.getByRole("option", { name: "Products", exact: true }).waitFor();
  await search.press("ArrowDown");
  assert.ok(await search.getAttribute("aria-activedescendant"));
  await search.press("Escape");
  assert.equal(await command.count(), 0);
  await page.goto(`${origin}/dashboard/products`);
  await page.getByRole("button", { name: "Phone 00", exact: false }).first().waitFor();
  if (process.env.SPACE_CALL_AUDIT_SCREENSHOT_DIR)
    await page.screenshot({
      path: process.env.SPACE_CALL_AUDIT_SCREENSHOT_DIR + "/products-desktop.png",
      fullPage: true,
    });
  await page.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
  await page.getByRole("button", { name: "AR", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForFunction(
    () => document.querySelector("aside[inert]")?.getBoundingClientRect().left >= innerWidth - 1,
  );
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  if (process.env.SPACE_CALL_AUDIT_SCREENSHOT_DIR)
    await page.screenshot({
      path: process.env.SPACE_CALL_AUDIT_SCREENSHOT_DIR + "/products-mobile-ar-dark.png",
      fullPage: false,
      animations: "disabled",
    });
  assert.deepEqual(errors, []);
  await context.route("**/src/dashboard/pages/ProductsPage.tsx*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'throw new Error("Synthetic route failure");',
    }),
  );
  const failurePage = await context.newPage();
  await failurePage.goto(`${origin}/dashboard/products`);
  await failurePage.getByRole("heading", { name: "تعذر فتح هذا القسم.", exact: true }).waitFor();
  assert.equal(await failurePage.locator("header.dashboard-header").count(), 1);
  await failurePage.getByRole("link", { name: "العودة إلى لوحة التحكم", exact: true }).click();
  await failurePage.locator("main h1").first().waitFor();
  assert.ok(!failurePage.url().includes("/products"));
  await failurePage.close();
  await context.unroute("**/src/dashboard/pages/ProductsPage.tsx*");

  console.log(
    JSON.stringify({
      passed: [
        "Arabic status filter",
        "language preserves filter value",
        "pagination and page selection",
        "search resets pagination",
        "filtered CSV download",
        "10-unit stock boundary",
        "5 responsive widths",
        "7-day RPC report period",
        "stock alert deep link",
        "section search keyboard controls",
        "Arabic dark mobile view",
        "route failures preserve navigation and recovery",
      ],
      pageErrors: errors,
    }),
  );
} finally {
  await browser.close();
}
