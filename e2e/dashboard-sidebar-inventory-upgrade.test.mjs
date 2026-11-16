import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const base = "../src/dashboard/";
const [app, sidebar, css, page, grouped, api, translations] = await Promise.all([
  readFile(new URL(base + "App.tsx", import.meta.url), "utf8"),
  readFile(new URL(base + "components/layout/DashboardSidebar.tsx", import.meta.url), "utf8"),
  readFile(new URL(base + "components/layout/SidebarPolish.css", import.meta.url), "utf8"),
  readFile(new URL(base + "pages/InventoryManagerPage.tsx", import.meta.url), "utf8"),
  readFile(new URL(base + "components/inventory/InventoryGroupedList.tsx", import.meta.url), "utf8"),
  readFile(new URL(base + "data/inventory.ts", import.meta.url), "utf8"),
  readFile(new URL(base + "uiTranslations.ts", import.meta.url), "utf8"),
]);

test("compact sidebar preserves permissions, navigation and persistent preference", () => {
  assert.ok(app.includes('readPreference("dashboard:sidebar-collapsed")'));
  assert.ok(app.includes('writePreference("dashboard:sidebar-collapsed", String(next))'));
  assert.ok(app.includes('data-sidebar-collapsed={sidebarCollapsed ? "true" : undefined}'));
  assert.ok(css.includes("--dashboard-integrated-sidebar-width: 72px"));
  assert.match(sidebar, /collapsed \|\| !closedSections\.includes\(section\.label\)/);
  assert.ok(sidebar.includes('identity.role === "admin"'));
  assert.ok(sidebar.includes("!unavailableDashboardRoutes.has(item.href)"));
  assert.ok(sidebar.includes('t(collapsed ? "Expand navigation" : "Collapse navigation")'));
});

test("quick inventory adjustments still pass the staff-guarded audit ledger", () => {
  assert.ok(grouped.includes("onChangeBy(row, -5)"));
  assert.ok(grouped.includes("onChangeBy(row, 5)"));
  assert.ok(grouped.includes("const quickBlocked = blocked || pendingDraft"));
  assert.ok(grouped.includes("disabled={quickBlocked || row.stock < 5}"));
  assert.ok(page.includes("adjustInventoryDelta("));
  assert.ok(page.includes("setInventoryStock("));
  assert.ok(page.includes("useDashboardUnsavedChanges(inventoryDirty)"));
  assert.ok(api.includes('await requireDashboardStaff()'));
  assert.ok(api.includes('"adjust_store_inventory"'));
  assert.ok(api.includes('"set_store_inventory_stock_v2"'));
});

test("stock summary memoization invalidates after write and realtime events", () => {
  assert.ok(page.includes("summaryCacheRef = useRef(new Map<number, InventorySummary>())"));
  assert.ok(page.includes("cachedSummary ? Promise.resolve(cachedSummary) : loadInventorySummary(threshold)"));
  assert.ok(page.includes("summaryCacheRef.current.set(threshold, summaryResult)"));
  assert.equal((page.match(/summaryCacheRef\.current\.clear\(\)/g) || []).length, 2);
  assert.ok(page.includes("if (requestId !== loadRequestRef.current) return"));
});

test("dark UI and copy/search actions have accessible localized labels", () => {
  assert.ok(page.includes("dark:bg-amber-950/30"));
  assert.ok(page.includes("dark:bg-rose-950/30"));
  assert.ok(page.includes('aria-label={t("Clear inventory search")}'));
  assert.ok(grouped.includes("navigator.clipboard.writeText(row.sku)"));
  assert.ok(grouped.includes("dark:bg-rose-950/40"));
  for (const label of ["Collapse navigation", "Expand navigation", "Clear inventory search", "Copy SKU", "Increase stock by five", "Decrease stock by five"]) {
    assert.ok(translations.includes('"' + label + '"'), "Missing Arabic translation: " + label);
  }
});
