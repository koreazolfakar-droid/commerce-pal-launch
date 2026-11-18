import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import vm from "node:vm";
import ts from "typescript";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");
const [throttleSource, bodySource] = await Promise.all([
  read("supabase/functions/dashboard-auth-throttle/index.ts"),
  read("supabase/functions/_shared/requestBody.ts"),
]);

function compile(source, require, extra = {}) {
  const exports = {};
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  vm.runInNewContext(outputText, {
    exports, require, Request, Response, Headers, ReadableStream,
    TextEncoder, TextDecoder, URL, crypto: webcrypto,
    console: { error() {}, warn() {} }, ...extra,
  }, { timeout: 5000 });
  return exports;
}

const bodyModule = compile(bodySource, (specifier) => {
  throw new Error("unexpected reader dependency " + specifier);
});

function harness(options = {}) {
  let handler;
  const calls = [];
  const client = {
    rpc: async (name, args) => {
      calls.push({ type: "rpc", name, args });
      return { data: options.decision === undefined
        ? { allowed: true, retryAfter: 0, remainingBeforeBlock: 4 }
        : options.decision, error: options.rpcError ? { message: "offline" } : null };
    },
    auth: {
      async getUser(token) {
        calls.push({ type: "auth", token });
        return { data: { user: options.user === undefined
          ? { id: "fixture-staff", email: "real-staff@spacecall.test" } : options.user },
          error: null };
      },
    },
    from(table) {
      calls.push({ type: "table", table });
      let mutation = false;
      const query = {
        select() { return query; },
        delete() { mutation = true; return query; },
        eq() {
          if (mutation) return Promise.resolve({ error: null });
          return query;
        },
        maybeSingle() {
          return Promise.resolve({ data: options.role === undefined
            ? { role: "editor" } : { role: options.role }, error: null });
        },
        lt() { return Promise.resolve({ error: null }); },
      };
      return query;
    },
  };
  compile(throttleSource, (specifier) => {
    if (specifier.startsWith("jsr:")) return {};
    if (specifier.startsWith("npm:@supabase/supabase-js")) return { createClient: () => client };
    if (specifier === "../_shared/requestBody.ts") return bodyModule;
    throw new Error("unexpected edge dependency " + specifier);
  }, {
    Deno: {
      env: { get: (key) => ({
        SUPABASE_URL: "https://fixture.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-only",
      })[key] },
      serve(fn) { handler = fn; },
    },
  });
  return { handler, calls };
}

function request(payload, headers = {}) {
  return new Request("https://fixture.supabase.co/functions/v1/dashboard-auth-throttle", {
    method: "POST",
    headers: { "content-type": "application/json",
      origin: "https://www.spacecallapp.store", "cf-connecting-ip": "203.0.113.5",
      ...headers },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

async function invoke(payload, options = {}, headers = {}) {
  const h = harness(options);
  const response = await h.handler(request(payload, headers));
  return { ...h, response, body: await response.json() };
}

const validAttempt = { email: "STAFF@spacecall.test", outcome: "attempt" };

test("cross-site Origin is rejected before even creating auth clients or DB calls", async () => {
  const h = await invoke(validAttempt, {}, { origin: "https://attacker.test" });
  assert.equal(h.response.status, 403);
  assert.equal(h.body.error, "origin_not_allowed");
  assert.equal(h.calls.length, 0);
  assert.equal(h.response.headers.has("access-control-allow-origin"), false);
});

test("allowed origins retain exact CORS response and no-store", async () => {
  const result = await invoke(validAttempt);
  assert.equal(result.response.status, 200);
  assert.equal(result.response.headers.get("access-control-allow-origin"), "https://www.spacecallapp.store");
  assert.equal(result.response.headers.get("cache-control"), "no-store");
  assert.equal(result.calls.filter((x) => x.type === "rpc").length, 1);
});

test("malformed or non-object payloads never reach the database", async () => {
  for (const payload of ["{", "[]", "null", '"string"', JSON.stringify({ email: "invalid", outcome: "attempt" })]) {
    const result = await invoke(payload);
    assert.equal(result.response.status, 400);
    assert.equal(result.calls.length, 0);
  }
});

test("oversized still-open stream with fake small Content-Length returns 413 and cancels", { timeout: 5000 }, async () => {
  const h = harness();
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(1300)); },
    cancel() { cancelled = true; },
  });
  const req = new Request("https://fixture.supabase.co/functions/v1/dashboard-auth-throttle", {
    method: "POST", body: stream, duplex: "half",
    headers: { origin: "https://www.spacecallapp.store", "content-length": "1" },
  });
  const response = await h.handler(req);
  assert.equal(response.status, 413);
  assert.equal((await response.json()).error, "payload_too_large");
  assert.equal(cancelled, true);
  assert.equal(h.calls.length, 0);
});

test("atomic DB decision denies attempts and fails closed if result is malformed or RPC errors", async () => {
  const denied = await invoke(validAttempt, { decision: { allowed: false, retryAfter: 42 } });
  assert.equal(denied.response.status, 200);
  assert.equal(denied.body.allowed, false);
  assert.equal(denied.body.retryAfter, 42);

  for (const options of [
    { decision: null }, { decision: { allowed: "true", retryAfter: 0 } },
    { decision: { allowed: true, retryAfter: -1 } }, { rpcError: true },
  ]) {
    const response = await invoke(validAttempt, options);
    assert.equal(response.response.status, 503);
    assert.equal(response.body.error, "throttle_unavailable");
  }
});

test("forwarded IP spoofing cannot alter the trusted CF-IP rate-limit bucket", async () => {
  const first = await invoke(validAttempt, {}, { "x-forwarded-for": "1.1.1.1" });
  const second = await invoke(validAttempt, {}, { "x-forwarded-for": "8.8.8.8" });
  const changed = await invoke(validAttempt, {}, { "cf-connecting-ip": "203.0.113.6" });
  const args = (result) => result.calls.find((call) => call.type === "rpc").args;
  assert.equal(args(first).p_pair_key_hash, args(second).p_pair_key_hash);
  assert.equal(args(first).p_ip_key_hash, args(second).p_ip_key_hash);
  assert.notEqual(args(first).p_ip_key_hash, args(changed).p_ip_key_hash);
});

test("reset uses the verified staff identity, ignoring a forged request email", async () => {
  const result = await invoke({ email: "target@spacecall.test", outcome: "success" },
    {}, { authorization: "Bearer verified-test-token" });
  assert.equal(result.body.allowed, true);
  assert.equal(result.calls.filter((x) => x.type === "auth").length, 1);
  assert.equal(result.calls.filter((x) => x.type === "table" &&
    x.table === "dashboard_login_throttle").length, 2);

  const reset = await invoke({ email: "target@spacecall.test", outcome: "success" },
    { user: { id: "fixture-staff", email: "real-staff@spacecall.test" } },
    { authorization: "Bearer verified-test-token" });
  assert.equal(reset.response.status, 200);
});

test("unauthorized reset cannot clear login counters", async () => {
  for (const [options, auth] of [
    [{}, ""],
    [{ user: null }, "Bearer invalid"],
    [{ role: "customer" }, "Bearer authenticated-customer"],
  ]) {
    const result = await invoke({ email: "victim@spacecall.test", outcome: "success" },
      options, { authorization: auth });
    assert.ok([401, 403].includes(result.response.status));
    assert.equal(result.calls.some((c) => c.type === "table" && c.table === "dashboard_login_throttle"), false);
  }
});
