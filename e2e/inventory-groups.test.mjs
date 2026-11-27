import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const groupSource = await readFile(
  new URL("../src/dashboard/components/inventory/groupInventoryRows.ts", import.meta.url),
  "utf8",
);
const groupComponent = await readFile(
  new URL("../src/dashboard/components/inventory/InventoryGroupedList.tsx", import.meta.url),
  "utf8",
);
const inventoryPage = await readFile(
  new URL("../src/dashboard/pages/InventoryManagerPage.tsx", import.meta.url),
  "utf8",
);
const output = ts.transpileModule(groupSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const exported = {};
new Function("exports", output)(exported);
const { groupInventoryRows } = exported;

function variant(productId, variantId, stock, overrides = {}) {
  return {
    productId,
    variantId,
    productName: "Same text can describe different catalog products",
    variantTitle: "Test variant",
    image: "",
    category: "Accessories",
    brand: "",
    sku: "",
    trackInventory: true,
    stock,
    ...overrides,
  };
}

test("variants sharing a canonical product ID appear under one group", () => {
  const groups = groupInventoryRows([
    variant("product-a", "black", 1),
    variant("product-a", "silver", 2, { image: "variant.jpg" }),
    variant("product-b", "blue", 3),
  ], 2);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].variants.map((row) => row.variantId), ["black", "silver"]);
  assert.equal(groups[0].visibleTrackedUnits, 3);
  assert.equal(groups[0].lowCount, 2);
  assert.equal(groups[0].image, "variant.jpg");
  assert.equal(groups[1].visibleTrackedUnits, 3);
});

test("different product IDs never collapse just because titles or SKU match", () => {
  const groups = groupInventoryRows([
    variant("first", "a", 5, { sku: "SAME" }),
    variant("second", "b", 5, { sku: "SAME" }),
  ], 10);
  assert.equal(groups.length, 2);
});

test("not-tracked variants and zero-stock variants remain distinct", () => {
  const [group] = groupInventoryRows([
    variant("product", "not-tracked", 500, { trackInventory: false }),
    variant("product", "empty", 0),
    variant("product", "low", 3),
  ], 5);
  assert.equal(group.trackedCount, 2);
  assert.equal(group.visibleTrackedUnits, 3);
  assert.equal(group.outCount, 1);
  assert.equal(group.lowCount, 1);
});

test("grouping a paginated result never manufactures missing variants or a full-product total", () => {
  const [group] = groupInventoryRows([
    variant("product", "visible", 4),
  ], 5);
  assert.equal(group.visibleTrackedUnits, 4);
  assert.deepEqual(group.variants.map((row) => row.variantId), ["visible"]);
  assert.match(groupSource, /current server-paginated page/);
  assert.match(groupComponent, /Variants on this page/);
  assert.match(groupComponent, /On hand · this page/);
});

test("grouped UI retains independent RPC-backed stock controls and history", () => {
  assert.match(inventoryPage, /adjustInventoryDelta\(/);
  assert.match(inventoryPage, /setInventoryStock\(/);
  assert.match(inventoryPage, /useDashboardUnsavedChanges\(inventoryDirty\)/);
  assert.match(inventoryPage, /InventoryGroupedList/);
  assert.match(inventoryPage, /InventoryMovementHistoryDrawer/);
  assert.match(groupComponent, /key=\{row\.variantId\}/);
  assert.match(groupComponent, /onChangeBy\(row, -1\)/);
  assert.match(groupComponent, /onChangeBy\(row, 1\)/);
  assert.match(groupComponent, /onCommit\(row\)/);
  assert.match(groupComponent, /onHistory\(row\)/);
  assert.match(groupComponent, /aria-expanded=\{isOpen\}/);
});
