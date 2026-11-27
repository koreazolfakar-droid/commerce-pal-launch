import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const inventorySource = await readFile(new URL("../src/dashboard/data/inventory.ts", import.meta.url), "utf8");
const pageSource = await readFile(new URL("../src/dashboard/pages/InventoryManagerPage.tsx", import.meta.url), "utf8");
const groupedSource = await readFile(new URL("../src/dashboard/components/inventory/InventoryGroupedList.tsx", import.meta.url), "utf8");
const migration = await readFile(
  new URL("../supabase/migrations/20261111014326_dashboard_inventory_complete_product_groups.sql", import.meta.url),
  "utf8",
);

function loadPageUsing(mockRpc) {
  const begin = inventorySource.indexOf("export async function loadInventoryPage(");
  const end = inventorySource.indexOf("export async function loadInventorySummary(", begin);
  assert.ok(begin >= 0 && end > begin);
  const source = inventorySource.slice(begin, end);
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exported = {};
  new Function("exports", "requireDashboardStaff", "supabase", "throwIfError", "optionsLabel", js)(
    exported,
    async () => "editor",
    { rpc: mockRpc },
    (error, message) => { if (error) throw new Error(message); },
    (options) => Object.entries(options ?? {}).map(([k, v]) => k + ": " + v).join(" · "),
  );
  return exported.loadInventoryPage;
}

const makeVariant = (id, stock) => ({
  variant_id: id,
  variant_title: "Color " + id,
  sku: "SKU-" + id,
  barcode: "B-" + id,
  image: "",
  stock,
  track_inventory: true,
  variant_active: true,
  options: { color: id },
});
const makeProduct = (id, variants, totalCount) => ({
  product_id: id,
  product_name: "Product " + id,
  brand: "Space",
  category_id: null,
  category: "Accessories",
  image: "product.jpg",
  product_stock: 20,
  product_status: "active",
  variants,
  total_count: totalCount,
});

test("products are paged, not variants; every color stays with its parent", async () => {
  const seen = [];
  const loadPage = loadPageUsing(async (name, args) => {
    seen.push({ name, args });
    assert.equal(name, "dashboard_inventory_products_page");
    return {
      data: [
        makeProduct("p1", [makeVariant("black", 2), makeVariant("silver", 3), makeVariant("red", 4)], 125),
        makeProduct("p2", [makeVariant("blue", 1)], 125),
      ],
      error: null,
    };
  });
  const result = await loadPage({ page: 2, pageSize: 20, category: "all", search: "iphone" });
  assert.equal(result.paginationMode, "products");
  assert.equal(result.totalCount, 125);
  assert.equal(result.productCountOnPage, 2);
  assert.equal(result.items.length, 4);
  assert.deepEqual(result.items.filter((row) => row.productId === "p1").map((row) => row.variantId),
    ["black", "silver", "red"]);
  assert.equal(result.items[0].stock, 2);
  assert.equal(result.items[0].image, "product.jpg");
  assert.equal(result.items[0].optionsLabel, "color: black");
  assert.equal(seen[0].args.p_page, 2);
  assert.equal(seen[0].args.p_page_size, 20);
  assert.equal(seen[0].args.p_search, "iphone");
});

test("legacy RPC fallback never labels partial groups as complete", async () => {
  const calls = [];
  const loadPage = loadPageUsing(async (name) => {
    calls.push(name);
    if (name === "dashboard_inventory_products_page") return { data: null, error: { code: "PGRST202" } };
    return { data: [{
      product_id: "p1", variant_id: "black", product_name: "Lens",
      variant_title: "Black", brand: "", category_id: null,
      category: "Accessories", sku: "SKU-1", barcode: "",
      image: "", stock: 1, product_stock: 4,
      track_inventory: true, variant_active: true,
      product_status: "active", options: {}, total_count: 417,
    }], error: null };
  });
  const result = await loadPage({ pageSize: 20 });
  assert.deepEqual(calls, ["dashboard_inventory_products_page", "dashboard_inventory_page"]);
  assert.equal(result.paginationMode, "variants");
  assert.equal(result.productCountOnPage, 1);
  assert.equal(result.totalCount, 417);
});

test("authorization or unexpected RPC errors must not silently fall back", async () => {
  const calls = [];
  const loadPage = loadPageUsing(async (name) => {
    calls.push(name);
    return { data: null, error: { code: "42501", message: "permission denied" } };
  });
  await assert.rejects(loadPage({}), /Loading grouped inventory failed/);
  assert.deepEqual(calls, ["dashboard_inventory_products_page"]);
});

test("new RPC is read-only, invoker-secured, and paginates distinct products", () => {
  assert.match(migration, /security invoker/i);
  assert.match(migration, /set search_path to ''/i);
  assert.match(migration, /private\.is_dashboard_staff\(\)/);
  assert.match(migration, /exists\s*\(/i);
  assert.match(migration, /count\(\*\) over\(\)/i);
  assert.match(migration, /jsonb_agg\(/i);
  assert.match(migration, /order by v\.sort_order nulls last, v\.id/i);
  assert.match(migration, /grant execute on function public\.dashboard_inventory_products_page\([\s\S]*?to authenticated, service_role/i);
  assert.doesNotMatch(migration, /\b(update|delete|insert)\s+(public\.)?store_product_variants\b/i);
  assert.match(pageSource, /pageResult\.productCountOnPage/);
  assert.match(groupedSource, /props\.completeGroups/);
});
