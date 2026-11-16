import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";

const origin = process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:4173";
const { browser, context } = await createDashboardBrowser();
const page = await context.newPage();

try {
  for (const width of [768, 980, 1280, 1440]) {
    await page.setViewportSize({ width, height: 740 });
    await page.goto(origin + "/dashboard");
    const sidebar = page.locator("#dashboard-sidebar-navigation.sidebar-polished");
    await sidebar.waitFor({ state: "visible" });
    const metrics = await page.evaluate(() => {
      const shell = document.querySelector(".dashboard-theme-scope");
      const nav = document.querySelector(".dashboard-sidebar.sidebar-polished");
      const main = document.querySelector(".dashboard-desktop-content").getBoundingClientRect();
      const rect = nav.getBoundingClientRect();
      return {
        width: rect.width, contentWidth: main.width, viewport: window.innerWidth,
        scrollOverflow: nav.scrollWidth > nav.clientWidth + 1,
        columns: getComputedStyle(shell).gridTemplateColumns,
      };
    });
    const limit = width >= 1440 ? 253 : 245;
    assert.ok(metrics.width >= 200 && metrics.width <= limit,
      "sidebar too wide at " + width + "px: " + metrics.width);
    assert.ok(metrics.contentWidth > width * 0.62,
      "main content squeezed at " + width + "px: " + metrics.contentWidth);
    assert.equal(metrics.scrollOverflow, false, "sidebar overflows at " + width + "px");
    assert.ok(metrics.columns.split(/\s+/).length >= 2, "integrated grid missing at " + width);
    const active = sidebar.locator('[aria-current="page"]');
    await active.first().waitFor();
    assert.ok(await active.count() >= 1, "current route not visible at " + width);

    // Inventory and other long pages scroll the document. The sidebar must
    // stay pinned to the viewport instead of leaving an empty white column.
    const scrolled = await page.evaluate(async () => {
      const shell = document.querySelector(".dashboard-theme-scope");
      if (!shell) throw new Error("Dashboard shell not mounted");
      // Force a tall page at the shell level: a child page may use its own
      // content scroller or Suspense container and not increase body height.
      const originalMinHeight = shell.style.minHeight;
      shell.style.minHeight = "2600px";
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const bounds = document.querySelector("#dashboard-sidebar-navigation").getBoundingClientRect();
      const result = {
        scrollY: window.scrollY,
        shellTop: shell.getBoundingClientRect().top,
        shellScrollY: shell.scrollTop,
        shellHeight: shell.getBoundingClientRect().height,
        documentHeight: document.documentElement.scrollHeight,
        top: bounds.top,
        bottom: bounds.bottom,
        height: bounds.height,
        viewportHeight: window.innerHeight,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
      shell.style.minHeight = originalMinHeight;
      window.scrollTo({ top: 0, behavior: "instant" });
      return result;
    });
    assert.ok(scrolled.scrollY >= 300, "long document must scroll at " + width + "px: " + JSON.stringify(scrolled));
    assert.ok(Math.abs(scrolled.top) <= 2,
      "sidebar scrolled away with the document at " + width + "px: " + JSON.stringify(scrolled));
    assert.ok(scrolled.bottom >= scrolled.viewportHeight - 2,
      "sidebar ends above the bottom of the screen at " + width + "px: " + JSON.stringify(scrolled));
    assert.equal(scrolled.horizontalOverflow, false, "horizontal overflow after scrolling at " + width);
  }

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 740 });
    await page.goto(origin + "/dashboard");
    const sidebar = page.locator("#dashboard-sidebar-navigation.sidebar-polished");
    await page.getByRole("button", { name: "More", exact: true }).click();
    assert.equal(await sidebar.getAttribute("role"), "dialog");
    const metrics = await sidebar.evaluate(el => ({
      width: el.getBoundingClientRect().width,
      left: el.getBoundingClientRect().left,
      right: el.getBoundingClientRect().right,
      scrollOverflow: el.scrollWidth > el.clientWidth + 1,
    }));
    assert.ok(metrics.width <= Math.min(width * 0.88 + 2, 314), "drawer too wide at " + width);
    assert.ok(metrics.left >= -1 && metrics.right <= width + 1);
    assert.equal(metrics.scrollOverflow, false, "mobile sidebar overflows at " + width);
    const groups = sidebar.locator(".dashboard-sidebar-section");
    const expanded = await groups.first().getAttribute("aria-expanded");
    await groups.first().click();
    assert.notEqual(await groups.first().getAttribute("aria-expanded"), expanded);
    await groups.first().click();
    await sidebar.getByRole("button", { name: "Products", exact: true }).click();
    await page.waitForURL(url => url.pathname === "/dashboard/products");
    assert.equal(await sidebar.getAttribute("role"), null, "drawer should close");
  }
  console.log(JSON.stringify({ passed: [
    "compact desktop sidebar", "mobile drawer 320 and 390",
    "navigation groups", "products route", "active route", "full-height sticky navigation during long-page scrolling",
  ] }));
} finally {
  await browser.close();
}
