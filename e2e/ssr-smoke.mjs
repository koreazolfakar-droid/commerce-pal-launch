import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Run after `bun run build`. The production SSR entry reads the public,
 // read-only Space Call Supabase storefront.
const { default: handler } = await import("../.output/server/index.mjs");
const pending = [];
const context = { waitUntil: (promise) => pending.push(promise), passThroughOnException() {} };

async function request(path) {
  let url = new URL(path, "https://spacecallapp.store");
  let response;
  for (let hop = 0; hop < 4; hop++) {
    response = await handler.fetch(new Request(url), {}, context);
    if (![301, 302, 307, 308].includes(response.status)) break;
    const location = response.headers.get("location");
    assert.ok(location, "Redirect must include a destination");
    url = new URL(location, url);
    assert.equal(url.origin, "https://spacecallapp.store", "SSR tests only follow internal redirects");
  }
  const body = await response.text();
  assert.equal(response.status, 200, `${path} must render successfully`);
  return { response, body };
}

const home = await request("/");
assert.equal((home.body.match(/<h1\b/g) ?? []).length, 1, "Homepage keeps exactly one H1");
assert.match(home.body, /data-testid="home-hero"/);

for (const [name, value] of Object.entries({
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(self), payment=(), display-capture=()",
})) {
  assert.equal(home.response.headers.get(name), value);
}
const csp = home.response.headers.get("content-security-policy") ?? "";
assert.match(csp, /default-src 'self'/);
assert.doesNotMatch(csp, /connect-src[^;]*myshopify|form-action[^;]*myshopify|frame-src[^;]*myshopify|checkout\.shopify\.com/);
const nonce = csp.match(/script-src[^;]*'nonce-([a-f0-9]{32})'/)?.[1];
assert.ok(nonce, "SSR CSP includes a request nonce");

const second = await request("/");
const secondNonce = (second.response.headers.get("content-security-policy") ?? "")
  .match(/script-src[^;]*'nonce-([a-f0-9]{32})'/)?.[1];
assert.ok(secondNonce);
assert.notEqual(secondNonce, nonce, "Each SSR request gets a unique CSP nonce");

const help = await request("/help");
assert.match(help.body, /Help &amp; Support/);
assert.match(help.body, /href="https:\/\/wa\.me\//);
assert.doesNotMatch(help.body, /myshopify\.com|SHOPIFY_ACCOUNT_URL|secure Shopify account page/);

const privacy = await request("/privacy");
assert.equal((privacy.body.match(/<h1\b/g) ?? []).length, 1);

const shop = await request("/shop");
assert.equal((shop.body.match(/<h1\b/g) ?? []).length, 1);

const sitemap = await request("/sitemap.xml");
assert.match(sitemap.body, /https:\/\/spacecallapp\.store\//);
assert.equal(sitemap.response.headers.get("x-frame-options"), "SAMEORIGIN");

const robots = await readFile(new URL("../public/robots.txt", import.meta.url), "utf8");
assert.ok(!/^Disallow:\s*\/$/m.test(robots));

await Promise.allSettled(pending);
console.log(JSON.stringify({ passed: true, source: "supabase-native", paths: ["/", "/help", "/privacy", "/sitemap.xml"] }));
process.exit(0);
