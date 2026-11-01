import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";
const { browser, context, id } = await createDashboardBrowser();
const origin = process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://localhost:5173";
const errors = [],
  writes = [],
  lookups = [];
const products = Array.from({ length: 60 }, (_, i) => ({
  id: `product-${i}`,
  title: `Phone ${String(i).padStart(2, "0")}`,
  handle: `phone-${i}`,
  description: "Product description",
  base_price: 100 + i,
  stock_quantity: i === 35 ? 0 : 20,
  status: i < 15 ? "active" : "draft",
  sku: `SKU-${i}`,
  barcode: "",
  brand_id: "brand-1",
  category_id: "category-1",
  product_type: "Phones",
  seo_title: "",
  seo_description: "",
}));
let failInventory = false,
  failProducts = false;
let suppliers = [];
const order = {
  id: "order-1",
  order_number: 120,
  public_order_number: "11111-00120",
  customer_name: "Space Customer",
  customer_phone: "1234567",
  customer_email: "space@example.test",
  status: "new",
  payment_status: "unpaid",
  payment_method: "cash",
  currency: "USD",
  total: 120,
  subtotal: 120,
  shipping_total: 0,
  discount_total: 0,
  source: "storefront",
  version: 1,
  created_at: "2026-10-20T10:00:00Z",
  updated_at: "2026-10-20T10:00:00Z",
};
await context.route("**/rest/v1/**", async (route) => {
  const req = route.request(),
    url = new URL(req.url()),
    name = url.pathname.split("/").at(-1),
    offset = Number(url.searchParams.get("offset") || 0);
  const json = (data, headers = {}) => route.fulfill({ json: data, headers });
  if (
    ["POST", "PATCH", "DELETE"].includes(req.method()) &&
    !url.pathname.includes("/rpc/") &&
    !name.startsWith("store_customer_profile")
  )
    writes.push({ name, method: req.method(), body: req.postDataJSON() });
  if (name === "store_products") {
    if (failProducts)
      return route.fulfill({ status: 503, json: { message: "Temporary catalog failure" } });
    if (url.searchParams.get("id")?.startsWith("eq.")) {
      const row = products.find((p) => `eq.${p.id}` === url.searchParams.get("id"));
      return json(
        req.headers().accept?.includes("vnd.pgrst.object") ? row || null : row ? [row] : [],
      );
    }
    return json(offset ? [] : products, { "content-range": "0-59/60" });
  }
  if (name === "cms_brands")
    return json(offset ? [] : [{ id: "brand-1", name: "Space", slug: "space", is_visible: true }]);
  if (name === "store_categories")
    return json(
      offset ? [] : [{ id: "category-1", name: "Phones", slug: "phones", is_active: true }],
    );
  if (name === "search_dashboard_products") {
    const query = req.postDataJSON();
    lookups.push(query);
    const q = JSON.stringify(query);
    if (q.includes("slow")) await new Promise((r) => setTimeout(r, 600));
    return json([
      {
        id: "product-35",
        name: q.includes("slow") ? "Slow stale result" : "Fast Phone",
        sku: "SKU-35",
        brand: "Space",
      },
    ]);
  }
  if (name === "store_orders") {
    if (req.headers().accept?.includes("vnd.pgrst.object")) return json(order);
    return json([order], { "content-range": "0-0/1" });
  }
  if (name === "dashboard_inventory_page") {
    if (failInventory)
      return route.fulfill({ status: 503, json: { message: "Temporary inventory failure" } });
    return json([]);
  }
  if (name === "store_suppliers") {
    if (req.method() === "POST") {
      const row = { id: "supplier-1", ...req.postDataJSON() };
      suppliers = [row];
      return json(row);
    }
    return json(offset ? [] : suppliers);
  }
  return route.fallback();
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const go = (path) => page.goto(origin + "/dashboard/" + path);
const discard = async (accept, action) => {
  page.once("dialog", (d) => (accept ? d.accept() : d.dismiss()));
  await action();
};
try {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await go("products?status=Draft&page=2&pageSize=20");
  await page.getByRole("button", { name: "Phone 35", exact: false }).first().click();
  await page.getByLabel("Title", { exact: true }).waitFor();
  await page.getByRole("link", { name: "Back to list", exact: true }).click();
  await page.getByRole("button", { name: "Phone 35", exact: false }).first().waitFor();
  assert.equal(new URL(page.url()).searchParams.get("page"), "2");
  assert.equal(await page.getByLabel("Status", { exact: true }).inputValue(), "Draft");
  await page.getByRole("button", { name: "Out of stock", exact: true }).click();
  assert.equal(new URL(page.url()).searchParams.get("stock"), "out");
  assert.equal(new URL(page.url()).searchParams.has("page"), false);
  await page.getByRole("button", { name: "Save view", exact: true }).click();
  await page.getByLabel("View name", { exact: true }).fill("Stock follow-up");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Drafts", exact: true }).click();
  await page.getByRole("button", { name: "Stock follow-up", exact: true }).click();
  assert.equal(new URL(page.url()).searchParams.get("stock"), "out");
  await page.reload();
  await page.getByRole("button", { name: "Stock follow-up", exact: true }).waitFor();
  await page.getByRole("button", { name: "Search workspace", exact: true }).click();
  const command = page.getByRole("dialog", { name: "Workspace command center", exact: true });
  const search = command.getByRole("combobox");
  await search.fill("Space");
  await command.getByText("Fast Phone", { exact: true }).waitFor();
  await command.getByText("#11111-00120", { exact: true }).waitFor();
  await command.getByText("Test Customer", { exact: true }).waitFor();
  await search.fill("slow");
  await page.waitForRequest(
    (r) => r.url().includes("/rpc/search_dashboard_products") && r.postData()?.includes("slow"),
  );
  await search.fill("fast");
  await command.getByText("Fast Phone", { exact: true }).waitFor();
  await page.waitForTimeout(650);
  assert.equal(await command.getByText("Slow stale result", { exact: true }).count(), 0);
  await search.fill("Users");
  assert.equal(await command.getByRole("option", { name: "Users", exact: true }).count(), 0);
  await search.fill("Orders");
  await command.getByRole("option", { name: "Orders", exact: true }).waitFor();
  await search.press("Enter");
  await page.getByRole("heading", { name: "Orders", exact: true }).waitFor();
  assert.ok(new URL(page.url()).pathname.endsWith("/orders"));
  await go("collections");
  await page.getByRole("button", { name: "New collection", exact: true }).click();
  const collection = page.getByRole("dialog", { name: "Create collection", exact: true });
  await collection.getByLabel("Title", { exact: true }).fill("Unfinished collection");
  await collection.getByRole("button", { name: "AI Assist", exact: true }).click();
  const ai = page.getByRole("dialog", { name: "Research, fill and improve", exact: true });
  await ai.waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await collection.count(), 1);
  assert.equal(
    await collection.getByLabel("Title", { exact: true }).inputValue(),
    "Unfinished collection",
  );
  await discard(false, () => page.keyboard.press("Escape"));
  assert.equal(await collection.count(), 1);
  await discard(true, () => page.keyboard.press("Escape"));
  assert.equal(await collection.count(), 0);
  assert.notEqual(await page.locator("body").evaluate((el) => el.style.overflow), "hidden");
  for (const [path, button, title, field] of [
    ["seo", "Add SEO page", "Add SEO page", "Page slug"],
    ["navigation", "Add item", "Add navigation item", "Primary label"],
  ]) {
    await go(path);
    await page.getByRole("button", { name: button, exact: true }).click();
    const modal = page.getByRole("dialog", { name: title, exact: true });
    await modal.getByLabel(field, { exact: true }).fill("Unsaved content");
    await discard(false, () => page.keyboard.press("Escape"));
    assert.equal(await modal.count(), 1);
    await discard(true, () => page.keyboard.press("Escape"));
    assert.equal(await modal.count(), 0);
  }
  await go("suppliers");
  await page.getByRole("button", { name: "New supplier", exact: true }).click();
  await page.getByPlaceholder("Supplier name", { exact: true }).fill("Space Supplier");
  await page.getByLabel("Active supplier", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Save supplier", exact: true }).click();
  await page.getByRole("button", { name: "Space Supplier", exact: false }).waitFor();
  assert.equal(writes.at(-1).body.is_active, false);
  assert.equal(writes.length, 1);
  failInventory = true;
  await go("purchase-orders/new");
  await page.getByPlaceholder("PO-2026-001", { exact: true }).fill("DRAFT-KEEP");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Back to purchase orders", exact: true }).click();
  assert.equal(
    await page.getByPlaceholder("PO-2026-001", { exact: true }).inputValue(),
    "DRAFT-KEEP",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Back to purchase orders", exact: true }).click();
  await page.waitForURL(/\/dashboard\/purchase-orders$/);
  await go("inventory");
  await page
    .getByRole("alert")
    .getByText("Unable to refresh this section", { exact: true })
    .waitFor();
  failInventory = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByRole("heading", { name: "Inventory control", exact: true }).waitFor();
  assert.equal(await page.getByRole("alert").count(), 0);
  await go("products/new");
  // Real browser overflow regression at all supported Phase 1 breakpoints.
  // The section rail scrolls within its own container, never the document.
  for (const width of [360, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByLabel("Title", { exact: true }).waitFor();
    const measured = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      editor: document.querySelector(".dashboard-product-editor")?.getBoundingClientRect().width ?? 0,
    }));
    assert.ok(
      measured.document <= measured.viewport + 1,
      `horizontal document overflow at ${width}px: ${JSON.stringify(measured)}`,
    );
    assert.ok(measured.editor > 0, `product editor is hidden at ${width}px`);
  }
  await page.getByRole("button", { name: "Pricing", exact: true }).click();
  await page.getByRole("button", { name: "Variants", exact: true }).click();
  assert.equal(await page.evaluate(() => document.activeElement?.id), "product-variants");
  await page.getByRole("button", { name: "Pricing", exact: true }).click();
  assert.equal(await page.evaluate(() => document.activeElement?.id), "product-pricing");
  await page.getByRole("button", { name: "Color: Graphite" }).click();
  assert.equal(
    await page.getByRole("button", { name: "Color: Graphite" }).getAttribute("aria-pressed"),
    "true",
  );
  await page.getByLabel("Custom color name").fill("Midnight Blue");
  assert.equal(
    await page.getByRole("button", { name: "Color: Graphite" }).getAttribute("aria-pressed"),
    "false",
  );
  await page.getByRole("button", { name: "Specifications", exact: true }).click();
  assert.equal(await page.locator("#product-specifications").getAttribute("open"), "");
  await page.getByRole("button", { name: "Save as Draft", exact: true }).first().click();
  await page.getByText("Product title is required", { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.productField), "title");
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  // navigator.onLine is the browser source of truth; emulate it explicitly for this local fixture.
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    window.dispatchEvent(new Event("offline"));
  });
  await page
    .getByText(
      "You are offline. Keep this page open to preserve your draft. Saving requires a connection.",
      { exact: true },
    )
    .waitFor();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    window.dispatchEvent(new Event("online"));
  });
  await go("collections");
  await page.getByRole("button", { name: "AR", exact: true }).click();
  await page.getByRole("button", { name: "التبديل إلى الوضع الداكن", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("heading", { name: "المجموعات", exact: true }).waitFor();
  await page.waitForFunction(
    () => document.querySelector("aside[inert]")?.getBoundingClientRect().left >= innerWidth - 1,
  );
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const cards = page.locator(".dashboard-summary-grid > div");
  assert.equal(await cards.count(), 4);
  const a = await cards.nth(0).boundingBox(),
    b = await cards.nth(1).boundingBox();
  assert.equal(Math.round(a.y), Math.round(b.y));
  if (process.env.SPACE_CALL_AUDIT_SCREENSHOT_DIR) {
    await page.screenshot({
      path: process.env.SPACE_CALL_AUDIT_SCREENSHOT_DIR + "/collections-ar-mobile.png",
    });
    await page.getByRole("button", { name: "البحث في مساحة العمل", exact: true }).click();
    await page
      .getByRole("dialog", { name: "مركز البحث والانتقال", exact: true })
      .getByRole("combobox")
      .fill("المنتجات");
    await page.getByRole("option", { name: "المنتجات", exact: true }).waitFor();
    await page
      .getByRole("dialog", { name: "مركز البحث والانتقال", exact: true })
      .getByText("Fast Phone", { exact: true })
      .waitFor();
    await page.screenshot({
      path: process.env.SPACE_CALL_AUDIT_SCREENSHOT_DIR + "/command-ar-mobile.png",
    });
  }
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: [
        "list URL context through detail and explicit return",
        "saved views survive reload",
        "bounded search across three entities",
        "stale search replies ignored",
        "staff directory hidden from editors",
        "keyboard command navigation",
        "nested dialogs close only the top layer",
        "dirty collection SEO navigation drafts protected",
        "scroll lock released",
        "inactive supplier creation respected",
        "purchase order draft close protection",
        "inventory failure and retry",
        "product section navigation",
        "offline editing notice",
        "Arabic dark mobile density and layout",
      ],
      writes: writes.map((w) => w.name),
      errors,
    }),
  );
} catch (error) {
  console.log(
    JSON.stringify({
      url: page.url(),
      body: (await page.locator("body").innerText()).slice(-1800),
      errors,
    }),
  );
  throw error;
} finally {
  await browser.close();
}
