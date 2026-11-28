// Exercise the real inventory UI with staff authentication and a local, intercepted stock ledger.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";

const origin = process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173";
const { browser, context } = await createDashboardBrowser();
const variants = [
  { variant_id: "blue", variant_title: "Blue", stock: 10, track_inventory: true },
  { variant_id: "black", variant_title: "Black", stock: 4, track_inventory: true },
  { variant_id: "silver", variant_title: "Silver", stock: 8, track_inventory: true },
  { variant_id: "green", variant_title: "Green", stock: 9, track_inventory: true },
  { variant_id: "display", variant_title: "Display sample", stock: 0, track_inventory: false },
].map((row) => ({
  ...row,
  sku: "SC-" + row.variant_id,
  barcode: "961-" + row.variant_id,
  variant_active: true,
  options: {},
}));
const product = {
  product_id: "phone",
  product_name: "Test phone",
  brand: "Test",
  category: "Phones",
  product_status: "active",
  total_count: 1,
  variants,
};
const requests = [];
await context.route("**/rpc/dashboard_inventory_products_page", (route) =>
  route.fulfill({ json: [product] }),
);
await context.route("**/rpc/dashboard_inventory_summary", (route) =>
  route.fulfill({
    json: [
      {
        total_units: variants.reduce((sum, v) => sum + v.stock, 0),
        variant_count: variants.length,
        low_count: variants.filter((v) => v.track_inventory && v.stock > 0 && v.stock <= 10).length,
        out_count: variants.filter((v) => v.track_inventory && v.stock === 0).length,
      },
    ],
  }),
);
await context.route("**/rest/v1/store_product_variants?*", (route) => {
  const url = new URL(route.request().url());
  assert.equal(url.searchParams.get("product_id"), "eq.phone");
  assert.equal(url.searchParams.get("id"), "eq.black");
  const row = variants[1];
  return route.fulfill({
    json: [{ stock_quantity: row.stock, track_inventory: row.track_inventory }],
  });
});
await context.route("**/rpc/set_store_inventory_stock_v2", async (route) => {
  const args = route.request().postDataJSON();
  requests.push(args);
  const variant = variants.find((v) => v.variant_id === args.p_variant_id);
  assert.ok(variant.track_inventory);
  if (args.p_expected_stock !== variant.stock) {
    return route.fulfill({ status: 409, json: { message: "inventory_stock_conflict" } });
  }
  variant.stock = args.p_stock;
  return route.fulfill({ json: [{ new_stock: variant.stock, movement_id: "test-movement" }] });
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
async function csv(button) {
  const pending = page.waitForEvent("download");
  await button.click();
  const download = await pending;
  return readFile(await download.path(), "utf8");
}
try {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(origin + "/dashboard/inventory");
  const start = page.getByRole("button", { name: "Start cycle count" });
  const register = await csv(page.getByRole("button", { name: "Export page" }));
  assert.match(register, /SC-display/);
  await start.click();
  const dialog = page.getByRole("dialog");
  const sheet = await csv(dialog.getByRole("button", { name: "Export worksheet" }));
  assert.match(sheet, /Opening balance/);
  assert.doesNotMatch(sheet, /SC-display/);
  const count = (sku) =>
    dialog.getByRole("textbox", { name: new RegExp("Counted .*SC-" + sku + "$") });
  const review = dialog.getByRole("button", { name: "Review count" });
  assert.ok(await review.isDisabled());
  await count("blue").fill("-2");
  assert.ok(await review.isDisabled());
  await count("blue").fill("٢١٤٧٤٨٣٦٤٨");
  assert.ok(await review.isDisabled());
  await count("blue").fill("٠");
  await count("black").fill("۶");
  await count("silver").fill("8");
  page.once("dialog", (d) => d.dismiss());
  await page.keyboard.press("Escape");
  assert.ok(await dialog.isVisible());
  await review.click();
  assert.equal(requests.length, 0);
  assert.equal(await dialog.locator(".count-line").count(), 2);
  await dialog.getByLabel("Count note").fill("Shelf A");
  // Another staff member changes the second balance after this worksheet was opened.
  variants[1].stock = 5;
  await dialog.getByRole("button", { name: "Post adjustments" }).click();
  await dialog.getByRole("alert").waitFor();
  assert.deepEqual(
    requests.map((a) => [a.p_variant_id, a.p_expected_stock, a.p_stock]),
    [
      ["blue", 10, 0],
      ["black", 4, 6],
    ],
  );
  assert.ok(requests.every((a) => a.p_note.includes("Shelf A")));
  assert.ok(await dialog.getByRole("button", { name: "Post adjustments" }).isDisabled());
  await dialog.getByRole("button", { name: "Reload balance and recount" }).click();
  assert.equal(await count("black").inputValue(), "");
  await count("black").fill("7");
  await review.click();
  await dialog.getByRole("button", { name: "Post adjustments" }).click();
  await dialog.getByRole("heading", { name: "Count complete" }).waitFor();
  assert.deepEqual(
    requests.map((a) => [a.p_variant_id, a.p_expected_stock, a.p_stock]),
    [
      ["blue", 10, 0],
      ["black", 4, 6],
      ["black", 5, 7],
    ],
  );
  const finalSheet = await csv(dialog.getByRole("button", { name: "Export worksheet" }));
  assert.match(finalSheet, /"10","0","-10","Yes","Shelf A"/);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  // An entirely matching count closes cleanly without generating a movement.
  await start.click();
  await count("blue").fill("0");
  await review.click();
  await dialog.getByRole("button", { name: "Finish count" }).click();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  assert.equal(requests.length, 3);
  // A removed or inaccessible variant must not strand unrelated drafts.
  await start.click();
  await count("black").fill("2");
  await count("green").fill("11");
  variants[1].stock = 3;
  await review.click();
  await dialog.getByRole("button", { name: "Post adjustments" }).click();
  await dialog.getByRole("button", { name: "Leave this entry uncounted" }).click();
  await review.click();
  await dialog.getByRole("button", { name: "Post adjustments" }).click();
  await dialog.getByRole("heading", { name: "Count complete" }).waitFor();
  assert.deepEqual(
    requests.slice(-2).map((a) => [a.p_variant_id, a.p_expected_stock, a.p_stock]),
    [
      ["black", 7, 2],
      ["green", 9, 11],
    ],
  );
  assert.equal(variants[1].stock, 3);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
  await page.getByRole("button", { name: "AR", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole("button", { name: "بدء جرد دوري" }).click();
  await dialog.getByRole("heading", { name: "الجرد الدوري" }).waitFor();
  assert.ok(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  assert.deepEqual(errors, []);
  console.log(
    "Verified count scope, exports, validation, zero, unchanged and blank quantities, conflict recovery, partial posting, Arabic RTL and the mobile dialog.",
  );
} finally {
  await browser.close();
}
