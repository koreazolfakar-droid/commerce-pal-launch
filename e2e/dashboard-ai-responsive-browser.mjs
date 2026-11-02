import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";

const { browser, context } = await createDashboardBrowser();
const origin = process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173";
const widths = [320, 360, 375, 390, 430, 600, 768, 980, 1024, 1280, 1440, 1600, 1920];
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
      const header = element.firstElementChild;
      const body = element.children[1];
      const footer = element.lastElementChild;
      const headerRect = header.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      const computed = getComputedStyle(element);
      return {
        left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
        display: computed.display, flexDirection: computed.flexDirection,
        headerTop: headerRect.top, headerBottom: headerRect.bottom,
        bodyTop: bodyRect.top, bodyBottom: bodyRect.bottom,
        footerTop: footerRect.top,
        dialogScrollWidth: element.scrollWidth, dialogClientWidth: element.clientWidth,
        footerLeft: footerRect.left, footerRight: footerRect.right,
        footerBottom: footerRect.bottom,
      };
    });
    assert.equal(metrics.display, "flex", `dialog must not inherit dashboard grid at ${width}px`);
    assert.equal(metrics.flexDirection, "column", `dialog layout must be vertical at ${width}px`);
    assert.ok(metrics.bodyTop >= metrics.headerBottom - 2, `body overlaps header at ${width}px`);
    assert.ok(metrics.footerTop >= metrics.bodyTop - 2, `footer is not below content at ${width}px`);
    assert.ok(metrics.left >= -1 && metrics.right <= width + 1, `dialog outside ${width}px viewport`);
    assert.ok(metrics.top >= -1 && metrics.bottom <= 741, `dialog too tall at ${width}px`);
    assert.ok(metrics.bottom - metrics.top < 716, `short dialog should not fill the whole viewport at ${width}px`);
    assert.ok(metrics.dialogScrollWidth <= metrics.dialogClientWidth + 1, `horizontal overflow at ${width}px`);
    assert.ok(metrics.footerLeft >= -1 && metrics.footerRight <= width + 1);
    assert.ok(metrics.footerBottom <= 741, `footer hidden at ${width}px`);
    const apply = dialog.getByRole("button", { name: /Apply selected/ });
    await apply.waitFor();
    assert.ok(await apply.isVisible());
    const research = dialog.getByRole("button", { name: "Complete form" });
    assert.ok(await research.isDisabled(), `research should require a product name at ${width}px`);
    await dialog.getByLabel("Product name / exact model").fill("HONOR Play20C 4GB / 128GB");
    assert.ok(await research.isEnabled(), `research action cannot be used at ${width}px`);
    await dialog.locator("details").first().locator("summary").click();
    await dialog.getByRole("button", { name: "Validate" }).waitFor();
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
  await dialog.getByRole("button", { name: "Close AI assistant" }).click();

  const actions = [];
  await context.route("**/functions/v1/dashboard-ai-assist", async route => {
    const body = route.request().postDataJSON();
    actions.push(body.action);
    return route.fulfill({ json: {
      entity: "product", action: body.action, model: "fixture", grounded: false,
      entityMatch: { status: "exact", canonicalName: body.query, reason: "Supplied exact model" },
      summary: "Review long content", sources: [],
      warnings: ["Evidence requires review. ".repeat(100)],
      suggestions: [{ field: "description", value: "A product description. ".repeat(150), confidence: 0.8,
        decision: "review", verified: false, risk: "medium", reason: "Manual review", checks: [], sourceUrls: [] }],
      missingFields: [],
    } });
  });
  await page.setViewportSize({ width: 320, height: 460 });
  await page.getByRole("button", { name: "AI Assist", exact: true }).click();
  await dialog.getByLabel("Product name / exact model").fill("QA exact model");
  await dialog.locator("summary").first().click();
  for (const name of ["Validate", "Improve SEO"]) {
    await dialog.getByRole("button", { name, exact: true }).click();
    await dialog.getByRole("button", { name: "Select all for review", exact: true }).waitFor();
  }
  assert.deepEqual(actions, ["validate", "seo"]);
  await dialog.locator("details").filter({ hasText: "Review warnings" }).locator("summary").click();
  await dialog.getByRole("button", { name: "Select all for review", exact: true }).click();
  const apply = dialog.getByRole("button", { name: /Apply selected/ });
  const bounds = await apply.boundingBox();
  assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= 460, "long results hide footer");
  assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1), "long results overflow");
  await apply.click();
  assert.equal((await page.getByLabel("Description", { exact: true }).inputValue()).trim(), "A product description. ".repeat(150).trim());
  console.log(JSON.stringify({ passed: ["AI portal geometry at 13 widths", "reduced viewport height", "Validate", "Improve SEO", "long warnings and suggestions", "review and draft-only apply"] }));
} finally {
  await browser.close();
}
