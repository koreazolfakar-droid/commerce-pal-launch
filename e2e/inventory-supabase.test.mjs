import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const inventoryPage = await readFile(
  new URL("../src/dashboard/pages/InventoryManagerPage.tsx", import.meta.url),
  "utf8",
);
const inventoryData = await readFile(
  new URL("../src/dashboard/data/inventory.ts", import.meta.url),
  "utf8",
);
const inventoryMigration = await readFile(
  new URL("../supabase/migrations/20260918203000_inventory_management.sql", import.meta.url),
  "utf8",
);

test("inventory dashboard uses Supabase instead of mock storage", () => {
  assert.match(inventoryPage, /@\/dashboard\/data\/inventory/);
  assert.doesNotMatch(inventoryPage, /@\/dashboard\/mock\//);
  assert.doesNotMatch(inventoryPage, /localStorage|Local inventory/);
  assert.doesNotMatch(inventoryPage, /Math\.floor\([^\n]*stock\s*\*\s*\.18/);
});

test("inventory writes go through atomic Supabase RPCs", () => {
  assert.match(inventoryData, /rpc\("adjust_store_inventory"/);
  assert.match(inventoryData, /rpc\("set_store_inventory_stock"/);
  assert.match(inventoryData, /invalidateNativeStoreCache\(\)/);
  assert.doesNotMatch(inventoryData, /@\/dashboard\/mock\//);
});

test("inventory RPCs run with caller RLS and synchronize product stock", () => {
  assert.match(inventoryMigration, /security invoker/gi);
  assert.doesNotMatch(inventoryMigration, /security definer/gi);
  assert.match(inventoryMigration, /sum\(v\.stock_quantity\)/);
  assert.match(inventoryMigration, /store_inventory_movements/);
  assert.match(inventoryMigration, /revoke all on function public\.set_store_inventory_stock[^;]+from public, anon/s);
});
