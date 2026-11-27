import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const [model, migration] = await Promise.all([
  readFile(new URL("../src/lib/productSpecifications.ts", import.meta.url), "utf8"),
  readFile(
    new URL("../supabase/migrations/20261021193000_product_editor_specifications_shape_compat.sql", import.meta.url),
    "utf8",
  ),
]);

function loadSpecificationModule(source) {
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const result = {};
  new Function("exports", js)(result);
  return result;
}

test("specification reader supports historical structured JSON and flat editor values", () => {
  const { normalizeProductSpecifications } = loadSpecificationModule(model);
  const template = {
    sections: [{
      title: "Power",
      fields: [{ key: "charging_power", label: "Power", unit: "W" }],
    }],
  };
  const plain = { charging_power: "30 W" };
  const stored = { values: plain, keySpecs: ["charging_power"] };

  assert.deepEqual(normalizeProductSpecifications(plain, template), plain);
  assert.deepEqual(normalizeProductSpecifications(stored, template), plain);
  assert.deepEqual(normalizeProductSpecifications(stored), plain);
  assert.deepEqual(
    normalizeProductSpecifications({ values: {}, keySpecs: [] }, template),
    {},
  );
  assert.deepEqual(
    normalizeProductSpecifications(
      { values: { charging_power: "30 W", unwanted_field: "no" }, keySpecs: [] },
      template,
    ),
    plain,
  );
});

test("stock-safe atomic product save uses the existing database document shape", () => {
  assert.match(migration, /security invoker/);
  assert.match(migration, /not private\.is_dashboard_staff\(\)/);
  assert.match(migration, /p_expected_stock integer/);
  assert.match(migration, /product_editor_stock_conflict/);
  assert.match(migration, /specifications = v_stored_specifications/);
  assert.match(migration, /'values', v_specifications/);
  assert.match(migration, /'keySpecs', '\[\]'::jsonb/);
  assert.match(migration, /v_product\.specifications -> 'keySpecs'/);
  assert.match(migration, /revoke all on function public\.save_store_product_editor/);
  assert.match(migration, /grant execute on function public\.save_store_product_editor/);
  assert.doesNotMatch(migration, /drop constraint|disable trigger|delete from public\.store_products/i);
});
