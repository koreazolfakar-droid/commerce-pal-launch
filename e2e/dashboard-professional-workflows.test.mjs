import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
async function load(path) {
  const s = await readFile(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(s, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}
const { readQueryValue, writeQueryValue } = await load("../src/dashboard/lib/queryState.ts");
const { rememberDashboardList, dashboardListHref } = await load(
  "../src/dashboard/lib/listContext.ts",
);
const guards = await load("../src/dashboard/lib/unsavedChanges.ts");
test("URL list state rejects invalid pages, values, limits and booleans", () => {
  for (const value of ["-1", "0", "Infinity", "NaN", "2.5", "2000000"])
    assert.equal(readQueryValue(new URLSearchParams({ page: value }), "page", 1), 1);
  assert.equal(
    readQueryValue(new URLSearchParams("status=admin"), "status", "All", ["All", "Draft"]),
    "All",
  );
  assert.equal(
    readQueryValue(new URLSearchParams("pageSize=5000"), "pageSize", 20, [20, 50, 100]),
    20,
  );
  assert.equal(readQueryValue(new URLSearchParams("onlyLow=false"), "onlyLow", true), false);
  assert.equal(readQueryValue(new URLSearchParams("onlyLow=anything"), "onlyLow", true), true);
  assert.equal(readQueryValue(new URLSearchParams("threshold=0"), "threshold", 10), 0);
});
test("changing a filter resets the page while preserving other context", () => {
  const updated = writeQueryValue(
    new URLSearchParams("page=5&search=Phone&category=phones"),
    "stock",
    "low",
    "all",
  );
  assert.equal(updated.get("page"), null);
  assert.equal(updated.get("search"), "Phone");
  assert.equal(updated.get("category"), "phones");
  assert.equal(updated.get("stock"), "low");
  assert.equal(writeQueryValue(updated, "stock", "all", "all").has("stock"), false);
  assert.equal(writeQueryValue(updated, "page", 3, 1).get("page"), "3");
});
test("list return context remains scoped to its own list", () => {
  rememberDashboardList("/dashboard/products", "status=Draft&page=2");
  rememberDashboardList("/dashboard/orders", "payment=unpaid");
  assert.equal(dashboardListHref("/dashboard/products"), "/dashboard/products?status=Draft&page=2");
  assert.equal(dashboardListHref("/dashboard/orders"), "/dashboard/orders?payment=unpaid");
  assert.equal(dashboardListHref("/dashboard/collections"), "/dashboard/collections");
});
test("Back within a filtered page retains dirty inventory protection", () => {
  const original = globalThis.window,
    originalDocument = globalThis.document;
  globalThis.document = { documentElement: { lang: "en" } };
  const listeners = new Map();
  let confirms = 0;
  const win = {
    location: new URL("https://example.test/dashboard/inventory?page=2"),
    confirm: () => {
      confirms++;
      return false;
    },
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
  };
  const setUrl = (url) => {
    win.location = new URL(url, win.location);
  };
  win.history = {
    state: null,
    pushState(state, _, url) {
      this.state = state;
      setUrl(url);
    },
    replaceState(state, _, url) {
      this.state = state;
      setUrl(url);
    },
    go() {
      throw new Error("Unexpected history delta");
    },
  };
  globalThis.window = win;
  try {
    const cleanup = guards.installDashboardNavigationGuard();
    guards.setDashboardDraftDirty("inventory", true);
    win.history.pushState({}, "", "?page=3");
    setUrl("/dashboard/inventory?page=2");
    listeners.get("popstate")({
      state: { __spaceCallDraftIndex: 0 },
      stopImmediatePropagation() {},
    });
    assert.equal(confirms, 0);
    assert.equal(guards.hasDashboardUnsavedChanges(), true);
    setUrl("/dashboard/orders");
    listeners.get("popstate")({ state: null, stopImmediatePropagation() {} });
    assert.equal(confirms, 1);
    assert.equal(win.location.pathname, "/dashboard/inventory");
    assert.equal(guards.hasDashboardUnsavedChanges(), true);
    cleanup();
  } finally {
    guards.setDashboardDraftDirty("inventory", false);
    globalThis.window = original;
    globalThis.document = originalDocument;
  }
});
test("supplier creation passes the intended active state to the API", async () => {
  let input;
  const source = await readFile(
    new URL("../src/dashboard/data/receiving.ts", import.meta.url),
    "utf8",
  );
  const a = source.indexOf("export async function createReceivingSupplier");
  const b = source.indexOf("export type CreatePurchaseOrderInput", a);
  const body = source.slice(a, b);
  const js = ts.transpileModule(body, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  const chain = {
    insert(row) {
      input = row;
      return chain;
    },
    select() {
      return chain;
    },
    single() {
      return Promise.resolve({ data: { id: "supplier", ...input }, error: null });
    },
  };
  new Function("exports", "requireDashboardStaff", "supabase", "throwIfError", js)(
    exports,
    async () => {},
    { from: () => chain },
    (e) => {
      if (e) throw e;
    },
  );
  await exports.createReceivingSupplier({ name: "  Supplier  ", isActive: false });
  assert.equal(input.is_active, false);
  assert.equal(input.name, "Supplier");
  await exports.createReceivingSupplier({ name: "Default" });
  assert.equal(input.is_active, true);
});
test("workspace search is bounded, role-checked and preserves partial results", async () => {
  const source = await readFile(
    new URL("../src/dashboard/data/workspaceSearch.ts", import.meta.url),
    "utf8",
  );
  const js = ts.transpileModule(source.replace(/^import[\s\S]*?from ["'][^"']+["'];\n/gm, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const calls = [];
  let role = "editor";
  const supabase = {
    from(table) {
      const chain = {
        select(fields) {
          calls.push({ table, fields });
          return chain;
        },
        or() {
          return chain;
        },
        order() {
          return chain;
        },
        limit(limit) {
          assert.equal(limit, 5);
          return chain;
        },
        then(resolve, reject) {
          return Promise.resolve(
            table === "store_customers"
              ? { data: null, error: new Error("CRM unavailable") }
              : {
                  data: [
                    { id: "order", public_order_number: "12345-00001", customer_name: "Test" },
                  ],
                  error: null,
                },
          ).then(resolve, reject);
        },
      };
      return chain;
    },
  };
  const exports = {};
  new Function("exports", "supabase", "getDashboardRole", "searchDashboardProducts", js)(
    exports,
    supabase,
    async () => role,
    async (query, limit) => {
      assert.equal(query, "Test");
      assert.equal(limit, 5);
      return [{ id: "phone", name: "Test phone", sku: "SKU" }];
    },
  );
  const result = await exports.searchDashboardWorkspace(" Test ");
  assert.equal(result.items.length, 2);
  assert.deepEqual(result.failed, ["Customers"]);
  assert.ok(calls.every((call) => !call.fields.includes("*")));
  calls.length = 0;
  role = null;
  await assert.rejects(exports.searchDashboardWorkspace("Test"), /authentication/);
  assert.equal(calls.length, 0);
});
