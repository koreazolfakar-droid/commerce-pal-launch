import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Shopify dashboard analytics stays explicitly read-only and feature gated", async () => {
  const source = await read("src/dashboard/services/shopifyAdminRead.server.ts");

  assert.match(source, /SHOPIFY_ADMIN_READS_ENABLED/);
  assert.match(source, /X-Shopify-Access-Token/);
  assert.match(source, /shopifyqlQuery/);
  assert.doesNotMatch(source, /\bmutation\b/i);
  assert.doesNotMatch(source, /\.(?:insert|update|delete|upsert)\s*\(/i);
  assert.doesNotMatch(source, /inventoryAdjust|productCreate|productUpdate|orderCreate/i);
});

test("ShopifyQL percentage ratios are normalized for dashboard display", async () => {
  const source = await read("src/dashboard/services/shopifyAdminRead.server.ts");

  assert.match(source, /function percentageValue/);
  assert.match(source, /parsed \* 100/);
  assert.match(source, /returningCustomerRate: percentageValue/);
  assert.match(source, /conversionRate: percentageValue/);
});

test("Shopify Admin credential names stay out of browser-shipped dashboard files", async () => {
  const [route, functions] = await Promise.all([
    read("src/routes/dashboard.analytics.tsx"),
    read("src/dashboard/services/shopifyAnalytics.functions.ts"),
  ]);

  const browserSource = `${route}\n${functions}`;
  assert.doesNotMatch(browserSource, /SHOPIFY_ADMIN_(?:API_TOKEN|ACCESS_TOKEN|CLIENT_SECRET)/);
  assert.match(functions, /requireDashboardStaff/);
  assert.match(functions, /import\("@\/dashboard\/services\/shopifyAdminRead\.server"\)/);
});

test("live analytics page has a controlled disabled state and no write controls", async () => {
  const route = await read("src/routes/dashboard.analytics.tsx");

  assert.match(route, /getShopifyAdminAnalytics/);
  assert.match(route, /status === "ready"/);
  assert.match(route, /read-only/i);
  assert.doesNotMatch(route, /Save product|Adjust inventory|Create order/i);
});

test("dashboard Shopify reads verify an authenticated staff role server-side", async () => {
  const source = await read("src/dashboard/services/dashboardStaffAuth.server.ts");

  assert.match(source, /auth\.getClaims/);
  assert.match(source, /from\("user_roles"\)/);
  assert.match(source, /role === "admin" \|\| row\.role === "editor"/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
});
