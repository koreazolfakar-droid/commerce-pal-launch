import { chromium } from "@playwright/test";

// Synthetic session and intercepted fixtures. Never sends dashboard writes to a real backend.
export async function createDashboardBrowser() {
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
      localStorage.setItem(
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

  return { browser, context, id };
}
