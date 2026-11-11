import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const helperSource = await readFile(new URL("../src/lib/productPresentation.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { buildProductSuggestions, buildProductHighlights, productHighlightSummary } =
  await import(`data:text/javascript,${encodeURIComponent(compiled)}`);
const route = await readFile(new URL("../src/routes/product.$handle.tsx", import.meta.url), "utf8");
const product = (handle, id, vendor = "ACEFAST") => ({ node: { id, handle, vendor } });

test("recommendations never repeat the current item or a handle / ID across sections", () => {
  const current = product("charger", "id-current");
  const a = product("product-a", "id-a");
  const b = product("product-b", "id-b", "Other");
  const c = product("product-c", "id-c");
  const { similar, sameVendor } = buildProductSuggestions({
    current,
    recommendations: [current, a, a, product("PRODUCT-A", "new-id"), b, c],
    vendorProducts: [current, a, c, product("product-d", "id-c")],
    limit: 3,
  });
  assert.deepEqual(similar.map((p) => p.node.handle), ["product-b"]);
  assert.deepEqual(sameVendor.map((p) => p.node.handle), ["product-a", "product-c"]);
  assert.equal(new Set([...similar, ...sameVendor].map((p) => p.node.id)).size, 3);
});

test("second brand rail shows only genuinely new products", () => {
  const { similar, sameVendor } = buildProductSuggestions({
    current: product("charger", "0"),
    recommendations: [product("one", "1", "Other")],
    vendorProducts: [product("two", "2"), product("three", "3"), product("four", "4")],
    limit: 2,
  });
  assert.deepEqual(similar.map((p) => p.node.handle), ["one"]);
  assert.deepEqual(sameVendor.map((p) => p.node.handle), ["two", "three"]);
});

test("no brand rail for blank or mismatched vendor; empty results stay hidden", () => {
  const r = buildProductSuggestions({
    current: product("only", "0", ""),
    recommendations: [product("only", "0", "")],
    vendorProducts: [product("unrelated", "1", "Other")],
  });
  assert.equal(r.similar.length, 0);
  assert.equal(r.sameVendor.length, 0);
});

test("highlights never invent unlisted specifications and de-duplicate title facts", () => {
  assert.deepEqual(buildProductHighlights([], "Ordinary accessory"), []);
  const groups = [
    { title: "Power", rows: [{ label: "Power output", value: "30W" }, { label: "SKU", value: "0001" }] },
  ];
  const highlights = buildProductHighlights(groups, "ACEFAST 30W GaN USB-C with LED Display & Cable");
  assert.deepEqual(highlights.map((h) => h.value), ["30W", "GaN", "USB-C", "LED display", "Cable"]);
  assert.equal(highlights.some((h) => h.value === "0001"), false);
});

test("product page uses unique suggestions and no generic catalogue SEO filler", () => {
  assert.match(route, /buildProductSuggestions/);
  assert.match(route, /buildProductHighlights/);
  assert.doesNotMatch(route, /needsSeoOverview/);
  assert.doesNotMatch(route, /<OfficialProductResearch/);
  assert.match(route, /data-testid="product-purchase-bar"/);
  assert.match(route, /<VariantPicker/);
  assert.match(route, /productWhatsAppUrl/);
});

test("battery capacity remains a battery fact and Arabic merchant specs keep their values", () => {
  const result = buildProductHighlights([{ title: "Specs", rows: [
    { label: "Battery capacity", value: "6000mAh" },
    { label: "Storage", value: "128GB" },
    { label: "الشاشة", value: "6.78 inches" },
    { label: "المعالج", value: "Merchant chipset" },
    { label: "Camera", value: "غير محدد" },
    { label: "Supported formats", value: "MP3, FLAC" },
  ] }], "Ordinary phone");
  assert.deepEqual(result.map(({ key, value }) => ({ key, value })), [
    { key: "battery", value: "6000mAh" },
    { key: "storage", value: "128GB" },
    { key: "display", value: "6.78 inches" },
    { key: "processor", value: "Merchant chipset" },
  ]);
});


test("long phone specifications and Chip labels produce truthful compact highlights", () => {
  const display = "6.9-inch Super Retina XDR OLED, 2868×1320, 460 ppi, Always-On, ProMotion up to 120Hz";
  const camera = "48MP Fusion Main, 48MP Fusion Ultra Wide, 48MP Fusion Telephoto; 18MP Center Stage front";
  const result = buildProductHighlights([{title:"Specs", rows:[
    {label:"Display",value:display}, {label:"Chip",value:"A19 Pro"}, {label:"Cameras",value:camera}
  ]}], "Phone");
  assert.deepEqual(result.map(h => h.key), ["display", "processor", "camera"]);
  assert.equal(result[0].value, display);
  assert.equal(productHighlightSummary(display), "6.9-inch Super Retina XDR OLED");
  assert.equal(productHighlightSummary(camera), "48MP Fusion Main");
  assert.equal(productHighlightSummary("up to 39 hours video playback"), "up to 39 hours video playback");
  const undelimited = "Long merchant specification ".repeat(4);
  assert.equal(productHighlightSummary(undelimited), undelimited);
});
