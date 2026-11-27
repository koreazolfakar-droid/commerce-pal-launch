import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../supabase/functions/_shared/trustedHeroSource.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const exports = {};
vm.runInNewContext(output, {
  exports, URL, Blob, Response, Request, Headers, ReadableStream,
  AbortController, Uint8Array, String, setTimeout, clearTimeout,
  fetch: () => { throw new Error("live network access forbidden in tests"); },
}, { timeout: 5000 });

const { validateHeroSourceUrl, fetchTrustedHeroImage, MAX_HERO_SOURCE_BYTES } = exports;
const origin = "https://rtwyankpxtffqqrasyzw.supabase.co";
const trusted = origin + "/storage/v1/object/public/cms-media/hero/2026-11-18/banner.webp";
const webp = Uint8Array.from([
  82, 73, 70, 70, 20, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 32, 0, 0, 0, 0,
]);

test("allow only exact HTTPS public CMS storage object URLs", () => {
  assert.equal(validateHeroSourceUrl(trusted, origin).toString(), trusted);
  const forbidden = [
    "http://169.254.169.254/latest/meta-data/",
    "https://127.0.0.1/admin",
    "https://localhost/",
    "https://[::1]/",
    "https://metadata.google.internal/computeMetadata/v1/",
    origin + ".attacker.test/storage/v1/object/public/cms-media/pic.webp",
    "https://attacker.test/storage/v1/object/public/cms-media/pic.webp",
    origin + "/auth/v1/settings",
    origin + "/rest/v1/private",
    origin + "/storage/v1/object/sign/cms-media/hero/private.webp",
    origin + "/storage/v1/object/public/cms-media/",
    origin + "/storage/v1/object/public/cms-media/a%2Fb.webp",
    origin + "/storage/v1/object/public/cms-media/hero/x.webp?download=1",
    origin + "/storage/v1/object/public/cms-media/hero/x.webp#fragment",
    "https://user:pass@rtwyankpxtffqqrasyzw.supabase.co/storage/v1/object/public/cms-media/x.webp",
  ];
  for (const value of forbidden) {
    assert.throws(() => validateHeroSourceUrl(value, origin),
      /hero_source_not_trusted_storage|hero_source_url_invalid/, value);
  }
});

test("public bucket URL cannot redirect to private or attacker endpoints", async () => {
  let calls = 0;
  await assert.rejects(fetchTrustedHeroImage(trusted, origin, async (_url, options) => {
    calls++;
    assert.equal(options.redirect, "manual");
    return new Response(null, {
      status: 302,
      headers: { location: "http://169.254.169.254/latest/meta-data/" },
    });
  }), /hero_source_redirect_rejected/);
  assert.equal(calls, 1);
});

test("unsafe source URL is rejected before any network call", async () => {
  let calls = 0;
  await assert.rejects(fetchTrustedHeroImage("https://evil.test/file.webp", origin, async () => {
    calls++;
    throw new Error("should not fetch");
  }), /hero_source_not_trusted_storage/);
  assert.equal(calls, 0);
});

test("blocks SVG, HTML, and image impostors with forged content type", async () => {
  for (const [content, type, error] of [
    ['<svg xmlns="http://www.w3.org/2000/svg"><script>bad()</script></svg>', "image/svg+xml", /hero_source_unsafe_image_type/],
    ["<html>unsafe</html>", "image/webp", /hero_source_bad_signature/],
    ["not jpeg", "image/jpeg", /hero_source_bad_signature/],
    ["", "image/webp", /hero_source_empty/],
  ]) {
    await assert.rejects(fetchTrustedHeroImage(trusted, origin, async () =>
      new Response(content, { status: 200, headers: { "content-type": type } })), error);
  }
});

test("rejects suspicious declared Content-Length without reading response", async () => {
  const response = new Response(webp, {
    status: 200,
    headers: { "content-type": "image/webp",
      "content-length": String(MAX_HERO_SOURCE_BYTES + 1) },
  });
  await assert.rejects(fetchTrustedHeroImage(trusted, origin, async () => response), /hero_source_too_large/);
});

test("false Content-Length cannot bypass streamed 12 MiB limit; active stream is cancelled", { timeout: 4000 }, async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_HERO_SOURCE_BYTES + 1));
      // Leave the stream open to prove that we refuse without awaiting EOF.
    },
    cancel() { cancelled = true; },
  });
  const response = new Response(stream, {
    status: 200,
    headers: { "content-type": "image/webp", "content-length": "1" },
  });
  await assert.rejects(fetchTrustedHeroImage(trusted, origin, async () => response), /hero_source_too_large/);
  assert.equal(cancelled, true);
});

test("accepts a genuine raster response and retains its byte count and MIME type", async () => {
  const response = new Response(webp, { status: 200, headers: { "content-type": "image/webp" } });
  const result = await fetchTrustedHeroImage(trusted, origin, async () => response);
  assert.equal(result.type, "image/webp");
  assert.equal(result.blob.size, webp.length);
  assert.equal(result.blob.type, "image/webp");
});

test("first-party source validation does not allow HTTPS downgrade", () => {
  assert.throws(() => validateHeroSourceUrl(trusted.replace("https:", "http:"), origin), /not_trusted_storage/);
});
