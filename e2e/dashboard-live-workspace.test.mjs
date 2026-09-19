import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import ts from "typescript";

async function moduleWithTransport(path, role, responses = []) {
  const calls = [];
  const supabase = {
    from(table) {
      calls.push(["from", table]);
      const result = responses.shift() ?? { data: [], error: null };
      const chain = new Proxy(
        {},
        {
          get(_, name) {
            if (name === "then")
              return (resolve, reject) => Promise.resolve(result).then(resolve, reject);
            return (...args) => {
              calls.push([name, ...args]);
              return chain;
            };
          },
        },
      );
      return chain;
    },
  };
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source.replace(/^import[\s\S]*?;\s*/gm, ""), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function("exports", "supabase", "getDashboardRole", js)(exports, supabase, async () => role);
  return { api: exports, calls };
}

test("workspace denies anonymous users and non-admin staff directory access before querying", async () => {
  for (const [role, source] of [
    [null, "catalog"],
    ["editor", "users"],
  ]) {
    const { api, calls } = await moduleWithTransport("../src/dashboard/data/workspace.ts", role);
    await assert.rejects(api.loadWorkspaceRows(source, 0));
    assert.equal(calls.length, 0);
  }
});

test("activity pagination returns only the page and carries a next-page marker", async () => {
  const data = Array.from({ length: 26 }, (_, id) => ({
    id,
    action: "UPDATE",
    entity_type: "product",
    created_at: "2026-09-19T12:00:00Z",
  }));
  const { api, calls } = await moduleWithTransport("../src/dashboard/data/workspace.ts", "admin", [
    { data, error: null },
  ]);
  const result = await api.loadWorkspaceRows("catalog", 2);
  assert.equal(result.rows.length, 25);
  assert.equal(result.hasMore, true);
  assert.ok(calls.some((call) => JSON.stringify(call) === JSON.stringify(["range", 50, 75])));
  assert.equal(result.rows[0].label, "UPDATE");
});

test("failed queries propagate errors instead of masquerading as empty data", async () => {
  const { api } = await moduleWithTransport("../src/dashboard/data/workspace.ts", "admin", [
    { data: null, error: new Error("offline") },
  ]);
  await assert.rejects(api.loadWorkspaceRows("cms", 0), /offline/);
});

test("homepage previews do not fabricate products for an empty or unknown source", async () => {
  const { api, calls } = await moduleWithTransport(
    "../src/dashboard/data/homepagePreview.ts",
    "admin",
  );
  assert.deepEqual(await api.loadHomepagePreviewProducts({ type: "collection", settings: {} }), []);
  assert.equal(calls.length, 0);
  assert.deepEqual(
    await api.loadHomepagePreviewProducts({
      type: "featured-products",
      settings: { source: "brand", sourceValue: "missing" },
    }),
    [],
  );
  assert.equal(api.previewSource({ type: "collection", settings: { count: 999 } }).limit, 20);
});

test("homepage preview uses actual product price, currency and primary image", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const { api } = await moduleWithTransport("../src/dashboard/data/homepagePreview.ts", "admin", [
    {
      error: null,
      data: [
        {
          id,
          title: "Actual catalog item",
          base_price: 100,
          currency: "USD",
          store_product_variants: [{ price: 80, is_active: true, sort_order: 0 }],
          store_product_images: [
            { url: "secondary", is_primary: false, sort_order: 0 },
            { url: "primary", is_primary: true, sort_order: 1 },
          ],
        },
      ],
    },
  ]);
  const rows = await api.loadHomepagePreviewProducts({
    type: "featured-products",
    settings: { source: "manual", sourceValue: id },
  });
  assert.deepEqual(rows, [
    { id, name: "Actual catalog item", price: 80, currency: "USD", image: "primary" },
  ]);
});

test("production dashboard contains no mock data imports or simulated saves", async () => {
  const root = new URL("../src/dashboard/", import.meta.url);
  for (const path of await readdir(root, { recursive: true })) {
    if (!/\.(ts|tsx)$/.test(path)) continue;
    const source = await readFile(new URL(path, root), "utf8");
    assert.doesNotMatch(
      source,
      /@\/dashboard\/mock\/|Mock changes saved|sync simulation completed|124,892/,
    );
  }
});
