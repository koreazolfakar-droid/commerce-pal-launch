import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";

const origin = process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173";
const { browser, context } = await createDashboardBrowser();
const variants = [
  ["blue", "Blue", 5, true],
  ["black", "Black", 0, true],
  ["sample", "Display unit", 0, false],
].map(([id, title, stock, tracked]) => ({
  variant_id: id,
  variant_title: title,
  stock,
  track_inventory: tracked,
  sku: "SC-" + id,
  barcode: "961-" + id,
  options: {},
  variant_active: true,
}));
const requests = [];
const writes = [];
await context.route("**/rpc/dashboard_inventory_products_page", (route) => {
  const args = route.request().postDataJSON();
  requests.push(args);
  const text = (args.p_search || "").toLowerCase();
  const matches = variants.some(
    (v) =>
      (!args.p_only_low || (v.track_inventory && v.stock <= args.p_threshold)) &&
      ("warehouse phone " + v.variant_title + " " + v.sku + " " + v.barcode)
        .toLowerCase()
        .includes(text),
  );
  return route.fulfill({
    json:
      matches && (!args.p_category_id || args.p_category_id === "phones")
        ? [
            {
              product_id: "phone",
              product_name: "Warehouse phone",
              brand: "Space Call",
              category: "Phones",
              category_id: "phones",
              product_status: "active",
              variants,
              total_count: 1,
            },
          ]
        : [],
  });
});
await context.route("**/rpc/dashboard_inventory_summary", (route) =>
  route.fulfill({ json: [{ total_units: 5, variant_count: 3, low_count: 1, out_count: 1 }] }),
);
await context.route("**/rest/v1/store_categories?*", (route) =>
  route.fulfill({ json: [{ id: "phones", name: "Phones" }] }),
);
await context.route("**/rest/v1/store_product_variants?*", (route) => {
  const params = new URL(route.request().url()).searchParams;
  assert.equal(params.get("product_id"), "eq.phone");
  assert.equal(params.get("id"), "eq.blue");
  return route.fulfill({ json: [{ stock_quantity: variants[0].stock, track_inventory: true }] });
});
await context.route("**/rpc/set_store_inventory_stock_v2", async (route) => {
  const args = route.request().postDataJSON();
  writes.push(args);
  const variant = variants.find((v) => v.variant_id === args.p_variant_id);
  assert.ok(variant.track_inventory);
  if (variant.stock !== args.p_expected_stock)
    return route.fulfill({ status: 409, json: { message: "inventory_stock_conflict" } });
  variant.stock = args.p_stock;
  return route.fulfill({ json: [{ new_stock: variant.stock, movement_id: "qa-movement" }] });
});
await context.route("**/rest/v1/store_inventory_movements?*", (route) => {
  const params = new URL(route.request().url()).searchParams;
  if (!params.has("product_id")) return route.fulfill({ json: [] });
  assert.equal(params.get("variant_id"), "eq.blue");
  return route.fulfill({
    json: [
      {
        id: "qa-history",
        variant_id: "blue",
        product_id: "phone",
        movement_type: "adjustment",
        quantity_delta: -2,
        reference_type: "manual_dashboard",
        reference_id: "qa-ref",
        note: "Damaged item · Shelf A",
        created_at: "2026-11-28T10:30:00Z",
        created_by: null,
      },
    ].filter(
      (entry) =>
        !params.has("movement_type") || params.get("movement_type") === "eq." + entry.movement_type,
    ),
  });
});

const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const register = page.getByRole("region", { name: "Stock register" });
const button = (name) => page.getByRole("button", { name, exact: true });
const search = page.getByRole("textbox", { name: /Search product, variant, SKU/ });
const product = register.getByRole("button", { name: /Warehouse phone .*Phones/ });
const out = register.getByRole("button", { name: "Out of stock", exact: true });
const blueAdjust = register.getByRole("button", { name: "Adjust stock · Warehouse phone — Blue" });
const dialog = page.getByRole("dialog");
async function csv(control) {
  const pending = page.waitForEvent("download");
  await control.click();
  const download = await pending;
  return readFile(await download.path(), "utf8");
}

try {
  await page.setViewportSize({ width: 1200, height: 920 });
  await page.goto(origin + "/dashboard/inventory?attention=out&threshold=7");
  await register.getByText("Black", { exact: true }).waitFor();
  assert.equal(await out.getAttribute("aria-pressed"), "true");
  assert.equal(requests.at(-1).p_threshold, 0);
  assert.equal(await register.getByText("Blue", { exact: true }).count(), 0);
  const shortage = await csv(button("Export page"));
  assert.match(shortage, /SC-black/);
  assert.doesNotMatch(shortage, /SC-blue|SC-sample/);
  await button("Show other variants").click();
  if ((await product.getAttribute("aria-expanded")) !== "true") await product.click();
  await register.getByText("Blue", { exact: true }).waitFor();
  await button("All stock").click();
  await page.waitForURL(/threshold=7$/);
  await button("Start cycle count").waitFor({ state: "visible" });
  assert.equal(await button("All stock").getAttribute("aria-pressed"), "true");
  assert.equal(requests.at(-1).p_threshold, 7);
  await button("Advanced inventory filters").click();
  await page.getByRole("combobox", { name: "All categories" }).selectOption("phones");
  await button("Remove category filter").click();
  assert.ok(!(await page.getByRole("button", { name: "Remove category filter" }).count()));
  await button("Advanced inventory filters").click();

  await search.fill("961-blue");
  await search.press("Enter");
  await register.getByText("Exact match", { exact: true }).waitFor();
  assert.equal(requests.at(-1).p_search, "961-blue");
  await search.press("Escape");
  assert.equal(await search.inputValue(), "");
  await button("Select variants").click();
  if ((await product.getAttribute("aria-expanded")) !== "true") await product.click();
  const selectBlue = register.getByRole("checkbox", {
    name: /Select variant · Warehouse phone — Blue/,
  });
  const groupCheck = register.getByRole("checkbox", { name: /Select product variants/ });
  await selectBlue.check();
  assert.equal(await groupCheck.getAttribute("aria-checked"), "mixed");
  assert.equal(await register.getByRole("checkbox", { name: /Display unit/ }).count(), 0);
  const selection = await csv(button("Export selection"));
  assert.match(selection, /SC-blue/);
  assert.doesNotMatch(selection, /SC-black|SC-sample/);
  await button("Count selection").click();
  await dialog.getByRole("heading", { name: "Cycle count" }).waitFor();
  assert.equal(await dialog.getByRole("textbox", { name: /Counted .*SC-blue/ }).count(), 1);
  assert.equal(await dialog.getByRole("textbox", { name: /Counted .*SC-black/ }).count(), 0);
  await page.keyboard.press("Escape");
  await button("Select current page").click();
  assert.equal(await groupCheck.getAttribute("aria-checked"), "true");
  await button("Done").click();

  await blueAdjust.click();
  const save = dialog.getByRole("button", { name: "Save adjustment" });
  const quantity = dialog.getByRole("textbox", { name: "Quantity" });
  const reason = dialog.getByRole("combobox", { name: "Adjustment reason" });
  await dialog.getByRole("button", { name: "Remove units" }).click();
  await quantity.fill("٦");
  await reason.selectOption("Damaged item");
  assert.ok(await dialog.getByText("The adjustment exceeds available stock.").isVisible());
  assert.ok(await save.isDisabled());
  await quantity.fill("٢");
  await dialog.getByRole("textbox", { name: "Optional note" }).fill("Shelf A");
  await dialog.getByText("Balance after adjustment").waitFor();
  assert.equal(writes.length, 0);
  variants[0].stock = 6;
  await save.click();
  await dialog.getByRole("alert").waitFor();
  assert.ok(await save.isDisabled());
  await dialog.getByRole("button", { name: "Reload current balance" }).click();
  await dialog.getByRole("alert").waitFor({ state: "hidden" });
  assert.equal(await quantity.inputValue(), "");
  await quantity.fill("۲");
  await save.click();
  await dialog.waitFor({ state: "hidden" });
  assert.deepEqual(
    writes.map((rpc) => [rpc.p_expected_stock, rpc.p_stock]),
    [
      [5, 3],
      [6, 4],
    ],
  );
  assert.equal(writes[1].p_note, "Damaged item · Shelf A");

  await register
    .getByRole("button", { name: /View inventory history for Warehouse phone — Blue/ })
    .click();
  const movementCsv = await csv(dialog.getByRole("button", { name: "Export loaded movements" }));
  assert.match(
    movementCsv,
    /"Adjustment","-2","Manual dashboard","qa-ref","Damaged item · Shelf A"/,
  );
  await dialog
    .getByRole("combobox", { name: "Filter inventory movement history by type" })
    .selectOption("sale");
  await dialog.getByText("No movements match these filters").waitFor();
  assert.equal(await dialog.getByRole("button", { name: "Export loaded movements" }).count(), 0);
  await page.keyboard.press("Escape");

  const blue = register.locator(".inventory-variant").filter({
    has: page.getByRole("button", { name: "Adjust stock · Warehouse phone — Blue" }),
  });
  await blue.getByRole("button", { name: "Quick edits" }).click();
  const inline = blue.getByRole("spinbutton", { name: /Set stock/ });
  await inline.fill("7");
  await inline.blur();
  assert.equal(writes.length, 2);
  await blue.getByRole("button", { name: "Cancel" }).click();
  assert.equal(await inline.inputValue(), "4");

  await page.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
  await page.getByRole("button", { name: "AR", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole("button", { name: /تعديل المخزون · Warehouse phone — Blue/ }).click();
  await dialog.getByRole("heading", { name: "تعديل المخزون" }).waitFor();
  assert.ok(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  assert.deepEqual(errors, []);
  console.log(
    "Verified focused stock views, scanner Enter, selections, audited stock adjustment, conflict recovery, history CSV, explicit quick edits and Arabic dark mobile.",
  );
} finally {
  await browser.close();
}
