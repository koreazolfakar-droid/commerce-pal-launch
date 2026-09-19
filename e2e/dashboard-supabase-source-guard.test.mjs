import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const files = {
  app: await readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8"),
  brands: await readFile(new URL("../src/dashboard/pages/BrandsPage.tsx", import.meta.url), "utf8"),
  categories: await readFile(new URL("../src/dashboard/pages/CategoriesPage.tsx", import.meta.url), "utf8"),
  inventory: await readFile(new URL("../src/dashboard/pages/InventoryManagerPage.tsx", import.meta.url), "utf8"),
  brandData: await readFile(new URL("../src/dashboard/data/brands.ts", import.meta.url), "utf8"),
  categoryData: await readFile(new URL("../src/dashboard/data/categories.ts", import.meta.url), "utf8"),
  inventoryData: await readFile(new URL("../src/dashboard/data/inventory.ts", import.meta.url), "utf8"),
  catalogData: await readFile(new URL("../src/dashboard/data/catalog.ts", import.meta.url), "utf8"),
};

const migratedPages = [
  files.brands,
  files.categories,
  files.inventory,
  files.brandData,
  files.categoryData,
  files.inventoryData,
  files.catalogData,
];

test("migrated catalog pages do not import dashboard mock data", () => {
  for (const source of migratedPages) {
    assert.doesNotMatch(source, /@\/dashboard\/mock\//);
    assert.doesNotMatch(source, /localStorage|sessionStorage/);
    assert.doesNotMatch(source, /readCatalogProducts|readBrands|readCategories|saveCatalogProduct/);
  }
});

test("products page and global product search are Supabase-backed", () => {
  assert.match(files.app, /listDashboardProductSearchIndex\(\)/);
  assert.doesNotMatch(files.app, /listDashboardProducts\(\)/);
  assert.match(files.app, /import ProductsPageLive from "@\/dashboard\/pages\/ProductsPage"/);
  assert.doesNotMatch(
    files.app,
    /pageMeta\["\/dashboard\/products"\]/,
  );
  assert.match(files.app, /const results: DashboardProductSearchItem\[\]/);
});

test("dashboard catalog avoids eager heavy payloads", () => {
  assert.match(files.catalogData, /DASHBOARD_ROLE_CACHE_TTL_MS/);
  assert.match(files.catalogData, /listDashboardProductSearchIndex/);
  assert.match(
    files.catalogData,
    /id,handle,title,description,brand_id,category_id,product_type,base_price,compare_at_price,stock_quantity,status,sku,barcode,seo_title,seo_description/,
  );
  assert.doesNotMatch(
    files.catalogData,
    /from\("store_products"\)\.select\("\*"\)\.order\("updated_at"/,
  );
});

test("inventory contains no synthetic reserved stock calculation", () => {
  assert.doesNotMatch(files.inventory, /reserved\s*=|stock\s*\*\s*\.18|Reserved<\/th>/);
  assert.match(files.inventoryData, /store_inventory_movements/);
});

test("migrated data layers read and write Supabase tables directly", () => {
  assert.match(files.catalogData, /\.from\("store_products"\)/);
  assert.match(files.brandData, /\.from\("cms_brands"\)/);
  assert.match(files.categoryData, /\.from\("store_categories"\)/);
  assert.match(files.inventoryData, /\.from\("store_product_variants"\)/);
});

