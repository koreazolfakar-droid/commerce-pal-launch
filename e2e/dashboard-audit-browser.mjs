// Local browser regression using synthetic authentication and intercepted API responses.
// Start the dev server first; this script never writes to Supabase.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const id = "00000000-0000-4000-8000-000000000001";
const user = {
  id,
  email: "reviewer@example.test",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: {},
  user_metadata: { full_name: "Local Reviewer" },
  factors: [{ id: "factor-id", status: "verified", factor_type: "totp", friendly_name: "Test" }],
};
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: id, aud: "authenticated", role: "authenticated", aal: "aal2", exp: Math.floor(Date.now() / 1000) + 3600, session_id: id })}.local-test-signature`;
await context.addInitScript(
  ({ user, token }) => {
    sessionStorage.setItem(
      "sb-rtwyankpxtffqqrasyzw-auth-token",
      JSON.stringify({
        access_token: token,
        refresh_token: "local-test",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user,
      }),
    );
  },
  { user, token },
);
await context.route("**/*", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ json: user });
  if (url.pathname.includes("/rest/v1/user_roles"))
    return route.fulfill({
      json: {
        user_id: id,
        role: "editor",
        mfa_required: true,
        mfa_enrolled_at: new Date().toISOString(),
      },
    });
  if (url.pathname.includes("/rest/v1/rpc/dashboard_passkey_stepup_ready"))
    return route.fulfill({ json: true });
  if (url.pathname.includes("/rest/v1/rpc/get_dashboard_home_snapshot")) {
    const args = request.postDataJSON();
    return route.fulfill({
      json: {
        periodStart: args.p_start,
        periodEnd: args.p_end,
        recentOrders: [],
        trend: [],
        topProducts: [],
        topBrands: [],
      },
    });
  }
  if (url.pathname.includes("/rest/v1/store_customers")) {
    if (Number(url.searchParams.get("offset") || 0) > 0)
      return route.fulfill({ json: [], headers: { "content-range": "*/1" } });
    const query = url.searchParams.get("or") || "";
    if (query.includes("slow")) await new Promise((resolve) => setTimeout(resolve, 900));
    const name = query.includes("slow")
      ? "Slow Customer"
      : query.includes("fast")
        ? "Fast Customer"
        : "Test Customer";
    const row = {
      id,
      name,
      phone: "12345",
      phone_normalized: "12345",
      email: "test@example.test",
      city: "Beirut",
      tags: [],
      is_vip: false,
      is_blocked: false,
      total_orders: 2,
      total_spent: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      default_address: "",
      internal_notes: "",
    };
    return route.fulfill({
      status: request.method() === "HEAD" ? 200 : 200,
      headers: { "content-range": "0-0/1" },
      json:
        request.method() === "HEAD"
          ? []
          : request.headers()["accept"]?.includes("vnd.pgrst.object")
            ? row
            : [row],
    });
  }
  if (url.pathname.includes("/rest/v1/"))
    return route.fulfill({ json: [], headers: { "content-range": "0-0/0" } });
  if (url.pathname.includes("/auth/v1/") || url.pathname.includes("/functions/v1/"))
    return route.fulfill({ json: {} });
  return route.continue();
});
const page = await context.newPage();
const errors = [];
const requests = [];
page.on("request", (r) => {
  const u = new URL(r.url());
  if (u.pathname.includes("/auth/") || u.pathname.includes("/rest/")) requests.push(u.pathname);
});
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (message) => {
  if (
    message.type() === "error" &&
    /useInsertionEffect|ReferenceError|TypeError|Invalid hook/.test(message.text())
  )
    errors.push(message.text());
});
try {
  const origin = process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173";
  await page.goto(origin + "/dashboard/customers");
  await page.getByRole("heading", { name: "Customers", exact: true }).waitFor({ timeout: 30000 });
  await page.getByText("Test Customer", { exact: true }).waitFor();
  assert.equal(await page.locator(".dashboard-responsive-table").count(), 1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow, false);

  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("dialog", { name: "Navigation" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Users", exact: true }).count(), 0);
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog", { name: "Navigation" }).count(), 0);
  await page.getByRole("button", { name: "AR", exact: true }).click();
  await page.getByRole("heading", { name: "العملاء", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dir), "rtl");

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.getByRole("button", { name: "Add customer", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Add customer" });
  await modal.waitFor();
  await modal.getByLabel("Name", { exact: true }).fill("Unsaved new customer");
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement.closest('[role="dialog"]') !== null),
    true,
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.keyboard.press("Escape");
  assert.equal(await modal.count(), 1);
  assert.equal(
    await modal.getByLabel("Name", { exact: true }).inputValue(),
    "Unsaved new customer",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.keyboard.press("Escape");
  assert.equal(await modal.count(), 0);
  const search = page.getByPlaceholder("Search name, phone, email or city");
  const oldRequest = page.waitForRequest(
    (r) =>
      r.url().includes("store_customers") &&
      new URL(r.url()).searchParams.get("or")?.includes("slow"),
  );
  await search.fill("slow");
  await oldRequest;
  await search.fill("fast");
  await page.getByText("Fast Customer", { exact: true }).waitFor();
  await page.waitForTimeout(1100);
  assert.equal(await page.getByText("Slow Customer", { exact: true }).count(), 0);
  await search.fill("");
  await page.getByText("Test Customer", { exact: true }).waitFor();
  await page.getByText("Test Customer", { exact: true }).click();
  await page.getByLabel("Name", { exact: true }).waitFor();
  await page.getByLabel("Name", { exact: true }).fill("Unsaved profile name");
  await page.locator(".dashboard-save-bar").waitFor();
  await page.waitForTimeout(250);
  const bar = await page.locator(".dashboard-save-bar").boundingBox();
  const nav = await page.locator(".dashboard-mobile-nav").boundingBox();
  assert.ok(bar.y + bar.height <= nav.y, "Save bar overlaps mobile navigation");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.goBack();
  await page.waitForTimeout(400);
  assert.ok(page.url().includes("/customers/" + id));
  assert.equal(await page.getByLabel("Name", { exact: true }).inputValue(), "Unsaved profile name");
  page.once("dialog", (dialog) => dialog.accept());
  await page.goBack();
  await page.getByRole("heading", { name: "Customers", exact: true }).waitFor();
  const renderRoutes = [
    "products/new",
    "brands",
    "categories",
    "collections",
    "orders",
    "inventory",
    "receiving",
    "purchase-orders",
    "suppliers",
    "procurement",
    "sales",
    "homepage",
    "homepage/hero",
    "settings",
    "media",
    "navigation",
    "seo",
    "analytics",
  ];
  for (const path of renderRoutes) {
    await page.goto(origin + "/dashboard/" + path, { waitUntil: "domcontentloaded" });
    await page.locator("main h1").first().waitFor({ timeout: 30000 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      "Mobile overflow at " + path,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });

  console.log(
    JSON.stringify({
      passed: [
        "mobile customers render",
        "no document overflow",
        "sidebar Escape",
        "staff directory hidden for editor",
        "Arabic labels and RTL",
        "modal keyboard and discard protection",
        "latest search wins",
        "mobile save bar above navigation",
        "browser Back preserves unsaved edits",
        "18 dashboard routes render without mobile overflow",
      ],
      pageErrors: errors,
    }),
  );
  assert.deepEqual(errors, []);
} catch (error) {
  console.log(
    JSON.stringify({
      url: page.url(),
      body: (await page.locator("body").innerText()).slice(0, 700),
      errors,
      requests,
    }),
  );
  throw error;
} finally {
  await browser.close();
}
