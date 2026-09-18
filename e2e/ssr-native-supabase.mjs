import assert from "node:assert/strict";

// Run after a production build compiled with VITE_STOREFRONT_DATA_SOURCE=supabase.
// This is deliberately catalog-content agnostic: the native catalog can be empty today
// and populated tomorrow without making the smoke test brittle.
const { default: handler } = await import("../.output/server/index.mjs");

const pending = [];
const context = {
  waitUntil: (promise) => pending.push(promise),
  passThroughOnException() {},
};
const env = {};

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
      "Native SSR smoke only follows internal redirects",
    );
  }

  const body = await response.text();
  assert.equal(response.status, 200, `${path} must render successfully in Supabase-only mode`);
  return { response, body };
}

const paths = ["/", "/shop", "/used-phones", "/sitemap.xml"];

for (const path of paths) {
  const { response } = await request(path);
  assert.match(
    response.headers.get("content-security-policy") ?? "",
    /default-src 'self'/,
    `${path} keeps global CSP in Supabase-only mode`,
  );
}

await Promise.allSettled(pending);

console.log(
  JSON.stringify({
    passed: true,
    provider: "supabase-explicit",
    paths,
  }),
);

process.exit(0);
