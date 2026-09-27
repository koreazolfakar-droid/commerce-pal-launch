import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { APP_ORIGIN, CACHE_CONFIG, classifyCacheRequest } from "../public/android-app-cache-policy.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const request = (url, init = {}) => new Request(url, init);

test("cache policy uses narrow public allowlists", () => {
  assert.equal(classifyCacheRequest(request(`${APP_ORIGIN}/assets/app.DJ6yL4YH.js`)), "static");
  assert.equal(classifyCacheRequest(request(`${APP_ORIGIN}/brand-logos/apple.webp`)), "images");
  assert.equal(classifyCacheRequest(request("https://rtwyankpxtffqqrasyzw.supabase.co/functions/v1/public-cms")), "catalog");
  assert.equal(classifyCacheRequest(request("https://rtwyankpxtffqqrasyzw.supabase.co/storage/v1/object/public/cms-media/variants/p/v.webp?v=2")), "images");
  assert.equal(classifyCacheRequest(request("https://rtwyankpxtffqqrasyzw.supabase.co/storage/v1/object/public/cms-media/products/p/550e8400-e29b-41d4-a716-446655440000.webp")), "images");
  assert.ok(CACHE_CONFIG.images.maxEntries <= 120);
  assert.ok(CACHE_CONFIG.images.maxAgeSeconds <= 7 * 86400);
});

test("cache policy rejects private, credentialed, mutating and foreign traffic", () => {
  for (const path of ["/dashboard", "/auth/login", "/checkout", "/cart", "/my-orders", "/profile", "/addresses", "/payments", "/api/private"]) {
    assert.equal(classifyCacheRequest(request(`${APP_ORIGIN}${path}`)), null, path);
  }
  assert.equal(classifyCacheRequest(request(`${APP_ORIGIN}/brand-logos/a.webp`, { method: "POST" })), null);
  assert.equal(classifyCacheRequest(request(`${APP_ORIGIN}/brand-logos/a.webp?token=secret`)), null);
  assert.equal(classifyCacheRequest(request(`${APP_ORIGIN}/brand-logos/a.webp`, { headers: { authorization: "Bearer secret" } })), null);
  assert.equal(classifyCacheRequest(request("https://evil.example/assets/app.0123456789.js")), null);
  assert.equal(classifyCacheRequest(request("https://rtwyankpxtffqqrasyzw.supabase.co/rest/v1/customer_orders")), null);
  assert.equal(classifyCacheRequest(request("https://rtwyankpxtffqqrasyzw.supabase.co/storage/v1/object/public/cms-media/variants/p/v.webp")), null);
});

test("service worker registration and backend origins remain isolated", async () => {
  const [root, worker, policy, createOrder, customerOrders, publicCms, dashboardAuth, config] = await Promise.all([
    read("src/routes/__root.tsx"), read("public/android-app-sw.js"),
    read("public/android-app-cache-policy.js"),
    read("supabase/functions/create-order/index.ts"), read("supabase/functions/customer-orders/index.ts"),
    read("supabase/functions/public-cms/index.ts"), read("supabase/functions/dashboard-auth-throttle/index.ts"),
    read("supabase/config.toml"),
  ]);
  assert.match(root, /window\.location\.origin !== "https:\/\/app\.spacecallapp\.store"/);
  assert.match(root, /type: "module"/);
  assert.match(worker, /credentials: "omit"/);
  assert.match(policy, /response\.headers\.has\("set-cookie"\)/);
  for (const source of [createOrder, customerOrders, publicCms]) assert.match(source, /https:\/\/app\.spacecallapp\.store/);
  assert.doesNotMatch(publicCms, /"Access-Control-Allow-Origin": "\*"/);
  assert.doesNotMatch(dashboardAuth, /https:\/\/app\.spacecallapp\.store/);
  assert.doesNotMatch(config, /https:\/\/app\.spacecallapp\.store/);
  for (const source of [root, worker, policy, createOrder, customerOrders, publicCms, dashboardAuth, config]) {
    assert.doesNotMatch(source, /Domain=\.spacecallapp\.store|\*\.spacecallapp\.store/);
  }
});

test("app host is noindex, canonicalized, and dashboard-isolated", async () => {
  const server = await read("src/server.ts");
  assert.match(server, /X-Robots-Tag", "noindex, nofollow, noarchive"/);
  assert.match(server, /url\.pathname\.startsWith\("\/dashboard\/"\)/);
  assert.match(server, /const PUBLIC_ORIGIN = "https:\/\/www\.spacecallapp\.store"/);
  assert.match(server, /Disallow: \/\\n/);
  assert.match(server, /rel="canonical"/);
});
