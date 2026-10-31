import assert from "node:assert/strict";
import test from "node:test";

// This suite is deliberately confined to a local workerd preview. It makes
// GET requests only: no login, RPC mutation, orders, stock or customer writes.
const base = new URL(process.env.CLOUDFLARE_STAGING_SMOKE_ORIGIN ?? "http://127.0.0.1:4173");
assert.ok(
  base.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(base.hostname),
  "Cloudflare runtime smoke must target a local preview, never production",
);
const notFoundPath = "/__spacecall_workers_staging_smoke_404__";

async function request(path) {
  let url = new URL(path, base);
  assert.equal(url.origin, base.origin, "Smoke requests must stay on the local preview");
  const deadline = Date.now() + 45000;
  for (let hop = 0; hop < 4; hop++) {
    let response;
    for (;;) {
      try {
        response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15000) });
        break;
      } catch (error) {
        if (Date.now() >= deadline) throw error;
        await new Promise((resolve) => setTimeout(resolve, 750));
      }
    }
    if (![301, 302, 307, 308].includes(response.status)) {
      return { response, body: await response.text() };
    }
    const location = response.headers.get("location");
    assert.ok(location, "Redirect must include a location");
    await response.body?.cancel();
    url = new URL(location, url);
    assert.equal(url.origin, base.origin, "Never follow a redirect to the live store");
  }
  assert.fail("Too many local redirects");
}

function assertDocument(result, status = 200) {
  const { response, body } = result;
  assert.equal(response.status, status, "Unexpected SSR status");
  assert.match(response.headers.get("content-type") ?? "", /text\/html/i);
  assert.match(body, /<html\b/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'self'/);
}

function assertNoStore(response) {
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
}

test("unknown routes remain real SSR 404s through the hardened Worker", { timeout: 60000 }, async () => {
  const result = await request(notFoundPath);
  assertDocument(result, 404);
  assert.match(result.body, /404/);
});

test("homepage renders content with unique CSP nonces and uncached HTML", { timeout: 120000 }, async () => {
  const first = await request("/");
  assertDocument(first);
  assertNoStore(first.response);
  assert.match(first.body, /data-testid="home-hero"/);
  assert.equal((first.body.match(/<h1\b/g) ?? []).length, 1);
  const nonce = (first.response.headers.get("content-security-policy") ?? "")
    .match(/script-src[^;]*'nonce-([a-f0-9]{32})'/)?.[1];
  assert.ok(nonce, "SSR must generate a CSP nonce");
  const second = await request("/");
  assertDocument(second);
  const secondNonce = (second.response.headers.get("content-security-policy") ?? "")
    .match(/script-src[^;]*'nonce-([a-f0-9]{32})'/)?.[1];
  assert.ok(secondNonce);
  assert.notEqual(nonce, secondNonce, "CSP nonces must change between requests");
});

test("shop renders the catalog and a linked product with Product SEO data", { timeout: 120000 }, async () => {
  const shop = await request("/shop");
  assertDocument(shop);
  assertNoStore(shop.response);
  assert.match(shop.body, /Shop all products/);
  const productPath = shop.body.match(/href="(\/product\/[^"?#]+)"/)?.[1];
  assert.ok(productPath, "The SSR catalog must contain a product link; an empty fallback is not success");
  const product = await request(productPath);
  assertDocument(product);
  assertNoStore(product.response);
  assert.match(product.body, /data-testid="product-detail-canvas"/);
  assert.match(product.body, /"@type"\s*:\s*"Product"/);
  assert.equal((product.body.match(/<h1\b/g) ?? []).length, 1);
});

test("Dashboard entry and a direct nested route render uncached noindex shells", { timeout: 120000 }, async () => {
  // This verifies routing and the anonymous shell, not an authenticated session.
  for (const path of ["/dashboard", "/dashboard/products"]) {
    const result = await request(path);
    assertDocument(result);
    assertNoStore(result.response);
    assert.match(result.body, /Space Call.*Admin Dashboard/);
    assert.match(result.body, /noindex, nofollow/);
  }
});

test("the homepage's actual JS and CSS assets are served with immutable caching", { timeout: 120000 }, async () => {
  const home = await request("/");
  assertDocument(home);
  for (const [extension, contentType] of [
    ["js", /(?:java|ecma)script/i],
    ["css", /text\/css/i],
  ]) {
    const paths = [...home.body.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
    const path = paths.find((value) => new URL(value, base).pathname.endsWith(`.${extension}`));
    assert.ok(path, `SSR must reference a real ${extension} asset`);
    const result = await request(path);
    assert.equal(result.response.status, 200);
    assert.match(result.response.headers.get("content-type") ?? "", contentType);
    assert.match(result.response.headers.get("cache-control") ?? "", /immutable/);
    assert.ok(result.body.length > 0);
  }
});

test("original Space Call artwork is served as an SVG asset", { timeout: 60000 }, async () => {
  const { response, body } = await request("/logo.svg");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /image\/svg\+xml/i);
  assert.match(body, /<svg\b/);
});
