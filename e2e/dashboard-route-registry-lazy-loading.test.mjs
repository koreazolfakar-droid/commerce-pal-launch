import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readDashboardShellSource } from "./helpers/dashboard-shell-source.mjs";
import test from "node:test";

const [app, routes, navigation, appMount] = await Promise.all([
  readDashboardShellSource(),
  readFile(new URL("../src/dashboard/config/routes.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/config/navigation.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/AppMount.tsx", import.meta.url), "utf8"),
]);

test("dashboard shell no longer statically imports route pages", () => {
  assert.doesNotMatch(app, /from "@\/dashboard\/pages\//);
  assert.match(app, /resolveDashboardRoute\(route\)/);
  assert.match(app, /<Suspense fallback=\{<DashboardRouteFallback \/>\}>/);
  assert.match(appMount, /const App = lazy\(loadDashboardApp\)/);
});

test("route registry lazy-loads operational and workspace pages", () => {
  for (const page of [
    "DashboardHomePage",
    "OrdersPage",
    "ProductsPage",
    "ProductFormPage",
    "InventoryManagerPage",
    "ReceivingPage",
    "HomepageBuilder",
    "SecurityPage",
    "WorkspacePage",
    "LoginPage",
  ]) {
    assert.match(
      routes,
      new RegExp(`lazyPage\\(\\(\\) => import\\("@/dashboard/pages/${page}"\\)\\)`),
    );
  }
  assert.doesNotMatch(routes, /import\s+\w+\s+from\s+"@\/dashboard\/pages\//);
});

test("route registry preserves exact and dynamic dashboard paths", () => {
  for (const path of [
    "/dashboard",
    "/dashboard/analytics",
    "/dashboard/orders",
    "/dashboard/sales",
    "/dashboard/products",
    "/dashboard/products/new",
    "/dashboard/collections",
    "/dashboard/customers",
    "/dashboard/inventory",
    "/dashboard/procurement",
    "/dashboard/suppliers",
    "/dashboard/purchase-orders",
    "/dashboard/purchase-orders/new",
    "/dashboard/receiving",
    "/dashboard/categories",
    "/dashboard/brands",
    "/dashboard/security",
    "/dashboard/settings",
    "/dashboard/navigation",
    "/dashboard/media",
    "/dashboard/seo",
    "/dashboard/homepage",
    "/dashboard/homepage/hero",
    "/dashboard/promotions",
    "/dashboard/marketing",
    "/dashboard/coupons",
    "/dashboard/messages",
    "/dashboard/reviews",
    "/dashboard/users",
    "/dashboard/activity",
  ]) {
    assert.ok(routes.includes(`path: "${path}"`), `missing ${path}`);
  }

  assert.match(routes, /\/dashboard\\\/orders\\\/\(\[\^\/\]\+\)\$/);
  assert.match(routes, /\/dashboard\\\/products\\\/\(\[\^\/\]\+\)\$/);
  assert.match(routes, /\/dashboard\\\/purchase-orders\\\/\(\[\^\/\]\+\)\\\/edit\$/);
  assert.match(routes, /\/dashboard\\\/receivings\\\/\(\[\^\/\]\+\)\$/);
  assert.match(routes, /purchaseOrderId/);
});

test("navigation and page metadata come from the route registry", () => {
  assert.match(navigation, /dashboardNavigationSections/);
  assert.match(navigation, /dashboardPageMeta/);
  assert.doesNotMatch(navigation, /href: "\/dashboard/);
  assert.match(routes, /navigation:/);
  assert.match(routes, /dashboardNavigationSections/);
  assert.match(routes, /dashboardPageMeta/);
});

test("sidebar and mobile navigation preload route chunks without eagerly executing them", () => {
  assert.match(app, /onMouseEnter=\{\(\) => void preloadDashboardRoute\(item\.href\)\}/);
  assert.match(app, /onFocus=\{\(\) => void preloadDashboardRoute\(item\.href\)\}/);
  assert.match(app, /onTouchStart=\{\(\) => void preloadDashboardRoute\(item\.href\)\}/);
  assert.match(app, /onTouchStart=\{\(\) => void preloadDashboardRoute\(href\)\}/);
  assert.match(routes, /request \?\?= loader\(\)/);
});

test("legacy manual page-routing chain does not return", () => {
  assert.doesNotMatch(app, /route === "\/dashboard\/orders"/);
  assert.doesNotMatch(app, /productDetail = route\.match/);
  assert.doesNotMatch(app, /purchaseOrderDetail = route\.match/);
  assert.doesNotMatch(app, /content = <\w+Page/);
});
