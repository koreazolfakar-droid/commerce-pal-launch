import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/dashboard/data/catalog.ts", import.meta.url), "utf8");
function transport(role = "editor") {
  const tree = ts.createSourceFile("catalog.ts", source, ts.ScriptTarget.Latest, true);
  const fn = tree.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "updateDashboardProductImageAltText");
  assert.ok(fn, "real product image alt-text transport must exist");
  const calls = [];
  const query = {
    update(payload) { calls.push(payload); return this; },
    eq(key, value) { calls.push([key, value]); return this; },
    select() { return this; },
    async single() { return { data: { id: "image-1", alt_text: "New alt" }, error: null }; },
  };
  const js = ts.transpileModule(fn.getText(tree), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const update = new Function("exports", "requireDashboardRole", "supabase", "throwIfError", "mapProductImage", "invalidateNativeStoreCache", "broadcastStorefrontRefresh", `${js};return updateDashboardProductImageAltText;`)(
    {}, async () => { if (!role) throw new Error("Unauthorized"); },
    { from(name) { assert.equal(name, "store_product_images"); return query; } },
    (error) => { if (error) throw error; }, (row) => row,
    () => calls.push("invalidate"), () => calls.push("broadcast"),
  );
  return { update, calls };
}

test("alt text persists to the exact product image and refreshes storefront reads", async () => {
  const { update, calls } = transport();
  await update("product-1", "image-1", " New alt ");
  assert.deepEqual(calls, [{ alt_text: "New alt" }, ["id", "image-1"], ["product_id", "product-1"], "invalidate", "broadcast"]);
});

test("unauthorized or oversized alt-text edits never reach the mutation", async () => {
  const denied = transport(null);
  await assert.rejects(denied.update("p", "i", "Alt"), /Unauthorized/);
  assert.deepEqual(denied.calls, []);
  const oversized = transport();
  await assert.rejects(oversized.update("p", "i", "x".repeat(501)), /500/);
  assert.deepEqual(oversized.calls, []);
});
