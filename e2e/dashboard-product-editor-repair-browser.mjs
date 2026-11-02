import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";

const { browser, context, id: userId } = await createDashboardBrowser();
const origin = process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:4173";
const output = process.env.SPACE_CALL_EDITOR_EVIDENCE || "test-results/product-editor";
await mkdir(output, { recursive: true });
const evidence = [], errors = [], writes = [];
const productId = "00000000-0000-4000-8000-000000000021";
const now = new Date().toISOString();
let product = { id: productId, title: "Fixture phone", handle: "fixture-phone", description: "Description", brand_id: null, category_id: null, base_price: 100, compare_at_price: null, stock_quantity: 4, status: "draft", sku: "SKU", barcode: "", seo_title: "", seo_description: "", specifications: {} };
let variants = [{ id: "variant-1", product_id: productId, title: "Default", price: 100, compare_at_price: null, stock_quantity: 4, track_inventory: true, allow_backorder: false, options: { color: "Black", storage: "128GB", RAM: "8GB" }, image_url: "", sku: "SKU", barcode: "", sort_order: 0, is_active: true, created_at: now, updated_at: now }];
let pictures = [{ id: "image-1", product_id: productId, url: "https://images.example.test/product.svg", alt_text: "Phone", sort_order: 0, is_primary: true, created_at: now }];
let failSave = false;
await context.route("https://images.example.test/**", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#eeeeee"/></svg>' }));
await context.route("**/rest/v1/**", async route => {
  const req = route.request(), url = new URL(req.url()), name = url.pathname.split("/").at(-1);
  const object = req.headers().accept?.includes("vnd.pgrst.object");
  const reply = data => route.fulfill({ json: data });
  if (name === "user_roles") return reply({ user_id: userId, role: "admin", mfa_required: true, mfa_enrolled_at: now });
  if (name === "save_store_product_editor") {
    const body = req.postDataJSON(); writes.push({ name, body });
    if (failSave) { failSave = false; return route.fulfill({ status: 503, json: { message: "Temporary save failure" } }); }
    product = { ...product, title: body.p_title, description: body.p_description, base_price: body.p_price, compare_at_price: body.p_compare_at_price, stock_quantity: body.p_stock, status: body.p_status, sku: body.p_sku, barcode: body.p_barcode, seo_title: body.p_seo_title, seo_description: body.p_seo_description, category_id: body.p_category_id, brand_id: body.p_brand_id, specifications: body.p_specifications };
    if (variants.length === 1) variants[0] = { ...variants[0], price: body.p_price, stock_quantity: body.p_stock };
    return reply({ id: productId, handle: product.handle, stock: product.stock_quantity, variant_managed_separately: variants.length > 1 });
  }
  if (name === "update_store_product_variant" || name === "create_store_product_variant") {
    const b = req.postDataJSON(); writes.push({ name, body: b });
    const row = { ...variants[0], id: b.p_variant_id || "variant-new", title: b.p_title, price: b.p_price, compare_at_price: b.p_compare_at_price, stock_quantity: b.p_stock, sku: b.p_sku, barcode: b.p_barcode, track_inventory: b.p_track_inventory, allow_backorder: b.p_allow_backorder, is_active: b.p_is_active, options: b.p_options };
    variants = [...variants.filter(v => v.id !== row.id), row]; return reply(row);
  }
  if (name === "store_products") return reply(object ? product : [product]);
  if (name === "store_product_variants") return reply(variants);
  if (name === "store_product_images") {
    if (req.method() === "PATCH") { const body = req.postDataJSON(); writes.push({ name, body }); pictures[0] = { ...pictures[0], ...body }; }
    return reply(object ? pictures[0] : pictures);
  }
  if (name === "cms_brands") return reply(object ? { id: "brand-1", name: "Space", slug: "space", is_visible: true } : Number(url.searchParams.get("offset") || 0) ? [] : [{ id: "brand-1", name: "Space", slug: "space", is_visible: true }]);
  if (name === "store_categories") return reply(object ? { id: "category-1", name: "Phones", slug: "phones", is_active: true, spec_template: { sections: [] } } : Number(url.searchParams.get("offset") || 0) ? [] : [{ id: "category-1", name: "Phones", slug: "phones", is_active: true, spec_template: { sections: [{ title: "Memory", fields: [{ key: "ram", label: "RAM", unit: "GB" }] }] } }]);
  if (name === "store_collections" || name === "store_collection_products") return reply([]);
  return route.fallback();
});
const page = await context.newPage();
page.on("pageerror", e => errors.push(e.message));
async function noOverflow(label) {
  const metrics = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(metrics.document <= metrics.viewport + 1, `${label}: document overflow ${JSON.stringify(metrics)}`);
}
try {
  await page.goto(`${origin}/dashboard/products/new`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Title", { exact: true }).waitFor();
  for (const width of [320, 360, 375, 390, 430, 600, 768, 980, 1024, 1280, 1440, 1600, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(`add ${width}`);
    if ([390,1440].includes(width)) for (const button of await page.getByRole("navigation", { name: "Product sections", exact: true }).getByRole("button").all()) {
      await button.click();
      assert.ok(await page.evaluate(() => document.activeElement?.hasAttribute("data-product-section")), "section navigation must focus a real section");
    }
    evidence.push({ check: `Add product layout ${width}px${[390,1440].includes(width) ? " and section navigation" : ""}`, result: "PASS" });
    console.log(`Add editor and section navigation passed at ${width}px`);
    if ([390, 1440].includes(width)) { await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: `${output}/add-${width}.png`, fullPage: true }); }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Save as Draft", exact: true }).first().click();
  assert.equal(await page.getByLabel("Title", { exact: true }).getAttribute("aria-invalid"), "true");
  await page.getByLabel("Title", { exact: true }).fill("New test phone");
  await page.getByLabel("Price", { exact: true }).fill("120");
  await page.getByLabel("Stock", { exact: true }).fill("4");
  await page.getByLabel("Category", { exact: true }).selectOption("category-1");
  await page.getByRole("navigation", { name: "Product sections", exact: true }).getByRole("button", { name: "Specifications", exact: true }).click();
  await page.getByLabel("RAM", { exact: true }).fill("fast");
  await page.locator("#product-specifications > summary").click();
  await page.getByRole("button", { name: "Save as Draft", exact: true }).first().click();
  assert.equal(await page.locator("#product-specifications").getAttribute("open"), "");
  await page.waitForFunction(() => document.activeElement?.getAttribute("data-specification-key") === "ram");
  await page.getByLabel("RAM", { exact: true }).fill("8");
  await page.getByRole("button", { name: "Save as Draft", exact: true }).first().click();
  await page.waitForURL(`**/dashboard/products/${productId}`);
  await page.getByRole("button", { name: "Save changes", exact: true }).first().waitFor();
  assert.equal(product.status, "draft");
  evidence.push({ check: "Invalid create, draft save and editor navigation", result: "PASS" });
  await page.getByLabel("Description", { exact: true }).fill("Persisted update");
  failSave = true;
  await page.getByRole("button", { name: "Save changes", exact: true }).first().click();
  await page.getByText(/Temporary save failure/).waitFor();
  assert.equal(await page.locator("[data-sonner-toaster]").count(), 1, "dashboard feedback must have a single toast host");
  assert.equal(await page.getByLabel("Description", { exact: true }).inputValue(), "Persisted update");
  await page.getByRole("button", { name: "Save changes", exact: true }).first().click();
  await page.getByText("Product saved to Supabase.", { exact: true }).last().waitFor();
  await page.reload({ waitUntil: "domcontentloaded" });
  assert.equal(await page.getByLabel("Description", { exact: true }).inputValue(), "Persisted update");
  evidence.push({ check: "Edit save failure recovery and fixture persistence after reload", result: "PASS" });
  await page.getByLabel("Image alternative text 1", { exact: true }).fill("Phone front view");
  await page.getByRole("button", { name: "Save alternative text", exact: true }).click();
  await page.getByText("Image alternative text saved.", { exact: true }).waitFor();
  assert.equal(pictures[0].alt_text, "Phone front view");
  await page.getByRole("button", { name: "Add variant", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add variant", exact: true });
  await dialog.waitFor();
  await dialog.getByLabel("Variant title", { exact: true }).fill("8GB Blue");
  await dialog.getByLabel("Price", { exact: true }).fill("125");
  await dialog.getByRole("button", { name: "Add option", exact: true }).click();
  await dialog.getByLabel("Option name 1", { exact: true }).fill("RAM");
  await dialog.getByLabel("Option value 1", { exact: true }).fill("8GB");
  await dialog.getByRole("button", { name: "Save variant", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(variants.find(v => v.id === "variant-new").options.RAM, "8GB");
  evidence.push({ check: "Alternative text and additional variant options reach existing transports", result: "PASS" });
  for (const width of [320, 360, 375, 390, 430, 600, 768, 980, 1024, 1280, 1440, 1600, 1920]) {
    await page.setViewportSize({ width, height: 800 }); await noOverflow(`edit ${width}`);
    await page.getByRole("button", { name: "Add variant", exact: true }).click();
    const modal = page.getByRole("dialog", { name: "Add variant", exact: true }); await modal.waitFor();
    assert.equal(await modal.evaluate(el => getComputedStyle(el).display), "block");
    await noOverflow(`variant ${width}`);
    await modal.getByRole("button", { name: "Save variant", exact: true }).scrollIntoViewIfNeeded();
    await modal.getByRole("button", { name: "Save variant", exact: true }).focus();
    await page.keyboard.press("Tab"); assert.ok(await modal.evaluate(el => el.contains(document.activeElement)));
    if ([390, 1440].includes(width)) await page.screenshot({ path: `${output}/variant-${width}.png` });
    await page.keyboard.press("Escape"); await modal.waitFor({ state: "hidden" });
    evidence.push({ check: `Edit and variant portal ${width}px, focus trap and Escape`, result: "PASS" });
    console.log(`Edit editor and variant portal passed at ${width}px`);
  }
  await page.setViewportSize({ width: 980, height: 600 });
  await page.getByTitle("العربية", { exact: true }).click();
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl"); await noOverflow("Arabic desktop-site viewport");
  await page.screenshot({ path: `${output}/edit-ar-980.png`, fullPage: true });
  evidence.push({ check: "Arabic RTL at Android desktop-site viewport", result: "PASS" });
  const emulation = await createDashboardBrowser({ viewport: { width: 980, height: 600 }, hasTouch: true, isMobile: false,
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36" });
  try {
    const touchPage = await emulation.context.newPage();
    touchPage.on("pageerror", error => errors.push(error.message));
    await touchPage.goto(`${origin}/dashboard/products/new`, { waitUntil: "domcontentloaded" });
    await touchPage.getByRole("button", { name: "AI Assist", exact: true }).tap();
    const touchDialog = touchPage.getByRole("dialog", { name: "Research, fill and improve", exact: true });
    await touchDialog.getByLabel("Product name / exact model").fill("Phone desktop-site mode");
    assert.equal(await touchDialog.getByRole("button", { name: "Complete form", exact: true }).isEnabled(), true);
    const metrics = await touchPage.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, touch: navigator.maxTouchPoints }));
    assert.ok(metrics.touch > 0 && metrics.scrollWidth <= metrics.width + 1);
    await touchDialog.getByRole("button", { name: "Close AI assistant", exact: true }).tap();
    evidence.push({ check: "Android desktop-site approximation: desktop UA, 980px viewport, touch input and AI controls", result: "PASS" });
  } finally { await emulation.browser.close(); }
  assert.deepEqual(errors, []);
  await writeFile(`${output}/matrix.json`, JSON.stringify({ evidence, writes, runtimeErrors: errors }, null, 2));
  console.log(JSON.stringify({ passed: true, checks: evidence.length, writes: writes.length }));
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
  await writeFile(`${output}/matrix.json`, JSON.stringify({ evidence, writes, runtimeErrors: errors, failure: error.message }, null, 2));
  throw error;
} finally { await browser.close(); }
