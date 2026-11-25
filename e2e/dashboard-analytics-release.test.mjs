import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const moduleUrl = new URL("../scripts/lib/analytics-release.mjs", import.meta.url);
async function release() {
  const mod = await import(moduleUrl).catch((error) => {
    if (error.code === "ERR_MODULE_NOT_FOUND" && error.url === moduleUrl.href) return {};
    throw error;
  });
  assert.equal(typeof mod.checkAnalyticsRelease, "function", "release readiness gate must exist");
  return mod;
}
const config = { url: "https://project.supabase.co", key: "sb_publishable_public-test" };
const permission = (name) =>
  new Response(
    JSON.stringify({ code: "42501", message: `permission denied for function ${name}` }),
    { status: 401 },
  );
const nameOf = (url) => new URL(url).pathname.split("/").at(-1);
const jwt = (role) =>
  `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.test-signature`;

test("release preflight requires exact anonymous permission denial for both bounded RPC signatures", async () => {
  const { checkAnalyticsRelease } = await release();
  const calls = [];
  const result = await checkAnalyticsRelease(config, async (url, options) => {
    calls.push({ url, options });
    return permission(nameOf(url));
  });
  assert.equal(result.ready, true);
  assert.equal(result.checks.length, 2);
  assert.equal(calls.length, 2);
  for (const { url, options } of calls) {
    assert.equal(new URL(url).origin, config.url);
    assert.equal(options.method, "POST");
    assert.equal(options.headers.apikey, config.key);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.redirect, "error");
    assert.equal(options.credentials, "omit");
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal instanceof AbortSignal);
    const body = JSON.parse(options.body);
    if (nameOf(url) === "get_dashboard_inventory_alerts")
      assert.deepEqual(body, {
        p_search: "",
        p_status: "all",
        p_sort: "severity",
        p_page: 1,
        p_page_size: 1,
      });
    else
      assert.deepEqual(body, {
        p_start: "2000-01-01T00:00:00.000Z",
        p_end: "2000-01-02T00:00:00.000Z",
        p_compare: false,
        p_currency: "USD",
      });
  }
});
test("missing schema blocks release while preserving the independent ready RPC", async () => {
  const { checkAnalyticsRelease } = await release();
  const result = await checkAnalyticsRelease(config, async (url) =>
    nameOf(url) === "get_dashboard_analytics_snapshot"
      ? new Response(JSON.stringify({ code: "PGRST202", message: "Could not find the function" }), {
          status: 404,
        })
      : permission(nameOf(url)),
  );
  assert.equal(result.ready, false);
  assert.deepEqual(
    result.checks.map((r) => r.status),
    ["missing-schema", "ready"],
  );
});
test("HTTP denial alone does not prove readiness or distinguish the right function", async () => {
  const { checkAnalyticsRelease } = await release();
  for (const payload of [
    { message: "Invalid API key" },
    { code: "42501", message: "permission denied for function unrelated" },
    { code: "42501", message: "permission denied for table store_sales" },
  ]) {
    const result = await checkAnalyticsRelease(
      config,
      async () => new Response(JSON.stringify(payload), { status: 401 }),
    );
    assert.equal(result.ready, false);
  }
});
test("unexpected public success blocks release without reading or reporting business data", async () => {
  const { checkAnalyticsRelease } = await release();
  let reads = 0;
  const response = {
    status: 200,
    ok: true,
    redirected: false,
    json: () => {
      reads++;
      return { customers: ["Private customer"] };
    },
    body: { cancel: async () => {} },
  };
  const result = await checkAnalyticsRelease(config, async () => response);
  assert.equal(result.ready, false);
  assert.equal(reads, 0);
  assert.ok(result.checks.every((c) => c.status === "unsafe-access"));
  assert.ok(!JSON.stringify(result).includes("Private customer"));
});
test("staff guard without a revoked EXECUTE privilege still blocks release", async () => {
  const { checkAnalyticsRelease } = await release();
  const result = await checkAnalyticsRelease(
    config,
    async () =>
      new Response(JSON.stringify({ code: "P0001", message: "dashboard staff required" }), {
        status: 400,
      }),
  );
  assert.equal(result.ready, false);
  assert.ok(result.checks.every((c) => c.status === "unsafe-access"));
});
test("network failure, redirect, malformed JSON and server error fail closed without exposing internals", async () => {
  const { checkAnalyticsRelease } = await release();
  for (const fetcher of [
    async () => {
      throw new Error("transport secret=must-not-log");
    },
    async () => new Response("", { status: 302, headers: { location: "https://other.test" } }),
    async () => new Response("html error", { status: 503 }),
    async () =>
      new Response(JSON.stringify({ code: "XX000", message: "private internal query" }), {
        status: 500,
      }),
  ]) {
    const result = await checkAnalyticsRelease(config, fetcher);
    assert.equal(result.ready, false);
    assert.ok(!JSON.stringify(result).includes("must-not-log"));
    assert.ok(!JSON.stringify(result).includes("private internal"));
  }
});
test("secret keys, staff JWTs and invalid endpoints are rejected before any network call", async () => {
  const { checkAnalyticsRelease } = await release();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return permission("unused");
  };
  for (const key of [
    "sb_secret_do-not-use",
    jwt("service_role"),
    jwt("authenticated"),
    "invalid-key",
  ])
    await assert.rejects(() => checkAnalyticsRelease({ ...config, key }, fetcher));
  for (const url of [
    "http://project.supabase.co",
    "https://name:password@project.supabase.co",
    "https://project.supabase.co/unexpected",
    "https://project.supabase.co?key=hidden",
  ])
    await assert.rejects(() => checkAnalyticsRelease({ ...config, url }, fetcher));
  assert.equal(calls, 0);
});
test("legacy public anon keys use an anon bearer header", async () => {
  const { checkAnalyticsRelease } = await release();
  const key = jwt("anon");
  const result = await checkAnalyticsRelease({ ...config, key }, async (url, options) => {
    assert.equal(options.headers.Authorization, `Bearer ${key}`);
    return permission(nameOf(url));
  });
  assert.equal(result.ready, true);
});
test("release config follows browser environment precedence and reads only explicit public defaults", async () => {
  const { resolveAnalyticsReleaseConfig } = await release();
  const defaults = { url: config.url, key: config.key };
  assert.deepEqual(resolveAnalyticsReleaseConfig({}, defaults), defaults);
  assert.deepEqual(
    resolveAnalyticsReleaseConfig(
      {
        SUPABASE_URL: "https://node.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable_node",
        VITE_SUPABASE_URL: "https://vite.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_vite",
      },
      defaults,
    ),
    { url: "https://vite.supabase.co", key: "sb_publishable_vite" },
  );
  assert.throws(() =>
    resolveAnalyticsReleaseConfig({ SUPABASE_PUBLISHABLE_KEY: "sb_secret_no" }, defaults),
  );
});
test("missing migration errors become a localized service message and other failures stay distinct", async () => {
  const source = await readFile(
    new URL("../src/dashboard/lib/analyticsErrors.ts", import.meta.url),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  const { analyticsErrorMessage } = await import(
    `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
  );
  for (const code of ["PGRST202", "42883"])
    assert.equal(
      analyticsErrorMessage({ code, message: "internal function signature" }),
      "Analytics is being updated. Please try again shortly.",
    );
  assert.equal(
    analyticsErrorMessage({ code: "42501", message: "Permission denied" }),
    "Permission denied",
  );
  assert.equal(
    analyticsErrorMessage({ message: "Network connection failed" }),
    "Network connection failed",
  );
  assert.equal(analyticsErrorMessage({}), "Unable to load analytics.");
});

test("probe deadlines abort an unresponsive transport and do not leave readiness pending", async (t) => {
  const { checkAnalyticsRelease } = await release();
  const originalTimeout = AbortSignal.timeout.bind(AbortSignal);
  t.mock.method(AbortSignal, "timeout", (delay) => {
    assert.equal(delay, 10000);
    return originalTimeout(15);
  });
  const result = await checkAnalyticsRelease(
    config,
    async (_url, options) =>
      new Promise((_resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Abort did not arrive")), 1000);
        options.signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(options.signal.reason);
          },
          { once: true },
        );
      }),
  );
  assert.equal(result.ready, false);
  assert.ok(result.checks.every((c) => c.status === "unavailable"));
});

test("browser defaults must resolve exactly and release command runs preflight before Wrangler", async () => {
  const { publicSupabaseDefaults } = await release();
  const source = await readFile(
    new URL("../src/integrations/supabase/client.ts", import.meta.url),
    "utf8",
  );
  const defaults = publicSupabaseDefaults(source);
  assert.equal(defaults.url, new URL(defaults.url).origin);
  assert.ok(defaults.key.startsWith("sb_publishable_"));
  assert.throws(() => publicSupabaseDefaults('const unexpected = "configuration changed";'));
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(
    manifest.scripts["check:analytics-release"],
    "node scripts/check-analytics-release.mjs",
  );
  assert.equal(
    manifest.scripts["deploy:cloudflare"],
    "bun run check:analytics-release && wrangler deploy",
  );
});

test("release CLI exits nonzero on missing schema and never logs credentials or raw errors", async () => {
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { pathToFileURL, fileURLToPath } = await import("node:url");
  const { spawnSync } = await import("node:child_process");
  const dir = await mkdtemp(join(tmpdir(), "spacecall-release-"));
  try {
    const preload = join(dir, "fetch-fixture.mjs");
    await writeFile(
      preload,
      `globalThis.fetch=async(url)=>{const rpc=new URL(url).pathname.split('/').at(-1);return new Response(JSON.stringify(process.env.TEST_RELEASE_RESPONSE==='ready'?{code:'42501',message:'permission denied for function '+rpc}:{code:'PGRST202',message:'raw private database error'}),{status:process.env.TEST_RELEASE_RESPONSE==='ready'?401:404});};`,
    );
    const cli = fileURLToPath(new URL("../scripts/check-analytics-release.mjs", import.meta.url));
    for (const scenario of ["ready", "missing"]) {
      const child = spawnSync(process.execPath, ["--import", pathToFileURL(preload).href, cli], {
        encoding: "utf8",
        env: {
          ...process.env,
          TEST_RELEASE_RESPONSE: scenario,
          VITE_SUPABASE_URL: config.url,
          VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_never-print-this",
        },
        timeout: 5000,
      });
      assert.equal(child.error, undefined);
      assert.equal(child.status, scenario === "ready" ? 0 : 1);
      const output = child.stdout + child.stderr;
      assert.ok(
        output.includes(scenario === "ready" ? "anonymous execution is denied" : "missing-schema"),
      );
      assert.ok(!output.includes("sb_publishable_never-print-this"));
      assert.ok(!output.includes("raw private database error"));
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
