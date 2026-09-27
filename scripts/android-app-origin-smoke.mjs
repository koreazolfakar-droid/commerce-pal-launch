import assert from "node:assert/strict";

const { default: handler } = await import("../.output/server/index.mjs");
const pending = [];
const context = { waitUntil: (promise) => pending.push(promise), passThroughOnException() {} };
const fetchOrigin = (url) => handler.fetch(new Request(url), {}, context);

const publicHome = await fetchOrigin("https://www.spacecallapp.store/");
assert.equal(publicHome.status, 200);
assert.equal(publicHome.headers.get("x-robots-tag"), null);

const appHome = await fetchOrigin("https://app.spacecallapp.store/");
assert.equal(appHome.status, 200);
assert.equal(appHome.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
assert.equal(appHome.headers.get("link"), '<https://www.spacecallapp.store/>; rel="canonical"');
assert.match(await appHome.text(), /https:\/\/www\.spacecallapp\.store/);

const robots = await fetchOrigin("https://app.spacecallapp.store/robots.txt");
assert.equal(robots.status, 200);
assert.match(await robots.text(), /^User-agent: \*\nDisallow: \/$/m);

const dashboard = await fetchOrigin("https://app.spacecallapp.store/dashboard/orders?view=open");
assert.equal(dashboard.status, 308);
assert.equal(dashboard.headers.get("location"), "https://www.spacecallapp.store/dashboard/orders?view=open");

const assetLinks = await fetchOrigin("https://app.spacecallapp.store/.well-known/assetlinks.json");
assert.equal(assetLinks.status, 200);
assert.deepEqual(await assetLinks.json(), []);

await Promise.allSettled(pending);
console.log("Android app origin SSR isolation passed.");
process.exit(0);
