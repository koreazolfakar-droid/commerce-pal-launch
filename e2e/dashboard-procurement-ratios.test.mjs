import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../src/dashboard/data/receiving.ts", import.meta.url),
  "utf8",
);
const file = ts.createSourceFile("receiving.ts", source, ts.ScriptTarget.Latest, true);
const declaration = file.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === "buildProcurementAnalytics",
);
assert.ok(declaration);
const js = ts.transpileModule(declaration.getText(file).replace(/^export /, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
const build = new Function(`${js}\nreturn buildProcurementAnalytics;`)();
const po = (id, status, expectedAt) => ({
  id,
  status,
  expectedAt,
  supplierId: "supplier",
  supplierName: "Supplier",
  grandTotal: 10,
  exchangeRate: 1,
});
const receipt = (id, date, stockUnits = 10, damagedUnits = 0, status = "approved") => ({
  purchaseOrderId: id,
  status,
  approvedAt: date,
  receivedAt: date,
  stockUnits,
  damagedUnits,
});

test("procurement ratios report unavailable when no eligible data exists", () => {
  const result = build({ purchaseOrders: [po("open", "ordered", null)], receivings: [] });
  assert.equal(result.damageRate, null);
  assert.equal(result.supplierSpend[0].onTimeRate, null);
});

test("on-time rate counts only completed orders with valid expected and receipt dates", () => {
  const result = build({
    purchaseOrders: [
      po("early", "received", "2026-01-10"),
      po("late", "closed", "2026-01-10"),
      po("missing", "received", null),
      po("partial", "partially_received", "2026-01-10"),
      po("cancelled", "cancelled", "2026-01-10"),
    ],
    receivings: [
      receipt("early", "2026-01-09", 8, 2),
      receipt("late", "2026-01-11"),
      receipt("missing", "2026-01-08"),
      receipt("partial", "2026-01-08"),
      receipt("cancelled", "2026-01-08", 0, 0, "draft"),
    ],
  });
  assert.equal(result.supplierSpend[0].completedPoCount, 3);
  assert.equal(result.supplierSpend[0].onTimeRate, 0.5);
  assert.equal(result.damageRate, 2 / 40);
});

test("a recorded delivery with no damage reports zero rather than no data", () => {
  const result = build({
    purchaseOrders: [po("delivered", "received", "2026-01-10T10:00:00Z")],
    receivings: [receipt("delivered", "2026-01-10T10:00:00Z", 5, 0)],
  });
  assert.equal(result.damageRate, 0);
  assert.equal(result.supplierSpend[0].onTimeRate, 1);
});

test("reorder suggestions preserve draft status and subtract outstanding eligible PO units", () => {
  const suggestionDeclaration = file.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === "buildReorderSuggestions",
  );
  const code = ts.transpileModule(suggestionDeclaration.getText(file).replace(/^export /, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const suggest = new Function(`${code}\nreturn buildReorderSuggestions;`)();
  const result = suggest(
    {
      productOptions: [
        {
          key: "variant",
          productId: "product",
          variantId: "variant",
          title: "Draft phone",
          sku: "SKU",
          productStatus: "draft",
          currentStock: 2,
        },
      ],
      purchaseOrders: [
        {
          status: "ordered",
          createdAt: "2026-01-01",
          items: [{ productId: "product", variantId: "variant", remainingQuantity: 3 }],
        },
        {
          status: "cancelled",
          createdAt: "2026-01-02",
          items: [{ productId: "product", variantId: "variant", remainingQuantity: 5 }],
        },
      ],
    },
    10,
  );
  assert.equal(result[0].onOrder, 3);
  assert.equal(result[0].suggestedQuantity, 5);
  assert.equal(result[0].productStatus, "draft");
});
