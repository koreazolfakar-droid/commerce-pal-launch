import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";

const origin = process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:4173";
const { browser, context } = await createDashboardBrowser();
await context.addInitScript(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: async (value) => (window.copiedAnalyticsUrl = value) },
  });
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
let mode = "normal";
const requests = [];
const product = {
  productId: "00000000-0000-4000-8000-000000000101",
  title: "Space Phone Pro",
  sku: "SC-PRO-BLUE",
  image: "",
  units: 24,
  orders: 16,
  revenue: 1200,
  stock: 2,
  previousUnits: 20,
};
await context.route("**/rest/v1/rpc/get_dashboard_analytics_snapshot", async (route) => {
  const args = route.request().postDataJSON();
  requests.push(args);
  if (mode === "error")
    return route.fulfill({ status: 500, json: { message: "Analytics temporarily unavailable" } });
  const days = Math.ceil((Date.parse(args.p_end) - Date.parse(args.p_start)) / 86400000);
  const empty = mode === "empty";
  const metrics = {
    grossSales: empty ? 0 : 1200,
    netSales: empty ? 0 : 1080,
    orders: empty ? 0 : 19,
    paidOrders: empty ? 0 : 16,
    aov: empty ? 0 : 67.5,
  };
  const previous = { grossSales: 900, netSales: 800, orders: 16, paidOrders: 12, aov: 66.67 };
  const trend = Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.parse(args.p_start) + i * 86400000).toISOString(),
    previousDate: new Date(
      Date.parse(args.p_start) - (Date.parse(args.p_end) - Date.parse(args.p_start)) + i * 86400000,
    ).toISOString(),
    revenue: empty ? 0 : 100 + i,
    orders: empty ? 0 : i % 6,
    previousRevenue: args.p_compare ? (empty ? 0 : 80 + i) : null,
    previousOrders: args.p_compare ? (empty ? 0 : i % 4) : null,
  }));
  const response = {
    recentOrders: [
      {
        id: "order-1",
        orderNumber: "12345-67890",
        customer: "Test customer",
        total: 120,
        currency: "USD",
        status: "new",
        paymentStatus: "unpaid",
        createdAt: args.p_end,
      },
    ],
    topBrands: [{ brandId: "brand-1", name: "Space", revenue: 1200, share: 100 }],
    periodStart: args.p_start,
    periodEnd: args.p_end,
    previousStart: args.p_compare
      ? new Date(
          Date.parse(args.p_start) - (Date.parse(args.p_end) - Date.parse(args.p_start)),
        ).toISOString()
      : null,
    previousEnd: args.p_compare ? args.p_start : null,
    currency: args.p_currency,
    currencies: ["USD", "LBP"],
    current: metrics,
    previous: args.p_compare ? previous : null,
    catalog: {
      customers: 156,
      products: 84,
      totalUnits: 1204,
      lowStock: 8,
      criticalStock: 3,
      outOfStock: 2,
      visibleBrands: 12,
    },
    trend,
    products: {
      topSelling: empty ? [] : [product],
      lowestPerforming: [
        { ...product, productId: "zero", title: "Space Buds", units: 0, revenue: 0, orders: 0 },
      ],
      highestRevenue: empty ? [] : [product],
      restock: [product],
    },
  };
  if (mode === "slow" && days > 80) await new Promise((r) => setTimeout(r, 800));
  try {
    await route.fulfill({ json: response });
  } catch (error) {
    if (!route.request().failure()) throw error;
  }
});
await context.route("**/rest/v1/rpc/get_dashboard_inventory_alerts", async (route) => {
  const args = route.request().postDataJSON();
  const row = {
    productId: product.productId,
    variantId: "variant-1",
    title: product.title,
    sku: product.sku,
    variant: "Blue · 256 GB",
    stock: 2,
    threshold: 10,
    status: "critical",
    image: "",
  };
  const match =
    (!args.p_search ||
      `${row.title} ${row.sku}`.toLowerCase().includes(args.p_search.toLowerCase())) &&
    ["all", "critical"].includes(args.p_status);
  await route.fulfill({
    json: { items: match ? [row] : [], total: match ? 1 : 0, page: args.p_page, pageSize: 8 },
  });
});
async function downloadCsv(button) {
  const pending = page.waitForEvent("download");
  await button.click();
  const file = await pending;
  return { file, contents: await readFile(await file.path(), "utf8") };
}
const ready = () => page.locator(".analytics-kpi").first().waitFor();
const noOverflow = async (width) => {
  const sizes = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  assert.ok(
    sizes.document <= sizes.viewport + 1,
    `Horizontal overflow at ${width}: ${JSON.stringify(sizes)}`,
  );
};
try {
  await page.goto(origin + "/dashboard/analytics");
  await ready();
  assert.equal(await page.locator(".analytics-kpi").count(), 10);
  assert.equal(
    await page.locator(".analytics-recent-orders a").first().getAttribute("href"),
    "/dashboard/orders/order-1",
  );
  assert.equal(await page.locator(".analytics-brand-list progress").count(), 1);
  assert.equal(await page.locator(".analytics-performance-grid .analytics-panel").count(), 4);
  assert.equal(await page.locator(".analytics-kpi.critical").count(), 2);
  await page
    .getByRole("combobox", { name: "Inspect date · Revenue trend", exact: true })
    .selectOption({ index: 2 });
  assert.ok(
    (await page.locator(".analytics-chart-inspect [aria-live]").first().textContent()).includes(
      "$101.00",
    ),
  );
  const ordersInspect = page.getByRole("combobox", {
    name: "Inspect date · Orders trend",
    exact: true,
  });
  assert.equal(await ordersInspect.inputValue(), "", "charts inspect dates independently");
  await ordersInspect.selectOption({ index: 3 });
  const revenueInspect = page.getByRole("combobox", {
    name: "Inspect date · Revenue trend",
    exact: true,
  });
  assert.notEqual(await revenueInspect.inputValue(), await ordersInspect.inputValue());
  const timeline = page.locator(".analytics-timeline");
  await timeline.locator("summary").click();
  await timeline.getByRole("combobox", { name: "Sort trend" }).selectOption("orders");
  assert.equal(await timeline.locator("tbody tr").count(), 10);
  await timeline.getByRole("button", { name: "Next trend page" }).click();
  assert.match(await timeline.locator("[aria-live]").textContent(), /2 \/ 3/);
  const requestsBeforeInterval = requests.length;
  await page.getByRole("button", { name: "7-day groups", exact: true }).click();
  assert.ok(page.url().includes("interval=sevenDays"));
  assert.equal(requests.length, requestsBeforeInterval);
  assert.equal(await timeline.locator("tbody tr").count(), 5);
  const grouped = await downloadCsv(timeline.getByRole("button", { name: "Export trend CSV" }));
  assert.equal(grouped.contents.trim().split("\r\n").length, 6);
  assert.match(grouped.contents, /"USD","721","15"/);
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  await timeline.locator("summary").click();
  const ranked = await downloadCsv(page.getByRole("button", { name: "Export product rankings" }));
  assert.match(ranked.contents, /"Product line revenue"/);
  assert.match(ranked.contents, /SC-PRO-BLUE/);
  await page
    .locator(".analytics-chart")
    .first()
    .hover({ position: { x: 120, y: 100 } });
  await page.locator(".recharts-tooltip-wrapper .analytics-chart-tooltip").first().waitFor();
  await page
    .locator(".analytics-performance-list")
    .first()
    .getByRole("button", { name: "View product · Space Phone Pro", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  assert.equal(
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Edit product", exact: true })
      .getAttribute("href"),
    "/dashboard/products/" + product.productId,
  );
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const stockLink = page
    .locator(".analytics-alert-row")
    .getByRole("link", { name: /Adjust stock/ });
  assert.ok((await stockLink.getAttribute("href")).includes("search=SC-PRO-BLUE"));
  await page.getByRole("searchbox", { name: "Search stock alerts" }).fill("missing");
  await page.getByText("No matching stock alerts.", { exact: true }).waitFor();
  await page.getByRole("searchbox", { name: "Search stock alerts" }).fill("");
  await page.locator(".analytics-alert-row").waitFor();
  await page.getByRole("combobox", { name: "Stock status", exact: true }).selectOption("out");
  await page.getByText("No matching stock alerts.", { exact: true }).waitFor();
  await page.getByRole("combobox", { name: "Stock status", exact: true }).selectOption("all");
  await page.locator(".analytics-alert-row").waitFor();
  await page.getByRole("checkbox", { name: "Compare to previous period" }).uncheck();
  await ready();
  assert.equal(await page.locator(".analytics-chart-legend .previous").count(), 0);
  await page.getByRole("checkbox", { name: "Compare to previous period" }).check();
  await ready();
  await page.getByRole("button", { name: "12M", exact: true }).click();
  await ready();
  assert.ok(
    Date.parse(requests.at(-1).p_end) - Date.parse(requests.at(-1).p_start) > 360 * 86400000,
  );
  await page.getByRole("button", { name: "Custom", exact: true }).click();
  const start = page.getByLabel("Start date", { exact: true }),
    end = page.getByLabel("End date", { exact: true });
  await start.fill("2026-02-01");
  await end.fill("2026-02-07");
  await ready();
  await page.waitForFunction(
    () =>
      document.querySelector(".analytics-kpi") &&
      /Feb 1\s*–\s*7, 2026/.test(document.querySelector(".analytics-report-meta").textContent),
  );
  assert.equal(requests.at(-1).p_start, "2026-02-01T00:00:00.000Z");
  assert.equal(requests.at(-1).p_end, "2026-02-08T00:00:00.000Z");
  await page.getByRole("combobox", { name: "Report currency" }).selectOption("LBP");
  await ready();
  assert.equal(requests.at(-1).p_currency, "LBP");
  await page.getByRole("button", { name: "Copy report link" }).click();
  const copied = new URL(await page.evaluate(() => window.copiedAnalyticsUrl));
  assert.equal(copied.searchParams.get("period"), "custom");
  assert.equal(copied.searchParams.get("from"), "2026-02-01");
  assert.equal(copied.searchParams.get("to"), "2026-02-07");
  assert.equal(copied.searchParams.get("currency"), "LBP");
  await page.goto(copied.href);
  await ready();
  assert.equal(await page.getByRole("combobox", { name: "Report currency" }).inputValue(), "LBP");
  assert.equal(await start.inputValue(), "2026-02-01");
  assert.equal(requests.at(-1).p_end, "2026-02-08T00:00:00.000Z");
  await page.getByRole("combobox", { name: "Report currency" }).selectOption("USD");
  await ready();
  await end.fill("2026-01-01");
  await page
    .getByRole("alert")
    .filter({ hasText: "The end date must be on or after the start date." })
    .waitFor();
  assert.equal(await page.locator(".analytics-kpi").count(), 0);
  await page.getByRole("button", { name: "30D", exact: true }).click();
  await ready();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export report", exact: true }).click();
  const download = await downloadPromise;
  assert.ok(download.suggestedFilename().startsWith("space-call-analytics-"));
  mode = "slow";
  await page.getByRole("button", { name: "90D", exact: true }).click();
  await page.getByRole("button", { name: "7D", exact: true }).click();
  await ready();
  await page.waitForTimeout(900);
  assert.equal(
    await page.getByRole("button", { name: "7D", exact: true }).getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(await page.locator(".analytics-kpi").count(), 10);
  mode = "empty";
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await ready();
  await page.getByText("No sales in this period.", { exact: true }).waitFor();
  await page.getByText("No orders in this period.", { exact: true }).waitFor();
  assert.ok(
    (await page.locator(".analytics-kpi").filter({ hasText: "Customers" }).textContent()).includes(
      "156",
    ),
  );
  mode = "error";
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page.getByText("Analytics temporarily unavailable", { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Export report", exact: true }).isDisabled(),
    true,
  );
  assert.equal(
    await page.locator(".analytics-alert-row").count(),
    1,
    "inventory loads independently",
  );
  mode = "normal";
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await ready();
  await mkdir("test-results/analytics", { recursive: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(width);
    assert.equal(
      await page
        .locator(".analytics-periods button")
        .first()
        .evaluate((el) => el.getBoundingClientRect().height >= 44),
      true,
    );
    if (width === 320) {
      await page.getByRole("button", { name: "Custom", exact: true }).click();
      await page.getByLabel("End date", { exact: true }).fill("2026-02-07");
      await ready();
      await noOverflow(width);
      await page.getByRole("button", { name: "7D", exact: true }).click();
      await ready();
    }
    if (width === 390) {
      const chart = page.locator(".analytics-chart").first();
      await chart.locator(".recharts-wrapper").waitFor();
      await chart.scrollIntoViewIfNeeded();
      const bounds = await chart.boundingBox();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: bounds.x + 120, y: bounds.y + 100 }],
      });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.locator(".analytics-chart-inspect [aria-live]").first().waitFor();
      assert.notEqual(await revenueInspect.inputValue(), "", "tapping pins the inspected date");
      await cdp.detach();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.getByRole("button", { name: "More", exact: true }).click();
      const sidebar = page.locator("#dashboard-sidebar-navigation");
      assert.equal(await sidebar.getAttribute("role"), "dialog");
      assert.equal(await sidebar.getByRole("button", { name: "Users", exact: true }).count(), 0);
      await page.keyboard.press("Escape");
      assert.equal(await sidebar.getAttribute("aria-modal"), null);
      await page.screenshot({ path: "test-results/analytics/mobile.png", fullPage: true });
    }
    if (width === 1440)
      await page.screenshot({ path: "test-results/analytics/desktop.png", fullPage: true });
  }
  await page.evaluate(() => {
    localStorage.setItem("spacecall-language", "ar");
    localStorage.setItem("spacecall-dashboard-theme", "dark");
  });
  await page.reload();
  await ready();
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
  assert.ok((await page.locator("html").getAttribute("class")).includes("dark"));
  await page.setViewportSize({ width: 390, height: 900 });
  await noOverflow(390);
  await page.screenshot({ path: "test-results/analytics/mobile-arabic-dark.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    "Analytics browser checks passed: cards, rankings, chart tooltip/date selection, drill-downs, filters, ranges, comparison, export, cancellation, errors, empty states, mobile drawer, RTL and dark mode.",
  );
} finally {
  await browser.close();
}
