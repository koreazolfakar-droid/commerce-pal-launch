import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { readDashboardShellSource } from "./helpers/dashboard-shell-source.mjs";

const routes = await readFile(new URL("../src/dashboard/config/routes.tsx", import.meta.url), "utf8");
const app = await readDashboardShellSource();

test("sidebar exposes Add New Product linking to the existing create route", () => {
  const start = routes.indexOf('id: "products-new"');
  const block = routes.slice(start, start + 600);
  assert.match(block, /path: "\/dashboard\/products\/new"/);
  assert.match(block, /label: "Add New Product"/);
  assert.match(block, /icon: "PackagePlus"/);
  assert.match(app, /^\s+PackagePlus,$/m);
});

const form = await readFile(new URL("../src/dashboard/pages/ProductFormPage.tsx", import.meta.url), "utf8");
const migration = await readFile(
  new URL("../supabase/migrations/20261005000000_product_editor_stock_concurrency.sql", import.meta.url),
  "utf8",
);

test("create page offers draft and publish with a double-submit lock", () => {
  assert.match(form, /submitProduct\("Draft"\)/);
  assert.match(form, /submitProduct\("Active"\)/);
  assert.match(form, /if \(saveLockRef\.current\) return;/);
  assert.match(form, /<ProductCreatePreview/);
});

test("product save is staff-only and validates prices server-side", () => {
  assert.match(migration, /raise exception 'dashboard staff required'/);
  assert.match(migration, /p_price <= 0/);
  assert.match(migration, /p_compare_at_price < p_price/);
  assert.match(migration, /from public, anon;/);
});
