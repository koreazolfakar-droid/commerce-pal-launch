import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../supabase/functions/sync-current-hero/index.ts", import.meta.url), "utf8");

function harness(config = {}) {
  const log = [];
  let handler;
  const storage = {
    upload: async (name, value, options) => {
      log.push({ action: "upload", name, type: options.contentType });
      return { error: null };
    },
  };
  const db = {
    auth: {
      async getUser(token) {
        log.push({ action: "getUser", token });
        return config.identityMissing
          ? { data: { user: null }, error: { message: "invalid" } }
          : { data: { user: { id: "trusted-staff" } }, error: null };
      },
    },
    async rpc(name) {
      log.push({ action: "rpc", name });
      return { data: config.role === undefined ? true : config.role,
        error: config.rpcFailure ? { message: "database down" } : null };
    },
    from(table) {
      log.push({ action: "from", table });
      return {
        select() { return this; },
        eq() { return this; },
        or() { return this; },
        order() { return this; },
        limit() { return this; },
        maybeSingle: async () => ({ data: config.hero === undefined ? null : config.hero, error: null }),
      };
    },
    storage: { from(bucket) {
      log.push({ action: "storage", bucket });
      return storage;
    } },
  };
  const exports = {};
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  vm.runInNewContext(outputText, {
    exports,
    require: (path) => {
      if (path.startsWith("jsr:")) return {};
      if (path.startsWith("npm:@supabase/supabase-js")) return { createClient: () => db };
      if (path === "../_shared/trustedHeroSource.ts") return {
        fetchTrustedHeroImage: async (url) => {
          log.push({ action: "sourceFetch", url });
          return { blob: new Blob([Uint8Array.of(0xff, 0xd8, 0xff)]), type: "image/jpeg" };
        },
      };
      throw new Error("unexpected dependency " + path);
    },
    Deno: {
      env: { get: (key) => ({
        SUPABASE_URL: "https://rtwyankpxtffqqrasyzw.supabase.co",
        SUPABASE_ANON_KEY: "fixture-public-only",
      })[key] },
      serve(fn) { handler = fn; },
    },
    URL, Request, Response, Headers, Blob, AbortController, atob, Uint8Array, console: { error() {} },
  }, { timeout: 5000 });
  return { handler, log };
}

function request(headers = {}, method = "POST") {
  return new Request("https://test.supabase.co/functions/v1/sync-current-hero", {
    method,
    headers: {
      origin: "https://www.spacecallapp.store",
      authorization: "Bearer sample-session",
      ...headers,
    },
  });
}

async function invoke(config, headers = {}, method = "POST") {
  const h = harness(config);
  const response = await h.handler(request(headers, method));
  return { status: response.status, body: await response.json(), log: h.log, headers: response.headers };
}

test("untrusted browser origin cannot trigger privileged work", async () => {
  const res = await invoke({}, { origin: "https://attacker.test" });
  assert.equal(res.status, 403);
  assert.equal(res.body.error, "origin_not_allowed");
  assert.equal(res.log.length, 0);
  assert.equal(res.headers.has("access-control-allow-origin"), false);
});

test("missing bearer cannot read hero or write images", async () => {
  const res = await invoke({}, { authorization: "" });
  assert.equal(res.status, 401);
  assert.equal(res.log.length, 0);
});

test("Bearer parser accepts standard base64url tokens containing s and rejects embedded whitespace", async () => {
  const allowed = await invoke({}, { authorization: "Bearer session-sample-token" });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.log.find(x => x.action === "getUser")?.token, "session-sample-token");

  for (const authorization of ["Bearer abc def", "Bearer abc\\\\def", "Bearer abc,def"]) {
    const denied = await invoke({}, { authorization });
    assert.equal(denied.status, 401, authorization);
    assert.equal(denied.log.length, 0, authorization);
  }
});

test("invalid Supabase identity cannot call privileged database queries", async () => {
  const res = await invoke({ identityMissing: true });
  assert.equal(res.status, 401);
  assert.deepEqual(res.log.map(x => x.action), ["getUser"]);
});

test("customer or staff without verified MFA/passkey cannot read or sync hero", async () => {
  const res = await invoke({ role: false });
  assert.equal(res.status, 403);
  assert.equal(res.body.error, "staff_verification_required");
  assert.deepEqual(res.log.map(x => x.action), ["getUser", "rpc"]);
});

test("authorization database outage fails closed before any media fetch", async () => {
  const res = await invoke({ rpcFailure: true });
  assert.equal(res.status, 503);
  assert.equal(res.log.some(x => x.action === "sourceFetch" || x.action === "upload"), false);
});

test("staff verified with MFA can synchronize trusted raster images without exposing privileges", async () => {
  const sourceUrl = "https://rtwyankpxtffqqrasyzw.supabase.co/storage/v1/object/public/cms-media/hero/fixture.jpg";
  const res = await invoke({ hero: { image_url: sourceUrl, mobile_image_url: null } });
  assert.equal(res.status, 200);
  assert.equal(res.body.active, true);
  assert.equal(res.log.filter(x => x.action === "sourceFetch").length, 2);
  assert.equal(res.log.filter(x => x.action === "upload").length, 2);
  assert.equal(res.log.find(x => x.action === "rpc")?.name, "dashboard_staff_access_ready");
});

test("valid staff may reset inactive hero to a non-executable placeholder", async () => {
  const res = await invoke({});
  assert.equal(res.status, 200);
  assert.equal(res.body.active, false);
  assert.equal(res.log.filter(x => x.action === "upload").length, 2);
  assert.ok(res.log.filter(x => x.action === "upload").every(x => x.type === "image/png"));
});

test("oversized claimed body rejects before auth processing", async () => {
  const res = await invoke({}, { "content-length": "4096" });
  assert.equal(res.status, 413);
  assert.equal(res.log.length, 0);
});
