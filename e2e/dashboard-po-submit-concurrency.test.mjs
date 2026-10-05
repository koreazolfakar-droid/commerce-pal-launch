import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const pageSource = await readFile(
  new URL("../src/dashboard/pages/ReceivingPage.tsx", import.meta.url),
  "utf8",
);
const dataSource = await readFile(
  new URL("../src/dashboard/data/receiving.ts", import.meta.url),
  "utf8",
);
const rpcArgsSource = await readFile(
  new URL("../src/dashboard/lib/rpcArgs.ts", import.meta.url),
  "utf8",
);

function extract(source, name) {
  const file = ts.createSourceFile(
    "source.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let result;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      result = node.getText(file);
    } else if (ts.isVariableDeclaration(node) && node.name.getText(file) === name) {
      result = `const ${node.getText(file)};`;
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(result, `Missing production function: ${name}`);
  return result;
}

function harness({ confirm = true, response = { data: "pending_approval", error: null } } = {}) {
  const calls = { rpc: [], saving: [], success: [], error: [], reload: [] };
  const source = [
    extract(dataSource, "throwIfError"),
    extract(dataSource, "requireDashboardStaff"),
    extract(dataSource, "submitPurchaseOrder"),
    extract(rpcArgsSource, "rpcArgs"),
    extract(pageSource, "submitPo"),
  ].join("\n");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const submit = new Function(
    "exports",
    "getDashboardRole",
    "looseSupabase",
    "window",
    "setSaving",
    "toast",
    "load",
    `${js}\nreturn submitPo;`,
  )(
    {},
    async () => "editor",
    {
      rpc: async (...args) => {
        calls.rpc.push(args);
        return response;
      },
    },
    { confirm: () => confirm },
    (value) => calls.saving.push(value),
    {
      success: (message) => calls.success.push(message),
      error: (message) => calls.error.push(message),
    },
    async (manual) => calls.reload.push(manual),
  );
  return { submit, calls };
}

const po = {
  id: "00000000-0000-4000-8000-000000000001",
  poNumber: "PO-REGRESSION-001",
  updatedAt: "2026-10-05T10:15:30.123456+00:00",
};

test("PO list submission sends its loaded version unchanged to the v2 RPC and refreshes on success", async () => {
  const { submit, calls } = harness();
  await submit(po);
  assert.deepEqual(calls.rpc, [
    [
      "submit_store_purchase_order_v2",
      {
        p_purchase_order_id: po.id,
        p_expected_updated_at: po.updatedAt,
      },
    ],
  ]);
  assert.deepEqual(calls.saving, [true, false]);
  assert.deepEqual(calls.reload, [false]);
  assert.deepEqual(calls.success, [`PO ${po.poNumber} submitted for approval.`]);
  assert.deepEqual(calls.error, []);
});

test("a stale PO response is reported without success or retrying over the newer version", async () => {
  const { submit, calls } = harness({
    response: { data: null, error: { message: "procurement_version_conflict" } },
  });
  await submit(po);
  assert.equal(calls.rpc.length, 1);
  assert.equal(calls.rpc[0][1].p_expected_updated_at, po.updatedAt);
  assert.deepEqual(calls.saving, [true, false]);
  assert.deepEqual(calls.success, []);
  assert.deepEqual(calls.reload, []);
  assert.deepEqual(calls.error, [
    "This procurement record changed in another session. Refresh and try again.",
  ]);
});

test("cancelling PO submission leaves the RPC and UI state untouched", async () => {
  const { submit, calls } = harness({ confirm: false });
  await submit(po);
  assert.deepEqual(calls, { rpc: [], saving: [], success: [], error: [], reload: [] });
});
