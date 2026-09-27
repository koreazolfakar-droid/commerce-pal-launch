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
assert.equal(
  dashboard.headers.get("location"),
  "https://www.spacecallapp.store/dashboard/orders?view=open",
);

for (const path of ["/admin", "/admin/orders?view=open"]) {
  const admin = await fetchOrigin(`https://app.spacecallapp.store${path}`);
  assert.equal(admin.status, 308);
  assert.equal(admin.headers.get("location"), `https://www.spacecallapp.store${path}`);
  assert.equal(admin.headers.get("cache-control"), "no-store");
}

const assetLinks = await fetchOrigin("https://app.spacecallapp.store/.well-known/assetlinks.json");
assert.equal(assetLinks.status, 200);
assert.equal(assetLinks.headers.get("content-type"), "application/json; charset=utf-8");
assert.deepEqual(await assetLinks.json(), [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "store.spacecallapp.app",
      sha256_cert_fingerprints: [
        "2C:E4:68:6F:BE:A8:83:70:69:A4:A8:C6:24:A2:2C:7B:1A:FE:DB:71:BA:C0:4B:A2:CA:E7:87:09:CA:AB:08:5F",
      ],
    },
  },
]);

await Promise.allSettled(pending);
console.log("Android app origin SSR isolation passed.");
process.exit(0);
