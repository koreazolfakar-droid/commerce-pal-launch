import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fixtureRequests } from "./shopify-fixture.mjs";

// Run after `bun run build`. Calls the actual production SSR entry with isolated Shopify fixtures.
const { default: handler } = await import("../.output/server/index.mjs");
const pending = [];
const context = { waitUntil: (promise) => pending.push(promise), passThroughOnException() {} };
const env = { SHOPIFY_STOREFRONT_TOKEN: "space-cell-local-fixture-only" };

async function request(path) {
  let url = new URL(path, "https://spacecallapp.store");
  let response;
  for (let hop = 0; hop < 4; hop++) {
    response = await handler.fetch(new Request(url), env, context);
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
  return { response, body };
}

const home = await request("/");
assert.equal((home.body.match(/<h1\b/g) ?? []).length, 1, "Homepage keeps exactly one H1");
for (const testId of [
  "homepage-promo-ticker",
  "home-hero",
  "trust-benefits-rail",
  "category-section",
  "top-brands",
]) {
  assert.equal(
    (home.body.match(new RegExp(`data-testid="${testId}"`, "g")) ?? []).length,
    1,
    `${testId} renders exactly once during SSR`,
  );
}

const orderedSections = [
  "homepage-promo-ticker",
  "home-hero",
  "trust-benefits-rail",
  "category-section",
  "top-brands",
];
for (let i = 1; i < orderedSections.length; i++) {
  assert.ok(
    home.body.indexOf(`data-testid="${orderedSections[i - 1]}"`) <
      home.body.indexOf(`data-testid="${orderedSections[i]}"`),
    `Homepage SSR section order: ${orderedSections[i]}`,
  );
}

// Product-heavy rails are intentionally enabled after hydration so initial SSR stays lean.
for (const delayedTestId of ["best-sellers", "new-items", "brand-showcases", "deals-section"]) {
  assert.ok(
    !home.body.includes(`data-testid="${delayedTestId}"`),
    `${delayedTestId} remains hydration-delayed`,
  );
}

if (process.env.SPACE_CELL_FIXTURE_FALLBACK !== "1") {
  assert.match(home.body, /data-hero-source="shopify-collection"/);
  assert.match(home.body, /data-hero-handle="homepage-hero"/);
  assert.match(home.body, /href="\/collections\/homepage-hero"/);
  assert.match(home.body, /Merchant artwork homepage-hero/);
} else {
  assert.match(home.body, /data-hero-source="placeholder"/);
}

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
assert.ok(
  fixtureRequests.includes("GetCollection"),
  "Homepage resolves its Shopify hero collection",
);
assert.equal(
  fixtureRequests.filter((name) => name === "ShowcaseCollections").length,
  0,
  "Hydration-delayed showcase metadata is not fetched during initial SSR",
);

const help = await request("/help");
assert.match(help.body, /Help &amp; Support/);
assert.match(help.body, /href="https:\/\/dj6qeq-j9.myshopify.com\/account"/);
assert.match(help.body, /href="https:\/\/wa.me\//);
assert.match(help.body, /rel="canonical" href="https:\/\/spacecallapp.store\/help"/);

const privacy = await request("/privacy");
assert.equal((privacy.body.match(/<h1\b/g) ?? []).length, 1);
if (process.env.SPACE_CELL_FIXTURE_FALLBACK === "1") {
  assert.match(privacy.body, /published soon/);
} else {
  assert.match(privacy.body, /Fixture policy content from Shopify/);
  assert.ok(!privacy.body.includes("window.policyUnsafe"));
  assert.ok(!privacy.body.includes('href="javascript:'));
  assert.ok(!privacy.body.includes('onclick="'));
}

const product = await request("/product/fixture-phone-1");
assert.equal((product.body.match(/<h1\b/g) ?? []).length, 1);
assert.match(product.body, /Add to cart/);
assert.match(product.body, /Share product/);

const used = await request("/used-phones");
assert.equal((used.body.match(/<h1\b/g) ?? []).length, 1, "Used phones retains its page heading");

for (const path of [
  "/category/e-readers",
  "/category/cases",
  "/brand/kobo",
  "/collections/mixed-collection?brand=apple",
  "/shop?category=cases&brand=spigen",
]) {
  const page = await request(path);
  assert.equal((page.body.match(/<h1\b/g) ?? []).length, 1, `${path} has exactly one H1`);
  const cards = [...page.body.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)].map(
    (match) => match[1],
  );
  const expected =
    path.includes("e-readers") || path.includes("kobo")
      ? "fixture-phone-8"
      : path.includes("cases")
        ? "fixture-phone-7"
        : "fixture-phone-2";
  assert.ok(
    cards.some((card) => card.includes(`/product/${expected}`)),
    `${path} contains matching products`,
  );
  assert.ok(
    cards.every((card) => !card.includes("/product/fixture-phone-1")),
    `${path} excludes unrelated Samsung phone`,
  );
}

const sitemap = await request("/sitemap.xml");
assert.match(sitemap.body, /https:\/\/spacecallapp.store\/help/);
assert.equal(
  sitemap.response.headers.get("x-frame-options"),
  "SAMEORIGIN",
  "Global security headers remain present on sitemap responses",
);

const robots = await readFile(new URL("../public/robots.txt", import.meta.url), "utf8");
assert.ok(!/^Disallow:\s*\/$/m.test(robots));
assert.ok(!fixtureRequests.some((name) => name?.startsWith("cart")), "SSR must never mutate carts");
await Promise.allSettled(pending);
console.log(
  JSON.stringify({
    passed: true,
    fallback: process.env.SPACE_CELL_FIXTURE_FALLBACK === "1",
    paths: [
      "/",
      "/help",
      "/privacy",
      "/product/fixture-phone-1",
      "/used-phones",
      "/category/e-readers",
      "/category/cases",
      "/brand/kobo",
      "/collections/mixed-collection?brand=apple",
      "/shop?category=cases&brand=spigen",
      "/sitemap.xml",
    ],
    fixtureRequests: fixtureRequests.length,
  }),
);

// Nitro owns background handles; all assertions and waitUntil work finished above.
process.exit(0);
