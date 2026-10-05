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

test(
  "customer history pages preserve phone matching and staff authorization in PostgreSQL",
  { skip: !process.env.SPACE_CALL_PGLITE_MODULE },
  async () => {
    const { PGlite } = await import(process.env.SPACE_CALL_PGLITE_MODULE);
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
  },
);

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

test(
  "media deletion is blocked for nested and URL-encoded references in PostgreSQL",
  { skip: !process.env.SPACE_CALL_PGLITE_MODULE },
  async () => {
    const { PGlite } = await import(process.env.SPACE_CALL_PGLITE_MODULE);
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
  },
);

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
