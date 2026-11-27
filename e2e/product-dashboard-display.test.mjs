import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

function loadPureTypeScript(path) {
  const compiled = ts.transpileModule(source(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports }, { timeout: 1000 });
  return exports;
}

const variants = loadPureTypeScript("src/lib/productVariantSelection.ts");
const specifications = loadPureTypeScript("src/lib/productSpecifications.ts");

test("selecting an available color resolves the actual matching Dashboard variant", () => {
  const stock = [
    { id: "black-256", availableForSale: true, selectedOptions: [{ name: "Color", value: "Black" }, { name: "Storage", value: "256GB" }] },
    { id: "blue-512", availableForSale: true, selectedOptions: [{ name: "Color", value: "Blue" }, { name: "Storage", value: "512GB" }] },
    { id: "blue-256", availableForSale: false, selectedOptions: [{ name: "Color", value: "Blue" }, { name: "Storage", value: "256GB" }] },
  ];
  const selected = variants.selectProductVariant(stock, stock[0], "Color", "Blue");
  assert.equal(selected?.id, "blue-512");
  assert.equal(variants.optionsForVariant(selected).Storage, "512GB");
  assert.equal(variants.selectProductVariant(stock, stock[0], "Color", "Silver"), undefined);
  assert.equal(variants.selectProductVariant(stock, stock[0], "Storage", "512GB")?.id, "blue-512");
});

test("initial selection avoids showing a sold-out variant when another is purchasable", () => {
  const choices = [
    { id: "old", availableForSale: false, selectedOptions: [] },
    { id: "new", availableForSale: true, selectedOptions: [] },
  ];
  assert.equal(variants.defaultProductVariant(choices)?.id, "new");
});

test("saved specs remain visible when a category no longer has a template", () => {
  const groups = specifications.specificationGroups(
    null,
    { battery_capacity: "5000 mAh", display_size: "6.7 in" },
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0].rows[0].label, "Battery Capacity");
  assert.equal(groups[0].rows[0].value, "5000 mAh");
  assert.equal(groups[0].rows[1].value, "6.7 in");

  const legacy = specifications.specificationGroups(
    { sections: [] },
    { values: { cpu: "8 cores" }, keySpecs: ["cpu"] },
  );
  assert.equal(legacy[0].rows[0].value, "8 cores");
  assert.equal(legacy[0].rows.length, 1);
});

test("category templates remain authoritative and do not expose unrelated fields", () => {
  const template = {
    sections: [{
      title: "Performance",
      fields: [{ key: "ram", label: "Memory", unit: "GB" }],
    }],
  };
  const groups = specifications.specificationGroups(
    template,
    { ram: "12", internal_notes: "private" },
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0].rows.length, 1);
  assert.equal(groups[0].rows[0].label, "Memory");
  assert.equal(groups[0].rows[0].value, "12 GB");
});

test("product display reads localized Dashboard fields and variant images without duplicating cards", () => {
  const native = source("src/lib/nativeStore.ts");
  const detail = source("src/routes/product.$handle.tsx");
  const quick = source("src/components/product/QuickViewDialog.tsx");
  const picker = source("src/components/product/VariantPicker.tsx");
  const layout = source("src/components/StoreLayout.tsx");
  const cards = source("src/components/CompactProductCard.tsx");
  assert.match(native, /id,title,title_ar,description,description_ar,description_html/);
  assert.match(native, /titleAr: row\.title_ar/);
  assert.match(native, /descriptionAr: row\.description_ar/);
  assert.match(detail, /selectProductVariant\(variants, selectedVariant, name, value\)/);
  assert.match(detail, /images=\{galleryImages\}/);
  assert.match(detail, /subscribeStorefrontRefresh/);
  assert.match(detail, /node\.descriptionAr/);
  assert.match(quick, /selectProductVariant\(variants, variant, name, value\)/);
  assert.match(quick, /item\.image\?\.url/);
  assert.match(picker, /selected\[option\.name\]/);
  assert.match(cards, /node\.titleAr/);
  assert.match(layout, /showCategoryRail=\{\s*!onHomePage[^}]+&& !onProductPage\s*\}/);
});
