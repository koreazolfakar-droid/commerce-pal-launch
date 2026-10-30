import assert from "node:assert/strict";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";
const { browser, context } = await createDashboardBrowser();
const origin = process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173";
let stock = 12;
const writes = [];
const product = {
  id: "product-1",
  title: "Test Phone",
  handle: "test-phone",
  description: "Verified device",
  base_price: 100,
  stock_quantity: 12,
  status: "draft",
  sku: "SKU",
  barcode: "",
  brand_id: null,
  category_id: "category-1",
  specifications: { memory: "256 GB" },
};
await context.route("**/rest/v1/**", async (route) => {
  const req = route.request(),
    u = new URL(req.url()),
    name = u.pathname.split("/").at(-1);
  const json = (data) => route.fulfill({ json: data });
  if (Number(u.searchParams.get("offset") || 0) > 0) return json([]);
  if (name === "dashboard_inventory_page")
    return json([
      {
        product_id: product.id,
        variant_id: "variant-1",
        product_name: product.title,
        variant_title: "Black",
        brand: "Test",
        category_id: "category-1",
        category: "Phones",
        sku: "SKU",
        stock,
        product_stock: stock,
        track_inventory: true,
        variant_active: true,
        product_status: "draft",
        options: {},
        total_count: 1,
      },
    ]);
  if (name === "dashboard_inventory_summary")
    return json([{ total_units: stock, variant_count: 1, low_count: 0, out_count: 0 }]);
  if (name === "set_store_inventory_stock_v2") {
    const args = req.postDataJSON();
    writes.push(args);
    stock = args.p_stock;
    return json([{ new_stock: stock }]);
  }
  if (name === "store_categories")
    return json([
      {
        id: "category-1",
        name: "Phones",
        slug: "phones",
        is_active: true,
        spec_template: {
          sections: [
            {
              title: "Hardware",
              fields: [
                { key: "memory", label: "Memory" },
                { key: "battery", label: "Battery" },
              ],
            },
          ],
        },
      },
    ]);
  if (name === "store_products")
    return json(req.headers().accept?.includes("vnd.pgrst.object") ? product : [product]);
  if (
    [
      "cms_brands",
      "store_product_variants",
      "store_product_images",
      "store_collections",
      "store_collection_products",
      "store_inventory_movements",
    ].includes(name)
  )
    return json([]);
  return route.fallback();
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(origin + "/dashboard/inventory");
  const input = page.getByRole("spinbutton", { name: "Set stock for Test Phone" });
  await input.fill("");
  await input.blur();
  assert.equal(writes.length, 0);
  await input.fill("0");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  assert.equal(writes.length, 0);
  await dialog.getByRole("textbox", { name: "Adjustment reason" }).fill("Physical count");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].p_stock, 0);
  assert.equal(writes[0].p_expected_stock, 12);
  assert.equal(writes[0].p_note, "Physical count");
  await page.goto(origin + "/dashboard/products/product-1");
  const search = page.getByRole("textbox", { name: "Search specifications" });
  await search.waitFor();
  assert.equal(
    await page.getByRole("textbox", { name: "Memory", exact: true }).inputValue(),
    "256 GB",
  );
  await page.getByRole("checkbox", { name: "Missing fields only" }).check();
  assert.equal(await page.getByRole("textbox", { name: "Memory", exact: true }).count(), 0);
  await page.getByRole("textbox", { name: "Battery", exact: true }).fill("5000 mAh");
  await page.getByRole("checkbox", { name: "Missing fields only" }).uncheck();
  assert.equal(
    await page.getByRole("textbox", { name: "Memory", exact: true }).inputValue(),
    "256 GB",
  );
  assert.equal(
    await page.getByRole("textbox", { name: "Battery", exact: true }).inputValue(),
    "5000 mAh",
  );
  await search.fill("nonexistent");
  assert.equal(await page.getByRole("textbox", { name: "Memory", exact: true }).count(), 0);
  await search.fill("");
  assert.equal(
    await page.getByRole("textbox", { name: "Memory", exact: true }).inputValue(),
    "256 GB",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS explicit stock save, blank protection, reason, zero, version snapshot and specification filters preserve values",
  );
} catch (error) {
  console.log((await page.locator("body").innerText()).slice(-4000));
  console.log(errors);
  throw error;
} finally {
  await browser.close();
}
