import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function moduleFrom(path, dependencies = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source.replace(/^import[\s\S]*?;\s*/gm, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  new Function("exports", ...Object.keys(dependencies), js)(
    exports,
    ...Object.values(dependencies),
  );
  return exports;
}
const paging = await moduleFrom("../src/dashboard/lib/loadAllRows.ts");

async function productionCallback(path, name, dependencies) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function walk(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === name)
      expression = node.initializer.getText(file);
    ts.forEachChild(node, walk);
  }
  walk(file);
  assert.ok(expression, `Missing production callback ${name}`);
  const js = ts.transpileModule(`const callback = ${expression};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  return new Function(...Object.keys(dependencies), `${js}\nreturn callback;`)(
    ...Object.values(dependencies),
  );
}

for (const page of ["Customers", "Orders"]) {
  test(`${page} ignores old successes and failures without clearing a newer request's loading state`, async () => {
    const queue = [],
      results = [],
      errors = [],
      loading = [];
    const dependencies = {
      useCallback: (fn) => fn,
      search: "test",
      page: 1,
      filter: "all",
      status: "all",
      paymentStatus: "all",
      sort: "newest",
      requestVersion: { current: 0 },
      queryKey: "fixture-query",
      currentQuery: { current: "fixture-query" },
      setResultQuery() {},
      setPage() {},
      setRefreshing() {},
      setLoading: (value) => loading.push(value),
      setResult: (value) => results.push(value),
      setError: (value) => errors.push(value),
      toast: { success() {}, error() {} },
      [`listDashboard${page}`]: () =>
        new Promise((resolve, reject) => queue.push({ resolve, reject })),
    };
    const load = await productionCallback(
      `../src/dashboard/pages/${page}Page.tsx`,
      "load",
      dependencies,
    );
    const old = load(),
      latest = load();
    queue[0].resolve({ marker: "old" });
    await old;
    assert.deepEqual(results, []);
    assert.deepEqual(loading, [true, true]);
    queue[1].resolve({ marker: "latest" });
    await latest;
    assert.deepEqual(results, [{ marker: "latest" }]);
    const failure = load(),
      success = load();
    queue[3].resolve({ marker: "newest" });
    await success;
    queue[2].reject(new Error("stale failure"));
    await failure;
    assert.deepEqual(errors, ["", ""]);
    assert.deepEqual(results.at(-1), { marker: "newest" });
  });
}

test("inventory draft commit uses the pre-refresh snapshot and retains edits on conflict", async () => {
  const original = {
    variantId: "variant",
    productName: "Product",
    stock: 10,
    trackInventory: true,
  };
  const refreshed = { ...original, stock: 9 };
  const drafts = { variant: "12" },
    calls = [],
    errors = [];
  const commit = await productionCallback(
    "../src/dashboard/pages/InventoryManagerPage.tsx",
    "commitAbsolute",
    {
      savingId: null,
      savingRef: { current: false },
      lang: "en",
      draftStocks: drafts,
      draftSnapshots: { current: new Map([["variant", original]]) },
      setSavingId() {},
      setDraftStocks() {
        throw new Error("Conflict must preserve the draft");
      },
      setInventoryStock: async (...args) => {
        calls.push(args);
        throw new Error("stock conflict");
      },
      replaceRowStock() {
        throw new Error("Conflict must not update the displayed stock");
      },
      load() {},
      toast: { success() {}, error: (message) => errors.push(message) },
    },
  );
  await commit(refreshed);
  assert.equal(calls[0][0].stock, 10);
  assert.equal(calls[0][1], 12);
  assert.equal(drafts.variant, "12");
  assert.deepEqual(errors, ["stock conflict"]);
});


test("blank and invalid inventory drafts cannot write stock or clear the user's edit", async () => {
  const row = { variantId: "variant", productName: "Product", stock: 10, trackInventory: true };
  for (const raw of ["", " ", "-1", "1.5", "Infinity", "9007199254740992"]) {
    const errors = [];
    const commit = await productionCallback(
      "../src/dashboard/pages/InventoryManagerPage.tsx",
      "commitAbsolute",
      {
        savingRef: { current: false }, lang: "en",
        draftStocks: { variant: raw },
        toast: { error: (message) => errors.push(message) },
        setInventoryStock() { assert.fail("Invalid draft must not write stock"); },
        setDraftStocks() { assert.fail("Invalid draft must remain available for correction"); },
      },
    );
    await commit(row);
    assert.equal(errors.length, 1, JSON.stringify(raw));
  }
});

test("inventory writes serialize immediate submissions and accept explicit zero", async () => {
  const row = { variantId: "variant", productName: "Product", stock: 10, trackInventory: true };
  const lock = { current: false };
  const calls = [];
  let complete;
  const commit = await productionCallback(
    "../src/dashboard/pages/InventoryManagerPage.tsx",
    "commitAbsolute",
    {
      savingRef: lock, lang: "en", draftStocks: { variant: "0" },
      draftSnapshots: { current: new Map([["variant", row]]) },
      setSavingId() {},
      setInventoryStock(...args) {
        calls.push(args);
        return new Promise((resolve) => { complete = resolve; });
      },
      replaceRowStock(...args) { calls.push(args); },
      load() {},
      toast: { success() {}, error(message) { assert.fail(message); } },
    },
  );
  const first = commit(row);
  await commit(row);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], 0);
  assert.equal(lock.current, true);
  complete(0);
  await first;
  assert.equal(lock.current, false);
  assert.deepEqual(calls[1], ["variant", 0, -10]);
});


test("PO detail clears a previous route's order before a failed request and retains same-order refresh data", async () => {
  let po = { id: "previous-order" };
  const errors = [], loading = [];
  const dependencies = {
    id: "current-order",
    useCallback: (fn) => fn,
    mutationTarget: { current: null },
    requestVersion: { current: 0 },
    activeId: { current: "current-order" },
    setPo: (next) => { po = typeof next === "function" ? next(po) : next; },
    setError: (message) => errors.push(message),
    setLoading: (value) => loading.push(value),
    setRefreshing() {},
    loadPurchaseOrderDetail: async () => { throw new Error("Fixture offline"); },
    toast: { error() {} },
  };
  const load = await productionCallback(
    "../src/dashboard/pages/PurchaseOrderDetailPage.tsx", "load", dependencies,
  );
  const request = load();
  assert.equal(po, null);
  await request;
  assert.equal(errors.at(-1), "Fixture offline");
  assert.equal(loading.at(-1), false);
  po = { id: "current-order" };
  await load(true);
  assert.equal(po.id, "current-order");
  assert.equal(errors.at(-1), "Fixture offline");
  dependencies.mutationTarget.current = "current-order";
  po = { id: "another-route" };
  await load(false, true);
  assert.equal(po, null);
  assert.equal(loading.at(-1), false);
  assert.equal(errors.at(-1), "Fixture offline");
});


for (const [handler, args] of [
  ["changeStatus", ["confirmed"]],
  ["changePayment", ["paid"]],
  ["changeDelivery", []],
]) {
  for (const outcome of ["success", "failure"]) {
    test(handler + " reloads the original order after navigating away and returning during " + outcome, async () => {
      const original = {
        id: "order-a", version: 1, publicOrderNumber: 1, status: "new",
        paymentStatus: "unpaid", deliveryType: "paid", shippingTotal: 7,
      };
      const saved = { ...original, version: 2, deliveryType: "free", shippingTotal: 0 };
      const other = { ...original, id: "order-b", shippingTotal: 99 };
      const state = { order: original, loading: false, saving: false, deliveryFee: "7" };
      const reads = [];
      let complete, fail;
      const pending = new Promise((resolve, reject) => { complete = resolve; fail = reject; });
      const dependencies = {
        id: original.id, order: original, saving: false, loading: false, lang: "en",
        deliveryType: "free", deliveryFee: "0",
        mutationOrderId: { current: null },
        mounted: { current: true },
        requestVersion: { current: 0 },
        currentOrderId: { current: original.id },
        useCallback: (fn) => fn,
        setOrder: (next) => { state.order = typeof next === "function" ? next(state.order) : next; },
        setLoading: (value) => { state.loading = value; },
        setSaving: (value) => { state.saving = value; },
        setError() {},
        setCancelOrderId() {},
        setDeliveryType() {},
        setDeliveryFee: (value) => { state.deliveryFee = value; },
        orderStatusLabel: (value) => value,
        paymentStatusLabel: (value) => value,
        toast: { success() {}, error() {} },
        getDashboardOrder: async (id) => { reads.push(id); return id === other.id ? other : saved; },
        updateDashboardOrderStatus: () => pending,
        updateDashboardOrderPaymentStatus: () => pending,
        updateDashboardOrderDelivery: () => pending,
      };
      const path = "../src/dashboard/pages/OrderDetailPage.tsx";
      dependencies.load = await productionCallback(path, "load", dependencies);
      const mutate = await productionCallback(path, handler, dependencies);
      const operation = mutate(...args);
      dependencies.requestVersion.current += 1;
      dependencies.currentOrderId.current = other.id;
      const loadOther = await productionCallback(path, "load", { ...dependencies, id: other.id });
      await loadOther();
      assert.equal(state.order.id, other.id);
      dependencies.requestVersion.current += 1;
      dependencies.currentOrderId.current = original.id;
      await dependencies.load();
      assert.deepEqual(reads, [other.id]);
      if (outcome === "success") complete(saved);
      else fail(new Error("Fixture write failed"));
      await operation;
      await Promise.resolve();
      await Promise.resolve();
      assert.deepEqual(reads, [other.id, original.id]);
      assert.equal(state.order.id, original.id);
      assert.equal(state.deliveryFee, "0");
      assert.equal(state.saving, false);
      assert.equal(state.loading, false);
      assert.equal(dependencies.mutationOrderId.current, null);
    });
  }
}

test("preferences still work within the tab when browser storage is blocked", async () => {
  const previous = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    },
  };
  try {
    const preferences = await moduleFrom("../src/dashboard/lib/preferenceStorage.ts");
    assert.equal(preferences.readPreference("language"), null);
    preferences.writePreference("language", "ar");
    assert.equal(preferences.readPreference("language"), "ar");
  } finally {
    globalThis.window = previous;
  }
});

test("customer history pages preserve phone matching and staff authorization in PostgreSQL", async () => {
  const { PGlite } = await import(process.env.SPACE_CALL_PGLITE_MODULE || "@electric-sql/pglite");
  const db = new PGlite();
  try {
    await db.exec(
      "create schema private; create role anon; create role authenticated; create function private.is_dashboard_staff() returns boolean language sql as $$select true$$; create table store_customers(id uuid, phone_normalized text); create table store_orders(id uuid, customer_phone text, created_at timestamptz);",
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261005003000_customer_order_history_pages.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const customer = "00000000-0000-4000-8000-000000000001";
    await db.query("insert into store_customers values ($1,'12345');", [customer]);
    await db.exec(
      "insert into store_orders select gen_random_uuid(), '+12 345', now() from generate_series(1,151); insert into store_orders values(gen_random_uuid(),'67890',now());",
    );
    const first = (
      await db.query("select * from get_store_customer_orders_page($1,100,0)", [customer])
    ).rows;
    const rest = (
      await db.query("select * from get_store_customer_orders_page($1,100,100)", [customer])
    ).rows;
    assert.equal(first.length, 100);
    assert.equal(rest.length, 51);
    assert.equal(new Set([...first, ...rest].map((row) => row.id)).size, 151);
    await db.exec(
      "create or replace function private.is_dashboard_staff() returns boolean language sql as $$select false$$;",
    );
    assert.deepEqual(
      (await db.query("select * from get_store_customer_orders_page($1,100,0)", [customer])).rows,
      [],
    );
  } finally {
    await db.close();
  }
});

test("all-row loader continues below the API cap and propagates later-page failures", async () => {
  const rows = Array.from({ length: 251 }, (_, id) => ({ id }));
  const calls = [];
  const query = {
    order() {
      return this;
    },
    async range(from, to) {
      calls.push(from);
      return { data: rows.slice(from, Math.min(to + 1, from + 37)), error: null };
    },
  };
  assert.deepEqual((await paging.loadAllRows(query)).data, rows);
  assert.ok(calls.includes(222));
  query.range = async (from) =>
    from === 0
      ? { data: rows.slice(0, 37), error: null }
      : { data: null, error: { message: "offline" } };
  assert.deepEqual(await paging.loadAllRows(query), { data: null, error: { message: "offline" } });
});

test("IN filters are deduplicated and batched without dropping rows", async () => {
  const batches = [];
  const ids = Array.from({ length: 250 }, (_, id) => String(id));
  const result = await paging.loadRowsByIds([...ids, "0"], (batch) => {
    batches.push(batch);
    return {
      order() {
        return this;
      },
      async range(from, to) {
        return { data: batch.slice(from, to + 1), error: null };
      },
    };
  });
  assert.deepEqual(result.data, ids);
  assert.deepEqual(
    batches.map((batch) => batch.length),
    [100, 100, 50],
  );
});

const receiving = await moduleFrom("../src/dashboard/data/receiving.ts", {
  ...paging,
  getDashboardRole: async () => "admin",
});
test("procurement converts each original PO currency using its saved base-currency rate", () => {
  const workspace = {
    receivings: [],
    purchaseOrders: [
      {
        id: "usd",
        supplierId: "supplier",
        supplierName: "Supplier",
        status: "ordered",
        grandTotal: 100,
        currency: "USD",
        exchangeRate: 1,
      },
      {
        id: "eur",
        supplierId: "supplier",
        supplierName: "Supplier",
        status: "ordered",
        grandTotal: 100,
        currency: "EUR",
        exchangeRate: 1.2,
      },
      {
        id: "lbp",
        supplierId: "supplier",
        supplierName: "Supplier",
        status: "cancelled",
        grandTotal: 1000000,
        currency: "LBP",
        exchangeRate: 0.00001,
      },
    ],
  };
  const result = receiving.buildProcurementAnalytics(workspace);
  assert.equal(result.totalSpend, 220);
  assert.equal(result.supplierSpend[0].spend, 220);
});

const aiAccess = await moduleFrom("../supabase/functions/dashboard-ai-assist/access.ts");
test("media deletion checks permissions and references, and restores metadata on Storage failure", async () => {
  let role = "editor",
    references = [],
    deletes = 0,
    storageCalls = 0;
  const restored = [];
  const media = await moduleFrom("../src/dashboard/data/media.ts", {
    getDashboardRole: async () => role,
    looseSupabase: { rpc: async () => ({ data: references, error: null }) },
    supabase: {
      from: () => ({
        delete: () => ({
          eq: async () => {
            deletes += 1;
            return { error: null };
          },
        }),
        insert: async (value) => {
          restored.push(value);
          return { error: null };
        },
      }),
      storage: {
        from: () => ({
          remove: async () => {
            storageCalls += 1;
            return { error: { message: "offline" } };
          },
        }),
      },
    },
  });
  const asset = {
    id: "asset",
    bucketId: "cms-media",
    objectPath: "library/image.webp",
    fileName: "image.webp",
    mimeType: "image/webp",
    sizeBytes: 100,
    altText: "Image",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  };
  await assert.rejects(media.deleteDashboardMediaAsset(asset), /Only dashboard admins/);
  role = "admin";
  references = [{ source: "cms_sections", record_id: "section" }];
  await assert.rejects(media.deleteDashboardMediaAsset(asset), /cms_sections \(section\)/);
  assert.equal(deletes, 0);
  assert.equal(storageCalls, 0);
  references = [];
  await assert.rejects(media.deleteDashboardMediaAsset(asset), /entry was restored/);
  assert.equal(deletes, 1);
  assert.equal(storageCalls, 1);
  assert.equal(restored[0].id, asset.id);
  assert.equal(restored[0].object_path, asset.objectPath);
  assert.equal(restored[0].created_at, asset.createdAt);
  assert.equal(restored[0].updated_at, asset.updatedAt);
});
test("AI denies a first-factor-only staff session before spending provider quota", async () => {
  let calls = 0;
  const result = await aiAccess.checkDashboardAiAccess(
    { rpc: async () => ({ data: false, error: null }) },
    {
      rpc: async () => {
        calls += 1;
        return { data: [{ allowed: true }], error: null };
      },
    },
    "staff-id",
  );
  assert.equal(result.status, 403);
  assert.equal(calls, 0);
});
test("AI fails closed on assurance errors and rate-limit outages", async () => {
  const staff = { rpc: async () => ({ data: true, error: null }) };
  const admin = { rpc: async () => ({ data: null, error: { message: "offline" } }) };
  assert.equal((await aiAccess.checkDashboardAiAccess(staff, admin, "staff-id")).status, 503);
  assert.equal((await aiAccess.checkDashboardAiAccess(admin, admin, "staff-id")).status, 503);
});
test("verified AI sessions consume a per-user quota and return 429 when exhausted", async () => {
  const staff = { rpc: async () => ({ data: true, error: null }) };
  const calls = [];
  const admin = {
    rpc: async (...args) => {
      calls.push(args);
      return { data: [{ allowed: true }], error: null };
    },
  };
  assert.equal(await aiAccess.checkDashboardAiAccess(staff, admin, "staff-id"), null);
  assert.equal(calls[0][1]._key, "dashboard-ai:staff-id");
  admin.rpc = async () => ({ data: [{ allowed: false }], error: null });
  assert.equal((await aiAccess.checkDashboardAiAccess(staff, admin, "staff-id")).status, 429);
});

test("media deletion is blocked for nested and URL-encoded references in PostgreSQL", async () => {
  const { PGlite } = await import(process.env.SPACE_CALL_PGLITE_MODULE || "@electric-sql/pglite");
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        new URL("./fixtures/product-editor-stock-schema.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(
      "create table cms_media_assets(id uuid primary key, bucket_id text, object_path text); create table cms_sections(id uuid primary key, settings jsonb);",
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261005002000_guard_referenced_dashboard_media.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const id = "00000000-0000-4000-8000-000000000001";
    await db.query(
      "insert into cms_media_assets values ($1,'cms-media','folder/image space.webp')",
      [id],
    );
    await db.query("insert into cms_sections values ($1,$2::jsonb)", [
      id,
      JSON.stringify({
        nested: {
          image:
            "https://example.com/storage/v1/object/public/cms-media/folder/image%20space.webp?v=1",
        },
      }),
    ]);
    assert.deepEqual((await db.query("select * from get_dashboard_media_usage($1)", [id])).rows, [
      { source: "cms_sections", record_id: id },
    ]);
    await assert.rejects(
      db.query("delete from cms_media_assets where id=$1", [id]),
      /media_asset_in_use/,
    );
    await db.query("delete from cms_sections where id=$1", [id]);
    await db.query("delete from cms_media_assets where id=$1", [id]);
    assert.equal(
      (await db.query("select count(*)::integer as count from cms_media_assets")).rows[0].count,
      0,
    );
  } finally {
    await db.close();
  }
});

test("saved empty settings remain empty while missing settings keep their defaults", async () => {
  const settings = await moduleFrom("../src/dashboard/data/settings.ts", {
    STORE_CONFIG: {
      name: "Space Call",
      whatsappNumber: "111",
      socialInstagram: "https://example.com/default",
      socialFacebook: "",
      socialX: "",
      socialYoutube: "",
    },
    getDashboardRole: async () => "admin",
    supabase: {
      from: () => ({
        select: () => ({
          in: async () => ({ data: [{ key: "whatsapp_number", value_text: "" }], error: null }),
        }),
      }),
    },
  });
  const result = await settings.loadDashboardSiteSettings();
  assert.equal(result.whatsappNumber, "");
  assert.equal(result.instagramUrl, "https://example.com/default");
});

test("navigation guard cancels programmatic departure, permits consent, and restores history methods", async () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const events = new EventTarget();
  const location = {
    href: "https://example.com/dashboard/products/1",
    pathname: "/dashboard/products/1",
  };
  const history = {
    state: null,
    pushState(state, _, url) {
      this.state = state;
      location.href = new URL(url, location.href).href;
      location.pathname = new URL(location.href).pathname;
    },
    replaceState(state, _, url) {
      this.pushOriginal(state, _, url);
    },
    go() {},
  };
  history.pushOriginal = history.pushState;
  const originalPush = history.pushState;
  const mockWindow = {
    location,
    history,
    confirm: () => false,
    addEventListener: (...args) => events.addEventListener(...args),
    removeEventListener: (...args) => events.removeEventListener(...args),
  };
  globalThis.window = mockWindow;
  globalThis.document = { documentElement: { lang: "en" } };
  try {
    const guard = await moduleFrom("../src/dashboard/lib/unsavedChanges.ts");
    const cleanup = guard.installDashboardNavigationGuard();
    guard.setDashboardDraftDirty("editor", true);
    history.pushState(null, "", "/dashboard/orders");
    assert.equal(location.pathname, "/dashboard/products/1");
    assert.equal(guard.hasDashboardUnsavedChanges(), true);
    mockWindow.confirm = () => true;
    history.pushState(null, "", "/dashboard/orders");
    assert.equal(location.pathname, "/dashboard/orders");
    assert.equal(guard.hasDashboardUnsavedChanges(), false);
    cleanup();
    assert.equal(history.pushState, originalPush);
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  }
});
