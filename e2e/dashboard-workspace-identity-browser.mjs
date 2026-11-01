import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";
const { browser, context } = await createDashboardBrowser();
const page = await context.newPage();
const contrast = ({ background, foreground }) => {
  const rgb = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const luminance = (color) =>
    rgb(color)
      .map((value) => value / 255)
      .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
      .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
  const a = luminance(background),
    b = luminance(foreground);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
try {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(
    `${process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173"}/dashboard/products`,
  );
  const primary = page.locator(".dashboard-page-header .dashboard-button-primary");
  await primary.waitFor();
  const colors = async () =>
    primary.evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, foreground: style.color };
    });
  let current = await colors();
  assert.equal(current.background, "rgb(23, 25, 28)");
  assert.ok(contrast(current) >= 4.5, JSON.stringify(current));
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector(".dashboard-page-header .dashboard-button-primary"))
        .backgroundColor === "rgb(244, 245, 243)",
  );
  current = await colors();
  assert.ok(contrast(current) >= 4.5, JSON.stringify(current));
} finally {
  await browser.close();
}
