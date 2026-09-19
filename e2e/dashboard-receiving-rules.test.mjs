import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

const source = await readFile(
  new URL("../src/dashboard/data/receivingRules.ts", import.meta.url),
  "utf8",
);
const { previewReceivingLine } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
);
const preview = (overrides = {}) => previewReceivingLine({
  remainingQuantity: 10,
  receivedQuantity: 10,
  damagedQuantity: 0,
  ...overrides,
});

test("complete receipt increases stock by usable units", () => {
  const result = preview();
  assert.equal(result.stockIncrease, 10);
  assert.equal(result.missingQuantity, 0);
  assert.equal(result.difference, 0);
  assert.equal(result.canSubmit, true);
});

test("six usable plus two damaged out of ten leaves two missing", () => {
  const result = preview({ receivedQuantity: 6, damagedQuantity: 2 });
  assert.equal(result.stockIncrease, 6);
  assert.equal(result.deliveredQuantity, 8);
  assert.equal(result.damagedQuantity, 2);
  assert.equal(result.missingQuantity, 2);
  assert.equal(result.difference, -2);
  assert.equal(result.remainingUsableQuantity, 4);
  assert.equal(result.canSubmit, true);
});

test("all-damaged delivery is recorded with no stock increase", () => {
  const result = preview({ receivedQuantity: 0, damagedQuantity: 10 });
  assert.equal(result.stockIncrease, 0);
  assert.equal(result.missingQuantity, 0);
  assert.equal(result.remainingUsableQuantity, 10);
  assert.equal(result.canSubmit, true);
});

test("excess delivery needs both explicit confirmation and a nonblank reason", () => {
  for (const overrides of [{}, { overageConfirmed: true }, { overageReason: "Extra unit" },
    { overageConfirmed: true, overageReason: "  \n " },
    { overageConfirmed: "true", overageReason: "Extra unit" }]) {
    assert.equal(preview({ receivedQuantity: 11, ...overrides }).canSubmit, false);
  }
  const result = preview({ receivedQuantity: 11, overageConfirmed: true, overageReason: " Extra unit " });
  assert.equal(result.canSubmit, true);
  assert.equal(result.overageQuantity, 1);
  assert.equal(result.overageReason, "Extra unit");
  assert.equal(result.missingQuantity, 0);
});

test("damaged units cannot hide a physical overdelivery", () => {
  const result = preview({ damagedQuantity: 1 });
  assert.equal(result.requiresOverageConfirmation, true);
  assert.equal(result.overageQuantity, 1);
  assert.equal(result.canSubmit, false);
});

test("partial receipts use the current remaining quantity", () => {
  const result = preview({ remainingQuantity: 4, receivedQuantity: 5 });
  assert.equal(result.overageQuantity, 1);
  assert.equal(result.canSubmit, false);
});

test("a fully received PO requires confirmation for any additional delivery", () => {
  assert.equal(preview({ remainingQuantity: 0, receivedQuantity: 1 }).canSubmit, false);
});

test("empty receipt cannot be approved", () => {
  assert.equal(preview({ receivedQuantity: 0 }).canSubmit, false);
});

test("reject invalid quantities and combined overflow", () => {
  for (const field of ["remainingQuantity", "receivedQuantity", "damagedQuantity"]) {
    for (const value of [-1, 0.5, NaN, Infinity, 2147483648, "2", null, undefined]) {
      assert.throws(() => preview({ [field]: value }));
    }
  }
  assert.throws(() => preview({ receivedQuantity: 2147483647, damagedQuantity: 1 }));
});

test("bound audit reasons and discard irrelevant reasons", () => {
  assert.equal(preview({ receivedQuantity: 11, overageConfirmed: true, overageReason: "x".repeat(501) }).canSubmit, false);
  assert.equal(preview({ overageReason: "old reason" }).overageReason, null);
});
