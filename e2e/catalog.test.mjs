import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { products } from "./catalog-fixture.mjs";

// Execute production domain modules without loading the server transport or mocking their logic.
const require = createRequire(import.meta.url);
const urls = new Map();
async function sourceUrl(name) {
  if (urls.has(name)) return urls.get(name);
  const source = await readFile(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8");
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  for (const match of [...outputText.matchAll(/from "(@\/lib\/([^"/]+)|lucide-react)"/g)]) {
    const url =
      match[1] === "lucide-react"
        ? pathToFileURL(require.resolve("lucide-react")).href
        : await sourceUrl(match[2]);
    outputText = outputText.replaceAll(`from "${match[1]}"`, `from "${url}"`);
  }
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  urls.set(name, url);
  return url;
}
const taxonomy = await import(await sourceUrl("taxonomy"));
const { applyFilters, parseProductSearch } = await import(await sourceUrl("filters"));
const { productSearchScore, normalizeSearchText } = await import(await sourceUrl("searchRanking"));
const { productPrice, productDiscountPercent, productPrimaryVariant } = await import(
  await sourceUrl("productPricing")
);
const { buildShopifyBrands } = await import(await sourceUrl("brandDirectory"));
const { findFacetMerchandising } = await import(await sourceUrl("homeMerchandising"));
const product = (overrides = {}) => ({
  node: { ...structuredClone(products[0].node), ...overrides },
});

for (const [title, productType, expected] of [
  ["Case for Apple iPhone 17", "Phone Cases", "cases"],
  ["Galaxy S26 screen protector", "", "cases"],
  ["Samsung Galaxy S26", "Smartphone", "smartphones"],
  ["Google Pixel Buds", "", "headphones"],
  ["MagSafe portable charger", "", "power-banks"],
  ["iPad keyboard", "", "computer-accessories"],
  ["Gaming laptop", "", "laptops"],
  ["USB-C wall charger", "", "chargers"],
  ["Apple phone", "Phones", "smartphones"],
  ["Kobo Clara", "E-Readers", "e-readers"],
  ["نور مصباح", "إضاءة ذكية", "إضاءة-ذكية"],
])
  test(`category: ${title} → ${expected}`, () => {
    assert.deepEqual(
      taxonomy.resolveCategories(product({ title, productType })).map((c) => c.slug),
      [expected],
    );
  });

test("explicit category tags override misleading titles and allow new categories", () => {
  assert.deepEqual(
    taxonomy.resolveCategories(product({ tags: ["category: Smart Lighting"] })).map((c) => c.slug),
    ["smart-lighting"],
  );
});
test("brand campaigns and compatibility options do not become categories", () => {
  const item = product({
    title: "Protective case",
    productType: "",
    tags: ["iPhone", "Samsung"],
    collections: { edges: [{ node: { title: "Apple smartphones", handle: "hero-brand-apple" } }] },
    options: [{ name: "Compatible with", values: ["iPhone", "Galaxy S26"] }],
  });
  assert.deepEqual(
    taxonomy.resolveCategories(item).map((c) => c.slug),
    ["cases"],
  );
});
test("vendor identity wins over compatibility words, and similar names remain distinct", () => {
  assert.equal(
    taxonomy.resolveBrand(product({ title: "Case for Apple iPhone", vendor: "Spigen" })).slug,
    "spigen",
  );
  assert.equal(
    taxonomy.resolveBrand(product({ vendor: "Apple Accessories Inc" })).slug,
    "apple-accessories-inc",
  );
  assert.equal(taxonomy.resolveBrand(product({ vendor: "نور" })).slug, "نور");
  assert.equal(
    taxonomy.resolveBrand(product({ vendor: "Space Call", title: "Case for iPhone" })),
    null,
  );
});
test("a new vendor owning most of the catalog is not discarded as a store name", () => {
  const catalog = taxonomy.buildCatalogIndex(
    products.map((item) => ({ node: { ...item.node, vendor: "New Brand" } })),
  );
  assert.deepEqual(
    catalog.brands.map((b) => b.slug),
    ["new-brand"],
  );
});
test("explicit brand tags and aliases are deterministic", () => {
  assert.equal(
    taxonomy.resolveBrand(product({ tags: ["brand: Xiaomi"], vendor: "Space Call" })).slug,
    "xiaomi",
  );
});
test("brand, category, price and stock combine as AND, values within a facet as OR", () => {
  const catalog = taxonomy.buildCatalogIndex(products);
  const matches = applyFilters(products, catalog, {
    brand: ["apple", "samsung"],
    category: ["smartphones"],
    min: 540,
    max: 660,
    availability: "in-stock",
  });
  assert.deepEqual(
    matches.map((p) => p.node.handle),
    ["fixture-phone-2", "fixture-phone-4"],
  );
});
test("collection filters use exact membership, and impossible combinations return no products", () => {
  const catalog = taxonomy.buildCatalogIndex(products);
  assert.equal(applyFilters(products, catalog, { collection: ["samsung"] }).length, 2);
  assert.equal(
    applyFilters(products, catalog, { collection: ["samsung"], brand: ["apple"] }).length,
    0,
  );
});
test("price URL validation rejects junk, negatives and empty values, normalizes reversed range", () => {
  assert.equal(parseProductSearch({ min: "100oops", max: "" }).min, undefined);
  assert.equal(parseProductSearch({ min: -5 }).min, undefined);
  const filters = parseProductSearch({
    min: "700",
    max: "500",
    brand: [" apple ", "apple", {}, 4],
  });
  assert.equal(filters.min, 500);
  assert.equal(filters.max, 700);
  assert.deepEqual(filters.brand, ["apple"]);
});
test("newest and price sorts are stable and do not mutate the catalog", () => {
  const catalog = taxonomy.buildCatalogIndex(products);
  const original = products.map((p) => p.node.id);
  assert.equal(
    applyFilters(products, catalog, { sort: "newest" })[0].node.handle,
    "fixture-phone-9",
  );
  assert.equal(
    applyFilters(products, catalog, { sort: "price-desc" })[0].node.handle,
    "fixture-phone-9",
  );
  assert.deepEqual(
    products.map((p) => p.node.id),
    original,
  );
});
test("displayed price and quick-add agree when the cheapest variant is sold out", () => {
  const item = product();
  item.node.variants.edges[0].node.availableForSale = false;
  assert.equal(productPrice(item), 599);
  assert.equal(productPrimaryVariant(item).selectedOptions[0].value, "512GB");
  const catalog = taxonomy.buildCatalogIndex([item]);
  assert.equal(applyFilters([item], catalog, { max: 500 }).length, 0);
});
test("a compare-at price from another variant cannot invent a discount", () => {
  const item = product();
  item.node.variants.edges[0].node.compareAtPrice = null;
  assert.equal(productDiscountPercent(item), null);
  assert.equal(
    applyFilters([item], taxonomy.buildCatalogIndex([item]), { availability: "on-sale" }).length,
    0,
  );
});
test("logos and hero images are independent and never match by substring", () => {
  const collection = (handle, url) => ({
    id: handle,
    handle,
    title: "Campaign copy",
    description: "",
    image: { url, altText: null },
  });
  const collections = [
    collection("hero-brand-apple", "hero.jpg"),
    collection("logo-apple", "logo.svg"),
    collection("logo-applecare", "wrong.svg"),
  ];
  const [brand] = buildShopifyBrands([{ slug: "apple", label: "Apple", count: 2 }], collections);
  assert.equal(brand.image, "logo.svg");
  assert.equal(brand.label, "Apple");
  assert.equal(findFacetMerchandising(collections, "brand", "apple").image.url, "hero.jpg");
  assert.equal(findFacetMerchandising(collections, "brand", "app"), undefined);
  assert.equal(
    buildShopifyBrands([{ slug: "apple", label: "Apple", count: 2 }], [collections[0]])[0].image,
    undefined,
  );
});
test("configuration collections do not clutter customer navigation", () => {
  const collections = [
    "homepage-hero",
    "hero-brand-apple",
    "hero-category-cases",
    "logo-apple",
    "all",
    "summer-offers",
  ].map((handle) => ({ handle }));
  assert.deepEqual(
    taxonomy.displayCollections(collections).map((c) => c.handle),
    ["summer-offers"],
  );
});


test("search ranking strongly prefers an exact product title", () => {
  const exact = product({ title: "Apple iPhone 17 Pro Max", vendor: "Apple" });
  const broad = product({ title: "Case for Apple iPhone 17 Pro Max", vendor: "Spigen" });
  assert.ok(
    productSearchScore(exact, "iphone 17 pro max") >
      productSearchScore(broad, "iphone 17 pro max"),
  );
});

test("search matches SKU and variant option values precisely", () => {
  const item = product({
    title: "Generic Device",
    vendor: "Example",
    variants: {
      edges: [
        {
          node: {
            id: "variant-search",
            title: "512GB Black",
            sku: "SM-S938BZK",
            barcode: "8806095812345",
            selectedOptions: [
              { name: "Storage", value: "512GB" },
              { name: "Color", value: "Black" },
            ],
          },
        },
      ],
    },
  });
  assert.ok(productSearchScore(item, "SM-S938BZK") > 0);
  assert.ok(productSearchScore(item, "8806095812345") > 0);
  assert.ok(productSearchScore(item, "512GB black") > 0);
});

test("search tolerates one useful typo without making short model numbers fuzzy", () => {
  const samsung = product({ title: "Samsung Galaxy S26 Ultra", vendor: "Samsung" });
  assert.ok(productSearchScore(samsung, "samsng s26 ultra") > 0);
  assert.equal(productSearchScore(samsung, "s27"), 0);
});

test("search normalizes Arabic spelling and supports conservative brand aliases", () => {
  const iphone = product({ title: "Apple iPhone 17 Pro", vendor: "Apple" });
  const samsung = product({ title: "Samsung Galaxy S26", vendor: "Samsung" });
  assert.ok(productSearchScore(iphone, "آيفون 17") > 0);
  assert.ok(productSearchScore(samsung, "سامسونج s26") > 0);
  assert.equal(normalizeSearchText("  آيــفون  "), "ايفون");
});

test("catalog q filtering uses the same precise search matcher", () => {
  const catalog = taxonomy.buildCatalogIndex(products);
  const matches = applyFilters(products, catalog, { q: "samsng fixture 4" });
  assert.deepEqual(matches.map((item) => item.node.handle), ["fixture-phone-4"]);
});


test("search understands common Arabic category and brand terms", () => {
  const phone = product({ title: "Xiaomi 17 Ultra", vendor: "Xiaomi", productType: "Smartphone" });
  const charger = product({ title: "Anker Nano Charger 45W", vendor: "Anker", productType: "Charger" });
  assert.ok(productSearchScore(phone, "شاومي موبايل") > 0);
  assert.ok(productSearchScore(charger, "انكر شاحن") > 0);
});

test("description-only marketing words do not create noisy product matches", () => {
  const item = product({
    title: "USB-C Cable",
    vendor: "Anker",
    productType: "Cable",
    tags: ["usb-c"],
    description: "Compatible with smartphones and tablets.",
  });
  assert.equal(productSearchScore(item, "compatible"), 0);
});
