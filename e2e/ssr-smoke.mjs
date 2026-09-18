import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Run after `bun run build`. Calls the actual production SSR entry with no external commerce-platform credentials.
const { default: handler } = await import("../.output/server/index.mjs");
const pending = [];
const context = { waitUntil: (promise) => pending.push(promise), passThroughOnException() {} };
const env = {};

const originalConsoleError = console.error;
const ssrSerializationErrors = [];
let activeSsrPath = "<idle>";
console.error = (...args) => {
  const message = args
    .map((value) => (value instanceof Error ? `${value.name}: ${value.message}` : String(value)))
    .join(" ");
  if (/Serialization error|Seroval Error/i.test(message)) {
    ssrSerializationErrors.push(`[${activeSsrPath}] ${message}`);
  }
  originalConsoleError(...args);
};

async function request(path) {
  activeSsrPath = path;
  let url = new URL(path, "https://spacecallapp.store");
  let response;
  for (let hop = 0; hop < 4; hop++) {
    activeSsrPath = `${url.pathname}${url.search}`;
    response = await handler.fetch(new Request(url), env, context);
    activeSsrPath = "<idle>";
    if (![301, 302, 307, 308].includes(response.status)) break;
    const location = response.headers.get("location");
    assert.ok(location, "Redirect must include a destination");
    url = new URL(location, url);
    assert.equal(
      url.origin,
      "https://spacecallapp.store",
      "SSR tests only follow internal redirects",
    );
  }
  const body = await response.text();
  assert.equal(response.status, 200, `${path} must render successfully`);
  activeSsrPath = "idle";
  return { response, body };
}

const home = await request("/");
assert.equal((home.body.match(/<h1\b/g) ?? []).length, 1, "Homepage keeps exactly one H1");
for (const testId of ["homepage-promo-ticker", "home-hero", "trust-benefits-rail"]) {
  assert.equal(
    (home.body.match(new RegExp(`data-testid="${testId}"`, "g")) ?? []).length,
    1,
    `${testId} renders exactly once during SSR`,
  );
}

const orderedSections = ["homepage-promo-ticker", "home-hero", "trust-benefits-rail"];
for (let i = 1; i < orderedSections.length; i++) {
  assert.ok(
    home.body.indexOf(`data-testid="${orderedSections[i - 1]}"`) <
      home.body.indexOf(`data-testid="${orderedSections[i]}"`),
    `Homepage SSR section order: ${orderedSections[i]}`,
  );
}

// Catalog-backed sections intentionally resolve after hydration so initial SSR stays lean.
for (const delayedTestId of [
  "category-section",
  "top-brands",
  "best-sellers",
  "new-items",
  "brand-showcases",
  "deals-section",
]) {
  assert.ok(
    !home.body.includes(`data-testid="${delayedTestId}"`),
    `${delayedTestId} remains hydration-delayed`,
  );
}

// The staging hero is backed by the local provider-neutral catalog, not an external commerce-platform call.
assert.match(home.body, /data-hero-handle="homepage-hero"/);
assert.doesNotMatch(home.body, /href="\/collections\/homepage-hero"/);
assert.match(home.body, /iPhone 18 Pro|Homepage Hero/);

for (const [name, value] of Object.entries({
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(self), payment=()",
})) {
  assert.equal(home.response.headers.get(name), value);
}
assert.match(home.response.headers.get("content-security-policy") ?? "", /default-src 'self'/);
assert.equal(
  home.response.headers.get("strict-transport-security"),
  "max-age=31536000; includeSubDomains",
);

const help = await request("/help");
assert.match(help.body, /Help &amp; Support/);
assert.match(help.body, /href="https:\/\/wa.me\//);
assert.match(help.body, /rel="canonical" href="https:\/\/spacecallapp.store\/help"/);

const privacy = await request("/privacy");
assert.equal((privacy.body.match(/<h1\b/g) ?? []).length, 1);
assert.match(privacy.body, /published soon/);
assert.ok(!privacy.body.includes('href="javascript:'));
assert.ok(!privacy.body.includes('onclick="'));

const product = await request("/product/iphone-18-pro");
assert.equal((product.body.match(/<h1\b/g) ?? []).length, 1);
assert.match(product.body, /iPhone 18 Pro/);
assert.match(product.body, /Add to cart/);
assert.match(product.body, /Share product/);

const collection = await request("/collections/iphone");
assert.equal((collection.body.match(/<h1\b/g) ?? []).length, 1);
assert.match(collection.body, /\/product\/iphone-18-pro/);

const brand = await request("/brand/apple");
assert.equal((brand.body.match(/<h1\b/g) ?? []).length, 1);
assert.match(brand.body, /\/product\/iphone-18-pro/);

const shop = await request("/shop?brand=apple");
assert.equal((shop.body.match(/<h1\b/g) ?? []).length, 1);
assert.match(shop.body, /\/product\/iphone-18-pro/);

const used = await request("/used-phones");
assert.equal((used.body.match(/<h1\b/g) ?? []).length, 1, "Used phones retains its page heading");

const sitemap = await request("/sitemap.xml");
assert.match(sitemap.body, /https:\/\/spacecallapp.store\/help/);
assert.match(sitemap.body, /https:\/\/spacecallapp.store\/product\/iphone-18-pro/);
assert.equal(
  sitemap.response.headers.get("x-frame-options"),
  "SAMEORIGIN",
  "Global security headers remain present on sitemap responses",
);

const robots = await readFile(new URL("../public/robots.txt", import.meta.url), "utf8");
assert.ok(!/^Disallow:\s*\/$/m.test(robots));
await Promise.allSettled(pending);

console.error = originalConsoleError;
assert.deepEqual(
  ssrSerializationErrors,
  [],
  `SSR emitted serialization errors:\n${ssrSerializationErrors.join("\n")}`,
);

console.log(
  JSON.stringify({
    passed: true,
    provider: "local-staging",
    paths: [
      "/",
      "/help",
      "/privacy",
      "/product/iphone-18-pro",
      "/collections/iphone",
      "/brand/apple",
      "/shop?brand=apple",
      "/used-phones",
      "/sitemap.xml",
    ],
  }),
);

// Nitro owns background handles; all assertions and waitUntil work finished above.
process.exit(0);
