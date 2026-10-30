import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.CLOUDFLARE_STAGING_SMOKE_ORIGIN ?? "http://127.0.0.1:4173";
const notFoundPath = "/__spacecall_workers_staging_smoke_404__";

async function withRetries(path, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return await fetch(new URL(path, base), { redirect: "manual", signal: AbortSignal.timeout(4000) });
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }
  throw new Error(`Cloudflare preview did not start: ${String(lastError)}`);
}

test("Cloudflare Worker serves a real SSR 404 through the hardened server entry", async () => {
  const response = await withRetries(notFoundPath);
  const html = await response.text();
  assert.equal(response.status, 404, `Unexpected SSR status: ${response.status}; ${html.slice(0, 240)}`);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'self'/);
  assert.match(html, /<html\b/i);
  assert.match(html, /404/);
});

test("Cloudflare preview serves original Space Call artwork as an asset", async () => {
  const response = await withRetries("/logo.svg");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /image\/svg\+xml/i);
  assert.match(await response.text(), /<svg\b/);
});
