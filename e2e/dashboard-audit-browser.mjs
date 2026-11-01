// Local browser regression using synthetic authentication and intercepted API responses.
// Start the dev server first; this script never writes to Supabase.
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";
import assert from "node:assert/strict";
const { browser, context, id } = await createDashboardBrowser();
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
async function assertControlsFit(label) {
  const clipped = await page.locator("main").evaluate((main) =>
    [...main.querySelectorAll('input:not([type="hidden"]):not([type="file"]), select, textarea')]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        if (!box.width || !box.height || element.closest('.overflow-x-auto, [role="dialog"]'))
          return false;
        return box.left < -1 || box.right > innerWidth + 1;
      })
      .map((element) => ({
        field:
          element.getAttribute("aria-label") ||
          element.getAttribute("placeholder") ||
          element.tagName,
      })),
  );
  assert.deepEqual(clipped, [], label);
  assert.equal(
    await page.getByText("This section could not be opened.", { exact: true }).count(),
    0,
  );
  assert.equal(await page.getByText("تعذر فتح هذا القسم.", { exact: true }).count(), 0);
}
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
    "",
    "promotions",
    "marketing",
    "coupons",
    "messages",
    "reviews",
    "activity",
    "security",
    "products",
    "products/new",
    "users",
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
    await assertControlsFit("Mobile form controls at " + path);
  }
  // Desktop-site mode on phones commonly has a 980px CSS viewport.
  // Navigation must be part of the layout, never a drawer or optional toggle.
  const assertIntegratedSidebar = async (label) => {
    const geometry = await page.evaluate(() => {
      const root = document.querySelector(".dashboard-theme-scope");
      const sidebar = document.querySelector("#dashboard-sidebar-navigation");
      const content = document.querySelector(".dashboard-desktop-content");
      const menu = document.querySelector(".dashboard-menu-trigger");
      const mobileNav = document.querySelector(".dashboard-mobile-nav");
      if (!root || !sidebar || !content || !menu || !mobileNav) return null;
      const side = sidebar.getBoundingClientRect();
      const body = content.getBoundingClientRect();
      return {
        rootDisplay: getComputedStyle(root).display,
        sidePosition: getComputedStyle(sidebar).position,
        sideTransform: getComputedStyle(sidebar).transform,
        sideTranslate: getComputedStyle(sidebar).translate,
        sideVisible: side.width > 150 && side.height > 0,
        sideRight: side.right,
        sideLeft: side.left,
        contentRight: body.right,
        contentLeft: body.left,
        contentWidth: body.width,
        menuDisplay: getComputedStyle(menu).display,
        mobileNavDisplay: getComputedStyle(mobileNav).display,
        sidebarRole: sidebar.getAttribute("role"),
        rtl: document.documentElement.dir === "rtl",
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert.ok(geometry, label + ": expected dashboard layout");
    assert.equal(geometry.rootDisplay, "grid", label);
    assert.equal(geometry.sidePosition, "sticky", label);
    assert.equal(geometry.sideTransform, "none", label);
    assert.equal(geometry.sideTranslate, "none", label);
    assert.equal(geometry.sideVisible, true, label);
    assert.equal(geometry.menuDisplay, "none", label);
    assert.equal(geometry.mobileNavDisplay, "none", label);
    assert.equal(geometry.sidebarRole, null, label);
    assert.equal(geometry.overflow, false, label);
    assert.ok(geometry.contentWidth > 350, label + ": content too narrow");
    assert.ok(
      geometry.rtl
        ? geometry.sideLeft >= geometry.contentRight - 2
        : geometry.sideRight <= geometry.contentLeft + 2,
      label + ": sidebar overlaps workspace",
    );
  };
  for (const width of [768, 980]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(250);
    await assertIntegratedSidebar("Permanent English sidebar at " + width);
  }
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.getByRole("button", { name: "AR", exact: true }).click();
  await page.getByRole("button", { name: "التبديل إلى الوضع الداكن", exact: true }).click();
  await assertIntegratedSidebar("Permanent Arabic desktop sidebar at 1024");
  for (const path of renderRoutes) {
    await page.goto(origin + "/dashboard/" + path, { waitUntil: "domcontentloaded" });
    await page.locator("main h1").first().waitFor({ timeout: 30000 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      "Arabic tablet overflow at " + path,
    );
    await assertControlsFit("Arabic tablet form controls at " + path);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await assertIntegratedSidebar("Permanent Arabic desktop sidebar at 1440");

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
        "all dashboard navigation routes render without mobile overflow",
        "all dashboard navigation routes render in Arabic dark tablet view",
        "desktop-site viewport keeps an integrated sidebar without toggle",
        "desktop sidebar does not overlap content in English or RTL",
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
