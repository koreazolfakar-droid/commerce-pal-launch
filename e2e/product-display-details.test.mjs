import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");
const source = await read("src/lib/productDetailDisplay.ts");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  inferProductTitleFacts, buildDisplaySpecificationGroups, buildDisplayOverview, inferredBoxContents,
} = await import("data:text/javascript," + encodeURIComponent(compiled));

const title = "ACEFAST 30W GaN USB-C Fast Charger with LED Display & Cable – Black";
const sparseDescription = [{ title: null, paragraphs: ["30W"], bullets: [], specs: [] }];

test("charger title yields confirmed technical values including colour and included cable", () => {
  const facts = inferProductTitleFacts(title);
  assert.deepEqual(facts.map((fact) => fact.value), ["30W", "GaN", "USB-C", "LED display", "Cable", "Black"]);
});

test("short 30W description becomes meaningful merchant-title-backed overview", () => {
  const overview = buildDisplayOverview(sparseDescription, title, "ACEFAST", "en");
  assert.equal(overview.length, 1);
  assert.match(overview[0].paragraphs[0], /ACEFAST charger/);
  for (const term of ["30W", "GaN", "USB-C", "LED display", "included cable", "Black"]) {
    assert.ok(overview[0].paragraphs[0].includes(term), term + " missing from overview");
  }
  assert.doesNotMatch(overview[0].paragraphs[0], /listed in the live.*catalogue/i);
  assert.notEqual(overview[0].paragraphs[0], "30W");
});

test("arabic product text preserves facts and renders right-to-left prose", () => {
  const overview = buildDisplayOverview(sparseDescription, title, "ACEFAST", "ar");
  assert.match(overview[0].paragraphs[0], /شاحن من ACEFAST/);
  assert.match(overview[0].paragraphs[0], /30W/);
  const box = inferredBoxContents(title, "ar");
  assert.match(box[0].bullets[0], /كابل/);
});

test("real merchant description wins over fallback and removes only unhelpful text fragments", () => {
  const paragraphs = [{ title: null, paragraphs: ["30W", "Designed with a compact body and an LED charging display."], bullets: [], specs: [] }];
  const result = buildDisplayOverview(paragraphs, title, "ACEFAST", "en");
  assert.equal(result[0].paragraphs.length, 1);
  assert.equal(result[0].paragraphs[0], paragraphs[0].paragraphs[1]);
});

test("title facts supplement specifications without rewriting authoritative rows", () => {
  const brandSpecs = [{ title: "General", rows: [{ label: "Brand", value: "ACEFAST" }, { label: "Power", value: "33W" }] }];
  const groups = buildDisplaySpecificationGroups(brandSpecs, title, "en");
  const all = groups.flatMap((group) => group.rows);
  assert.equal(all.filter((row) => /power/i.test(row.label)).length, 1);
  assert.equal(all.find((row) => row.label === "Power").value, "33W");
  for (const value of ["GaN", "USB-C", "LED display", "Cable", "Black"]) {
    assert.ok(all.some((row) => row.value === value), "missing title fact " + value);
  }
});

test("empty title does not create a phantom description, box or specifications", () => {
  assert.deepEqual(inferProductTitleFacts(""), []);
  assert.deepEqual(buildDisplayOverview([], "", undefined, "en"), []);
  assert.deepEqual(inferredBoxContents("Generic Charger", "en"), []);
  assert.deepEqual(buildDisplaySpecificationGroups([], "Generic Charger", "en"), []);
});

test("inferred included cable is not displayed for unrelated devices", () => {
  assert.deepEqual(inferredBoxContents("Wireless Earbuds, Black", "en"), []);
  assert.deepEqual(inferredBoxContents("USB-C Charger", "en"), []);
  assert.equal(inferredBoxContents(title, "en")[0].bullets.length, 1);
});

test("product route renders the new product information hierarchy", async () => {
  const [route, prose, sheet] = await Promise.all([
    read("src/routes/product.$handle.tsx"),
    read("src/components/product/ProseSection.tsx"),
    read("src/components/product/SpecSheet.tsx"),
  ]);
  assert.match(route, /data-testid="product-key-features"/);
  assert.match(route, /data-testid="product-information"/);
  assert.match(route, /buildDisplayOverview/);
  assert.match(route, /buildDisplaySpecificationGroups/);
  assert.match(route, /<ProseSections sections=\{displayOverview\} plain language=\{language\}/);
  assert.match(route, /<SpecSheet groups=\{specGroups\} language=\{language\}/);
  assert.match(sheet, /grid-cols-\[minmax\(0,0\.88fr\)_minmax\(0,1\.12fr\)\]/);
  assert.match(prose, /Read full description/);
  assert.match(route, /data-testid="product-purchase-bar"/);
  assert.doesNotMatch(route, /<OfficialProductResearch/);
});

test("arabic specifications prefer merchant data and localize only title-derived labels", () => {
  const groups = buildDisplaySpecificationGroups(
    [{ title: "General", rows: [{ label: "Brand", value: "ACEFAST" }, { label: "Charging power", value: "30W" }] }],
    title,
    "ar",
  );
  assert.equal(groups[0].title, "معلومات مؤكدة من اسم المنتج");
  assert.ok(groups[0].rows.some((row) => row.label === "التقنية" && row.value === "GaN"));
  assert.ok(groups[0].rows.every((row) => row.label !== "القدرة"));
  assert.ok(groups[1].rows.some((row) => row.value === "30W"));
});
