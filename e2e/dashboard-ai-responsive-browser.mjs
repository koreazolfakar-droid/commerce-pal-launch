import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";

const { browser, context } = await createDashboardBrowser();
const origin = process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173";
const widths = [320, 360, 375, 390, 430, 768, 1024, 1440];
const page = await context.newPage();

try {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 740 });
    await page.goto(`${origin}/dashboard/products/new`);
    await page.getByRole("button", { name: "AI Assist", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Research, fill and improve" });
    await dialog.waitFor();
    const metrics = await dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const footer = element.lastElementChild;
      const footerRect = footer.getBoundingClientRect();
      return {
        left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
        dialogScrollWidth: element.scrollWidth, dialogClientWidth: element.clientWidth,
        footerLeft: footerRect.left, footerRight: footerRect.right,
        footerBottom: footerRect.bottom,
      };
    });
    assert.ok(metrics.left >= -1 && metrics.right <= width + 1, `dialog outside ${width}px viewport`);
    assert.ok(metrics.top >= -1 && metrics.bottom <= 741, `dialog too tall at ${width}px`);
    assert.ok(metrics.dialogScrollWidth <= metrics.dialogClientWidth + 1, `horizontal overflow at ${width}px`);
    assert.ok(metrics.footerLeft >= -1 && metrics.footerRight <= width + 1);
    assert.ok(metrics.footerBottom <= 741, `footer hidden at ${width}px`);
    const apply = dialog.getByRole("button", { name: /Apply selected/ });
    await apply.waitFor();
    assert.ok(await apply.isVisible());
    await dialog.getByRole("button", { name: "Close AI assistant" }).click();
  }

  await page.setViewportSize({ width: 360, height: 460 });
  await page.goto(`${origin}/dashboard/products/new`);
  await page.getByRole("button", { name: "AI Assist", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Research, fill and improve" });
  await dialog.getByLabel("Product name / exact model").focus();
  assert.ok(await dialog.getByRole("button", { name: /Apply selected/ }).isVisible());
  const height = await dialog.evaluate((element) => element.getBoundingClientRect().height);
  assert.ok(height <= 436, "dialog must fit reduced viewport height");
} finally {
  await browser.close();
}
