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
const movementDrawer = await readFile(
  new URL("../src/dashboard/components/inventory/InventoryMovementHistoryDrawer.tsx", import.meta.url),
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

test("inventory movement history drawer is paginated and resilient", () => {
  assert.match(inventoryPage, /InventoryMovementHistoryDrawer/);
  assert.match(inventoryPage, /setHistoryRow\(row\)/);
  assert.match(movementDrawer, /listDashboardInventoryMovements/);
  assert.match(movementDrawer, /const PAGE_SIZE = 25/);
  assert.match(movementDrawer, /pageSize: PAGE_SIZE/);
  assert.match(movementDrawer, /Loading movement history/);
  assert.match(movementDrawer, /No inventory movements yet/);
  assert.match(movementDrawer, /Retry/);
  assert.match(movementDrawer, /Load more/);
  assert.match(movementDrawer, /loadPage\(page \+ 1, true\)/);
  assert.match(movementDrawer, /INVENTORY_MOVEMENT_TYPES/);
  assert.match(movementDrawer, /Filter inventory movement history by type/);
  assert.match(inventoryData, /movementType\?: InventoryMovementType/);
  assert.match(inventoryData, /query = query\.eq\("movement_type", input\.movementType\)/);
  assert.match(movementDrawer, /Last 7 days/);
  assert.match(movementDrawer, /Last 30 days/);
  assert.match(movementDrawer, /Last 90 days/);
  assert.match(movementDrawer, /movementCreatedSince\(period\)/);
  assert.match(inventoryData, /createdSince\?: string/);
  assert.match(inventoryData, /query = query\.gte\("created_at", input\.createdSince\)/);
  assert.match(movementDrawer, /All sources/);
  assert.match(movementDrawer, /Manual dashboard/);
  assert.match(movementDrawer, /Variant manager/);
  assert.match(movementDrawer, /Web order/);
  assert.match(movementDrawer, /Order cancellation/);
  assert.match(inventoryData, /referenceType\?: InventoryReferenceType/);
  assert.match(inventoryData, /query = query\.eq\("reference_type", input\.referenceType\)/);
  assert.match(movementDrawer, /Search reference ID or note/);
  assert.match(movementDrawer, /setDebouncedSearch\(searchInput\), 300/);
  assert.match(movementDrawer, /aria-label="Clear inventory movement history search"/);
  assert.match(movementDrawer, /aria-busy=\{loading \|\| loadingMore\}/);
  assert.match(movementDrawer, /sm:grid-cols-3/);
  assert.match(movementDrawer, /sm:w-\[560px\]/);
  assert.match(movementDrawer, /Reset/);
  assert.doesNotMatch(movementDrawer, /service_role|SUPABASE_SERVICE_ROLE|sb_secret_/);
});

test("inventory movement search sanitizes raw PostgREST OR input", () => {
  assert.match(inventoryData, /sanitizeInventoryMovementSearch\(input\.search\)/);
  assert.match(inventoryData, /normalize\("NFKC"\)/);
  assert.match(inventoryData, /slice\(0, 80\)/);
  assert.match(inventoryData, /reference_id\.ilike\.\.%\$\{search\}%,note\.ilike\.\.%\$\{search\}%/);
  assert.doesNotMatch(inventoryData, /reference_id\.ilike\.[^\n]*input\.search/);
  assert.doesNotMatch(inventoryData, /note\.ilike\.[^\n]*input\.search/);
});
