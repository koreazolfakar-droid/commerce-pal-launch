import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function functions(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}

const { validateProductDraft } = await functions("../src/dashboard/lib/validation.ts");
test("multi-variant metadata validation ignores locked fields but still requires a title", () => {
  const draft = { title: "Phone", price: "0", compareAt: "", sku: "", stock: "" };
  assert.equal(validateProductDraft(draft, { variantManaged: true }).valid, true);
  assert.equal(validateProductDraft({ ...draft, title: "" }, { variantManaged: true }).valid, false);
  assert.equal(validateProductDraft(draft).valid, false);
});

test("all editable identifiers have bounded lengths", () => {
  const draft = { title: "Phone", price: "100", sku: "a".repeat(81), barcode: "b".repeat(81), stock: "1" };
  const result = validateProductDraft(draft);
  assert.ok(result.errors.sku);
  assert.ok(result.errors.barcode);
});

test("variant options preserve typed existing values and validate names", async () => {
  const { variantOptionRows, buildVariantOptions } = await functions("../src/dashboard/lib/variantOptions.ts");
  const original = { color: "Black", storage: "128GB", RAM: "8GB", size: 6, waterproof: false };
  const rows = variantOptionRows(original);
  assert.equal(rows.length, 3);
  assert.deepEqual(buildVariantOptions(rows), { RAM: "8GB", size: 6, waterproof: false });
  assert.throws(() => buildVariantOptions([{ name: "RAM", value: "8" }, { name: " ram ", value: "12" }]), /unique/i);
  assert.throws(() => buildVariantOptions([{ name: "Color", value: "Blue" }]), /dedicated/i);
  assert.throws(() => buildVariantOptions([{ name: "__proto__", value: "bad" }]), /name/i);
  assert.throws(() => buildVariantOptions([{ name: "RAM", value: "" }]), /value/i);
  assert.deepEqual(buildVariantOptions([{ name: "", value: "" }]), {});
  const numeric = variantOptionRows({ size: 6 })[0];
  // Clearing and retyping must retain the declared numeric JSON representation.
  assert.deepEqual(buildVariantOptions([{ ...numeric, value: "7" }]), { size: 7 });
});

test("dedicated variant option aliases are readable before canonical saving", async () => {
  const { dedicatedVariantOptionText } = await functions("../src/dashboard/lib/variantOptions.ts");
  assert.equal(dedicatedVariantOptionText({ Colour: "Blue" }, ["color", "colour"]), "Blue");
  assert.equal(dedicatedVariantOptionText({ " CAPACITY ": 256 }, ["storage", "capacity"]), "256");
});

test("a complete variant edit round trip preserves aliases and typed custom values", async () => {
  const helpers = await functions("../src/dashboard/lib/variantOptions.ts");
  const source = await readFile(new URL("../src/dashboard/components/products/ProductVariantManager.tsx", import.meta.url), "utf8");
  const tree = ts.createSourceFile("variant.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const code = tree.statements.filter(node => ts.isFunctionDeclaration(node) && ["optionText", "draftFromVariant", "buildInput"].includes(node.name?.text)).map(node => node.getText(tree)).join("\n");
  const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const { draftFromVariant, buildInput } = new Function("dedicatedVariantOptionText", `${js}; return {draftFromVariant,buildInput};`)(helpers.dedicatedVariantOptionText);
  const options = { Colour: "Blue", " CAPACITY ": 256, size: 6, waterproof: false };
  const variant = { title: "Phone", sku: "SKU", barcode: "", price: 100, compareAt: null, stock: 3, trackInventory: true, allowBackorder: false, imageUrl: "", sortOrder: 0, isActive: true, options };
  const draft = draftFromVariant(variant);
  const input = buildInput({ ...draft, baseOptions: helpers.buildVariantOptions(helpers.variantOptionRows(options)) });
  assert.deepEqual(input.options, { size: 6, waterproof: false, color: "Blue", storage: "256" });
});

test("switching and closing variant editors clears pending media and invalidates async sessions", async () => {
  const source = await readFile(new URL("../src/dashboard/components/products/ProductVariantManager.tsx", import.meta.url), "utf8");
  const tree = ts.createSourceFile("variant.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ["openCreate", "openEdit", "closeEditor"].includes(node.name.getText(tree))) declarations.push(`const ${node.getText(tree)};`);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  const js = ts.transpileModule(declarations.join("\n"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const session = { current: 1 };
  let pending = { name: "variant-A.jpg" };
  const noop = () => {};
  const actions = new Function("editorSessionRef", "setPendingImageFile", "setOpen", "setEditing", "setDraft", "setOptionRows", "setOptionError", "EMPTY_DRAFT", "variants", "draftFromVariant", "variantOptionRows", `${js};return {openCreate,openEdit,closeEditor};`)(session, value => { pending = value; }, noop, noop, noop, noop, noop, {}, [], noop, () => []);
  actions.openEdit({ id: "variant-B", options: {} });
  assert.equal(pending, null); assert.equal(session.current, 2);
  pending = { name: "variant-B.jpg" }; actions.closeEditor();
  assert.equal(pending, null); assert.equal(session.current, 3);
  pending = { name: "old.jpg" }; actions.openCreate();
  assert.equal(pending, null); assert.equal(session.current, 4);
});

test("SEO preview uses plain fallback content and encodes the existing canonical handle", async () => {
  const { productSearchPreview } = await functions("../src/dashboard/lib/productSearchPreview.ts");
  const result = productSearchPreview({ title: "Phone", description: "<p>Fast &amp; compact</p>", seoTitle: "", seoDescription: "", handle: "a/b هاتف", origin: "https://www.spacecallapp.store/" });
  assert.equal(result.title, "Phone");
  assert.equal(result.description, "Fast & compact");
  assert.equal(result.url, "https://www.spacecallapp.store/product/a%2Fb%20%D9%87%D8%A7%D8%AA%D9%81");
  assert.equal(productSearchPreview({ title: "Phone", seoTitle: "Search title", seoDescription: "Search copy" }).title, "Search title");
});
