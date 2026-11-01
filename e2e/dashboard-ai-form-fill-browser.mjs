import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";
const { browser, context } = await createDashboardBrowser();
const origin = process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173";
const requests = [];
const writes = [];
const pageErrors = [];
let failAt = -1;
let delayGate = null;
let markDelayStarted = () => {};
let markDelayFinished = () => {};
const specFields = Array.from({ length: 46 }, (_, i) => ({
  key: `field_${i}`,
  label: `Field ${i}`,
  type: "text",
  unit: "",
  required: false,
}));
await context.route("**/rest/v1/**", async (route) => {
  const url = new URL(route.request().url());
  if (
    ["PATCH", "POST", "DELETE"].includes(route.request().method()) &&
    !url.pathname.includes("/rpc/") &&
    !url.pathname.endsWith("/store_customer_profiles")
  )
    writes.push(url.pathname);
  const name = url.pathname.split("/").at(-1);
  if (
    ["store_categories", "cms_brands"].includes(name) &&
    Number(url.searchParams.get("offset") || 0) > 0
  )
    return route.fulfill({ json: [] });
  if (name === "store_categories")
    return route.fulfill({
      json: [
        {
          id: "cat-1",
          name: "Phones",
          slug: "phones",
          is_active: true,
          spec_template: {
            sections: [
              { key: "basics", title: "Basics", fields: specFields.slice(0, 24) },
              { key: "more", title: "More", fields: specFields.slice(24) },
            ],
          },
        },
      ],
    });
  if (name === "cms_brands")
    return route.fulfill({
      json: [{ id: "brand-1", name: "Space", slug: "space", is_visible: true }],
    });
  return route.fallback();
});
await context.route("**/functions/v1/dashboard-ai-assist", async (route) => {
  const body = route.request().postDataJSON();
  requests.push(body);
  if (requests.length === failAt)
    return route.fulfill({ status: 503, json: { message: "AI temporarily unavailable. Retry." } });
  if (delayGate) {
    const gate = delayGate;
    delayGate = null;
    markDelayStarted();
    await gate;
    markDelayFinished();
  }
  const generated = {
    description: "A complete description based on the supplied sheet.",
    seoTitle: "Phone 25 | Space Call",
    seoDescription: "Phone 25 details from the supplied reference.",
    brandName: "Space",
    categoryName: "Phones",
    title: "Summer devices",
    titleAr: "أجهزة الصيف",
    handle: "summer-devices",
    titleEn: "Space Call | Technology",
    descriptionEn: "Discover the supplied Space Call catalog.",
    descriptionAr: "اكتشف منتجات Space Call المذكورة في المعلومات المرجعية.",
  };
  const suggestions = body.fields
    .filter((field) => field.key !== "barcode")
    .map((field) => {
      const index = Number(field.key.replace("spec__field_", ""));
      return {
        field: field.key,
        value: field.key.startsWith("spec__")
          ? `Value ${index}`
          : generated[field.key] || "Supplied value",
        confidence: 0.85,
        verified: false,
        reason: "Supplied reference",
        risk: field.key.startsWith("spec__") ? "high" : "low",
        decision: index === 45 ? "block" : field.review ? "review" : "allow",
        checks: [],
        sourceUrls: [],
        inputQuote: field.key.startsWith("spec__") ? `Field ${index}: Value ${index}` : "",
      };
    });
  // A modified or old service cannot overwrite a populated field or an operational field.
  suggestions.push(
    { field: "price", value: "9999", decision: "allow" },
    { field: "title", value: "Unexpected overwrite", decision: "allow" },
  );
  return route.fulfill({
    json: {
      entity: body.entity,
      action: body.action,
      model: "fixture",
      grounded: false,
      entityMatch: { status: "exact", canonicalName: body.query, reason: "Provided model" },
      summary: "Prepared all requested fields.",
      suggestions,
      sources: [],
      warnings: ["Live web verification is unavailable. Suggestions require manual review."],
      missingFields: [{ field: "barcode", reason: "Exact barcode is unavailable." }],
    },
  });
});
const page = await context.newPage();
page.on("pageerror", (error) => pageErrors.push(error.message));
try {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${origin}/dashboard/products/new`);
  await page.getByLabel("Title", { exact: true }).fill("Phone 25");
  await page.getByLabel("Category", { exact: true }).selectOption("cat-1");
  await page.getByLabel("Brand", { exact: true }).selectOption("brand-1");
  await page.getByLabel("Price", { exact: true }).fill("123");
  await page.getByLabel("Stock", { exact: true }).fill("7");
  await page.getByRole("button", { name: "AI Assist", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Research, fill and improve", exact: true });
  await dialog.waitFor();
  await dialog.getByText("Advanced AI options (sources, mode and validation)", { exact: true }).click();
  await dialog
    .getByLabel("Source information and specifications", { exact: true })
    .fill("Phone 25\n" + specFields.map((field, i) => `Field ${i}: Value ${i}`).join("\n"));
  await dialog.getByLabel("Product research pages (optional)", { exact: true })
    .fill("https://www.hihonor.com/global/phones/");
  await dialog.getByRole("button", { name: "Complete form", exact: true }).click();
  await dialog.getByRole("button", { name: "Select all for review", exact: true }).waitFor();
  assert.equal(requests.length, 2);
  assert.ok(requests.every((body) => body.referenceUrls?.[0] === "https://www.hihonor.com/global/phones/"));
  assert.equal(
    requests.flatMap((body) => body.fields).filter((field) => field.key.startsWith("spec__"))
      .length,
    46,
  );
  assert.ok(requests.every((body) => !body.fields.some((field) => field.key === "title")));
  assert.equal(await dialog.locator('[data-ai-field="price"]').count(), 0);
  assert.equal(await dialog.locator('[data-ai-field="title"]').count(), 0);
  await dialog.getByText("Fields still needing information", { exact: false }).click();
  await dialog.getByText("Exact barcode is unavailable.", { exact: true }).waitFor();
  await dialog.getByRole("button", { name: "Select all for review", exact: true }).click();
  assert.equal(await dialog.locator('[data-ai-field="spec__field_45"] input').isChecked(), false);
  await dialog.getByRole("button", { name: /Apply selected/ }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(await page.getByLabel("Title", { exact: true }).inputValue(), "Phone 25");
  assert.equal(await page.getByLabel("Price", { exact: true }).inputValue(), "123");
  assert.equal(await page.getByLabel("Stock", { exact: true }).inputValue(), "7");
  assert.equal(await page.getByLabel("Field 44", { exact: true }).inputValue(), "Value 44");
  assert.equal(await page.getByLabel("Field 45", { exact: true }).inputValue(), "");
  assert.deepEqual(writes, []);
  // A failed second batch must not expose a partially completed first batch for application.
  await page.getByRole("button", { name: "AI Assist", exact: true }).click();
  await dialog.getByText("Advanced AI options (sources, mode and validation)", { exact: true }).click();
  await dialog.getByLabel("Also improve existing fields", { exact: true }).check();
  failAt = requests.length + 2;
  await dialog.getByRole("button", { name: "Complete form", exact: true }).click();
  await dialog.getByRole("alert").getByText("AI temporarily unavailable. Retry.").waitFor();
  assert.equal(await dialog.locator("[data-ai-field]").count(), 0);
  assert.equal(await page.getByLabel("Field 44", { exact: true }).inputValue(), "Value 44");
  failAt = -1;
  await dialog.getByRole("button", { name: "Close AI assistant", exact: true }).click();
  // Cancelled responses must not appear in a subsequently reopened panel.
  let releaseDelay;
  delayGate = new Promise((resolve) => {
    releaseDelay = resolve;
  });
  const started = new Promise((resolve) => {
    markDelayStarted = resolve;
  });
  const finished = new Promise((resolve) => {
    markDelayFinished = resolve;
  });
  await page.getByRole("button", { name: "AI Assist", exact: true }).click();
  await dialog.getByRole("button", { name: "Complete form", exact: true }).click();
  await started;
  await dialog.getByRole("button", { name: "Close AI assistant", exact: true }).click();
  releaseDelay();
  await finished;
  await page.getByRole("button", { name: "AI Assist", exact: true }).click();
  assert.equal(await dialog.locator("[data-ai-field]").count(), 0);
  await page.keyboard.press("Escape");
  page.on("dialog", (event) => event.accept());
  await page.goto(`${origin}/dashboard/collections`);
  await page.getByRole("button", { name: "New collection", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Summer devices");
  await page.getByRole("button", { name: "AI Assist", exact: true }).click();
  await page.getByRole("dialog", { name: "Research, fill and improve", exact: true }).waitFor();
  await page.keyboard.press("Escape");
  assert.equal(
    await page.getByRole("dialog", { name: "Research, fill and improve", exact: true }).count(),
    0,
  );
  assert.equal(await page.getByLabel("Title", { exact: true }).inputValue(), "Summer devices");
  await page.getByRole("button", { name: "AI Assist", exact: true }).click();
  await dialog.getByRole("button", { name: "Complete form", exact: true }).click();
  await dialog.getByRole("button", { name: "Select all for review", exact: true }).waitFor();
  await dialog.getByRole("button", { name: "Select all for review", exact: true }).click();
  await dialog.getByRole("button", { name: /Apply selected/ }).click();
  assert.ok(requests.some((body) => body.entity === "collection"));
  await page.goto(`${origin}/dashboard/seo`);
  await page.getByRole("button", { name: "Add SEO page", exact: true }).click();
  await page.getByRole("button", { name: "AI Assist", exact: true }).click();
  await dialog.getByRole("button", { name: "Complete form", exact: true }).click();
  await dialog.getByRole("button", { name: "Select all for review", exact: true }).waitFor();
  await dialog.getByRole("button", { name: "Select all for review", exact: true }).click();
  await dialog.getByRole("button", { name: /Apply selected/ }).click();
  assert.equal(
    await page.getByLabel("Title — Arabic", { exact: true }).inputValue(),
    "أجهزة الصيف",
  );
  assert.ok(requests.some((body) => body.entity === "seo_page"));
  await page.evaluate(() => {
    localStorage.setItem("spacecall-language", "ar");
    localStorage.setItem("spacecall-dashboard-theme", "dark");
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/dashboard/products/new`);
  await page.getByRole("button", { name: "مساعد الذكاء الاصطناعي", exact: true }).click();
  const arabicDialog = page.getByRole("dialog", { name: "بحث وكتابة وتحسين", exact: true });
  await arabicDialog.getByLabel("ما الذي تريد البحث عنه؟", { exact: true }).fill("Phone 25");
  const beforeAutoResearch = requests.length;
  await arabicDialog.getByRole("button", { name: "إكمال النموذج", exact: true }).click();
  await arabicDialog.getByRole("button", { name: "تحديد الكل للمراجعة", exact: true }).waitFor();
  const autoRequests = requests.slice(beforeAutoResearch);
  assert.equal(autoRequests.length, 3);
  assert.ok(autoRequests[0].fields.some((field) => field.key === "categoryName"));
  assert.equal(
    autoRequests.filter((item) => item.fields.some((field) => field.key.startsWith("spec__"))).length,
    2,
  );
  assert.ok(autoRequests.slice(1).every((item) => item.context.selectedCategory === "Phones"));
  await arabicDialog.getByText("تعرّف الذكاء الاصطناعي على قالب تصنيف مناسب", { exact: false }).waitFor();
  assert.equal(await arabicDialog.locator('[data-ai-field="spec__field_44"] input').isDisabled(), true);
  await arabicDialog.getByRole("button", { name: "تحديد الكل للمراجعة", exact: true }).click();
  assert.equal(await arabicDialog.locator('[data-ai-field="spec__field_44"] input').isDisabled(), false);
  assert.equal(requests.at(-1).language, "ar");
  assert.equal(await arabicDialog.getAttribute("dir"), "rtl");
  assert.equal(
    await page.locator("html").evaluate((node) => node.classList.contains("dark")),
    true,
  );
  const layout = await arabicDialog.evaluate((node) => ({
    width: node.getBoundingClientRect().width,
    overflow: node.scrollWidth > node.clientWidth,
    background: getComputedStyle(node).backgroundColor,
  }));
  const warnings = arabicDialog.locator("details").filter({ hasText: "راجع التنبيهات" });
  assert.equal(await warnings.count(), 1);
  assert.equal(await warnings.getAttribute("open"), null);
  const applyBounds = await arabicDialog.getByRole("button", { name: /تطبيق المحدد/ }).boundingBox();
  assert.ok(applyBounds && applyBounds.y >= 0 && applyBounds.y + applyBounds.height <= 844);
  assert.ok(layout.width <= 390);
  assert.equal(layout.overflow, false);
  assert.notEqual(layout.background, "rgb(255, 255, 255)");
  if (process.env.SPACE_CALL_AI_SCREENSHOT)
    await page.screenshot({ path: process.env.SPACE_CALL_AI_SCREENSHOT });
  assert.deepEqual(writes, []);
  assert.deepEqual(pageErrors, []);
  console.log(
    JSON.stringify({
      passed: [
        "all 46 specification slots requested across two batches",
        "existing values preserved",
        "operational fields excluded",
        "unknown barcode explained",
        "blocked suggestions cannot be selected",
        "reviewed values applied only to local draft",
        "nested dialog Escape keeps form",
        "collection and bilingual SEO filling",
        "failed batches do not expose partial results",
        "cancelled requests cannot restore stale results",
        "AI category discovery followed by exact 46-field template research",
        "Arabic RTL mobile dark-mode layout",
      ],
      pageErrors,
    }),
  );
} catch (error) {
  console.log(
    JSON.stringify({
      url: page.url(),
      body: (await page.locator("body").innerText()).slice(0, 1200),
      pageErrors,
    }),
  );
  throw error;
} finally {
  await browser.close();
}
