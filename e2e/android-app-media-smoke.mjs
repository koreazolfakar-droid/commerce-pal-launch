import assert from "node:assert/strict";

// Run after the production web build; exercise the actual SSR worker route.
const { default: handler } = await import("../.output/server/index.mjs");
const context = { waitUntil() {}, passThroughOnException() {} };
const mediaPath = "/android-media/storage/v1/object/public/cms-media/hero/2026-09-25/0c341bc7-20db-46be-b5c8-2350b9d82460.webp";

async function fetchApp(path, init) {
  return handler.fetch(new Request(`https://app.spacecallapp.store${path}`, init), {}, context);
}

const hero = await fetchApp(mediaPath);
assert.equal(hero.status, 200);
assert.equal(hero.headers.get("content-type"), "image/webp");
assert.equal(hero.headers.has("set-cookie"), false);
assert.equal(hero.headers.get("x-space-call-cache-safe"), "1");
assert.ok((await hero.arrayBuffer()).byteLength > 0);

const unknownBucket = await fetchApp(mediaPath.replace("/cms-media/", "/other/"));
assert.equal(unknownBucket.status, 404);
const credentialed = await fetchApp(mediaPath, { headers: { cookie: "session=test" } });
assert.equal(credentialed.status, 403);
const authenticated = await fetchApp(mediaPath, { headers: { authorization: "Bearer test" } });
assert.equal(authenticated.status, 403);
const dashboard = await fetchApp("/dashboard");
assert.equal(dashboard.status, 308);
assert.equal(dashboard.headers.get("location"), "https://www.spacecallapp.store/dashboard");

console.log("Android app media SSR smoke passed.");
