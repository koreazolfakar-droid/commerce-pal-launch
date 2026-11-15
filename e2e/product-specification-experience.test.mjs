import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function pureModule(path) {
  const source = await readFile(new URL("../" + path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import("data:text/javascript," + encodeURIComponent(compiled));
}

const { reconcileVariantSpecifications, filterSpecificationGroups } = await pureModule(
  "src/lib/productDetailDisplay.ts",
);
const { formatProductHighlight, buildProductHighlights } = await pureModule(
  "src/lib/productPresentation.ts",
);
const { groupSpecs } = await pureModule("src/lib/productContent.ts");

test("battery capacity is grouped with battery and charging rather than storage", () => {
  const groups = groupSpecs([{ label: "Battery capacity", value: "5000 mAh" }]);
  assert.equal(groups[0].title, "Battery & Charging");
});

test("selected configuration overrides generic and bilingual duplicate RAM, storage and color", () => {
  const groups = [
    {
      title: "Performance",
      rows: [
        { label: "Memory", value: "8 GB" },
        { label: "Storage", value: "128GB" },
      ],
    },
    {
      title: "Other",
      rows: [
        { label: "RAM", value: "8GB" },
        { label: "اللون", value: "Black" },
        { label: "Battery capacity", value: "5000mAh" },
      ],
    },
  ];
  const before = structuredClone(groups);
  const result = reconcileVariantSpecifications(
    groups,
    [
      { name: "RAM", value: "12" },
      { name: "Storage", value: "512GB" },
      { name: "Color", value: "Blue" },
    ],
    "en",
  );
  assert.deepEqual(result[0].rows, [
    { label: "Memory", value: "12 GB" },
    { label: "Storage", value: "512 GB" },
  ]);
  assert.deepEqual(result[1].rows, [
    { label: "اللون", value: "Blue" },
    { label: "Battery capacity", value: "5000mAh" },
  ]);
  assert.deepEqual(groups, before, "presentation must not mutate catalog data");
});

test("missing chosen options form a localized group and never invent units for generic capacity", () => {
  const result = reconcileVariantSpecifications(
    [],
    [
      { name: "التخزين", value: "256" },
      { name: "Capacity", value: "10000" },
      { name: "Title", value: "Default Title" },
    ],
    "ar",
  );
  assert.equal(result[0].title, "النسخة المختارة");
  assert.deepEqual(result[0].rows, [
    { label: "التخزين", value: "256 GB" },
    { label: "Capacity", value: "10000" },
  ]);
});

test("without a selected option merchant specifications and custom groups remain authoritative", () => {
  const groups = [
    {
      title: "Merchant details",
      rows: [
        { label: "Storage", value: "128GB / 256GB" },
        { label: "Battery capacity", value: "5000mAh" },
      ],
    },
  ];
  assert.deepEqual(reconcileVariantSpecifications(groups, [], "en"), groups);
});

test("specification search matches group, label and value tokens without modifying input", () => {
  const groups = [
    {
      title: "Battery",
      rows: [
        { label: "Capacity", value: "5000 mAh" },
        { label: "Charging", value: "67 W" },
      ],
    },
    { title: "الأداء", rows: [{ label: "المُعالج", value: "Snapdragon 695" }] },
  ];
  assert.deepEqual(filterSpecificationGroups(groups, "battery 5000"), [
    { title: "Battery", rows: [{ label: "Capacity", value: "5000 mAh" }] },
  ]);
  assert.equal(filterSpecificationGroups(groups, "المعالج")[0].rows[0].value, "Snapdragon 695");
  assert.deepEqual(filterSpecificationGroups(groups, "["), []);
  assert.deepEqual(filterSpecificationGroups(groups, "  "), groups);
  assert.equal(groups[0].rows.length, 2);
});

test("compact highlights extract only technical values actually present in the full text", () => {
  assert.equal(
    formatProductHighlight("display", "6.72-inch FHD+ LCD with 120Hz refresh rate"),
    "6.72″ · FHD+ LCD · 120 Hz",
  );
  assert.equal(
    formatProductHighlight("camera", "108MP main camera with additional depth and macro sensors"),
    "108 MP",
  );
  assert.equal(
    formatProductHighlight("battery", "5,000mAh battery with fast charging"),
    "5,000 mAh",
  );
  assert.equal(formatProductHighlight("display", "AMOLED"), "AMOLED");
  assert.equal(
    formatProductHighlight("processor", "Qualcomm Snapdragon 695 5G"),
    "Qualcomm Snapdragon 695 5G",
  );
});

test("long merchant features stay available in full while their summary remains short", () => {
  const value =
    "108MP main camera with additional depth and macro sensors for different photography modes";
  const result = buildProductHighlights(
    [{ title: "Camera", rows: [{ label: "Main camera", value }] }],
    "Phone",
  );
  assert.equal(result[0].value, value);
  assert.equal(formatProductHighlight(result[0].key, result[0].value), "108 MP");
});

test("color options preserve separate finish facts in either merchant row order", () => {
  for (const rows of [
    [
      { label: "Color", value: "Black" },
      { label: "Finish", value: "Matte" },
    ],
    [
      { label: "Finish", value: "Matte" },
      { label: "Color", value: "Black" },
    ],
  ]) {
    const result = reconcileVariantSpecifications(
      [{ title: "Design", rows }],
      [{ name: "Color", value: "Blue" }],
      "en",
    );
    assert.deepEqual(
      result[0].rows,
      rows.map((row) => (row.label === "Color" ? { ...row, value: "Blue" } : row)),
    );
  }
});

test("selected memory capacities retain merchant technology and expansion qualifiers", () => {
  const result = reconcileVariantSpecifications(
    [
      {
        title: "Memory",
        rows: [
          { label: "Storage", value: "128GB UFS 3.1, expandable up to 1TB" },
          { label: "RAM", value: "8 GB LPDDR5" },
          { label: "Memory", value: "8 GB dual-channel" },
        ],
      },
    ],
    [
      { name: "Storage", value: "512GB" },
      { name: "RAM", value: "12GB" },
    ],
    "en",
  );
  assert.deepEqual(
    result[0].rows.map((row) => row.value),
    ["512 GB UFS 3.1, expandable up to 1TB", "12 GB LPDDR5", "12 GB dual-channel"],
  );
});

test("highlight numbers cannot match suffixes of decimal or grouped numeric tokens", () => {
  assert.equal(formatProductHighlight("display", "6,7-inch AMOLED display"), "6,7″ · AMOLED");
  assert.equal(formatProductHighlight("battery", "100,000mAh power bank"), "100,000 mAh");
  assert.equal(formatProductHighlight("battery", "1,000,000mAh battery"), "1,000,000 mAh");
  assert.equal(formatProductHighlight("camera", "12,5MP camera"), "12,5 MP");
});

test("selected capacity replaces generic alternatives while retaining technology details", () => {
  const result = reconcileVariantSpecifications(
    [
      {
        title: "Memory",
        rows: [
          { label: "Storage", value: "128GB / 256GB" },
          { label: "RAM", value: "8GB / 12GB LPDDR5" },
        ],
      },
    ],
    [
      { name: "Storage", value: "512GB" },
      { name: "RAM", value: "16GB" },
    ],
    "en",
  );
  assert.deepEqual(
    result[0].rows.map((row) => row.value),
    ["512 GB", "16 GB LPDDR5"],
  );
});
