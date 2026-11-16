import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [app, sidebar, css, routes, workspace] = await Promise.all([
  readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/components/layout/DashboardSidebar.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/components/layout/SidebarPolish.css", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/config/routes.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/workspace.css", import.meta.url), "utf8"),
]);

test("sidebar redesign scopes CSS to navigation and preserves integrated desktop layout", () => {
  assert.match(app, /import "@\/dashboard\/components\/layout\/SidebarPolish\.css"/);
  assert.match(sidebar, /dashboard-sidebar sidebar-polished/);
  assert.match(css, /\.dashboard-theme-scope \.dashboard-sidebar\.sidebar-polished/);
  assert.match(css, /--dashboard-integrated-sidebar-width: clamp\(208px, 19vw, 244px\)/);
  assert.match(css, /@media \(min-width: 1440px\)/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /width: min\(88vw, 312px\)/);
  assert.match(css, /max\(11px, env\(safe-area-inset-bottom\)\)/);
});

test("all dashboard navigation and disclosure behavior remains intact", () => {
  assert.match(sidebar, /navSections\.map\(\(section\) =>/);
  assert.match(sidebar, /section\.items[\s\S]*?\.filter\(\(item\) => !unavailableDashboardRoutes\.has\(item\.href\)\)/);
  assert.match(sidebar, /item\.href !== "\/dashboard\/users" \|\| identity\.role === "admin"/);
  assert.match(sidebar, /toggleSection\(section\.label\)/);
  assert.match(sidebar, /aria-expanded=\{!closedSections\.includes\(section\.label\)\}/);
  assert.match(sidebar, /writePreference\("dashboard:closed-sections", JSON\.stringify\(next\)\)/);
  assert.match(sidebar, /navigate\(item\.href\)/);
  assert.match(sidebar, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(sidebar, /title=\{t\(item\.label\)\}/);
  assert.match(sidebar, /onClick=\{\(\) => window\.open\(SITE_URL, "_blank", "noopener,noreferrer"\)\}/);
  assert.match(routes, /path: "\/dashboard\/products\/new"/);
});

test("active group visibility, keyboard focus, touch targets and reduced motion remain accessible", () => {
  assert.match(sidebar, /data-active-section=\{section\.items\.some\(\(item\) => isActive\(item\.href\)\)/);
  assert.match(css, /data-active-section="true"/);
  assert.match(css, /dashboard-sidebar-action\[aria-current="page"\]/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /outline: 2px solid var\(--sc-side-focus\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\[dir="rtl"\]/);
});

test("desktop navigation remains viewport-fixed alongside a reserved content grid column", () => {
  assert.match(app, /dashboard-theme-scope min-h-screen min-h-\[100dvh\] overflow-x-clip/);
  assert.doesNotMatch(app, /dashboard-theme-scope[^\n]*overflow-x-hidden/);
  assert.match(css, /\.dashboard-theme-scope \.dashboard-sidebar\.sidebar-polished/);
  assert.match(sidebar, /dashboard-sidebar-scroll flex-1 overflow-y-auto overscroll-contain/);
  assert.match(sidebar, /dashboard-sidebar-footer p-3/);
  assert.match(workspace, /position: fixed;\s*inset-block-start: 0;\s*inset-inline-start: 0;/);
  assert.match(workspace, /width: var\(--dashboard-integrated-sidebar-width\)/);
  assert.match(workspace, /\.dashboard-theme-scope \.dashboard-desktop-content \{\s*grid-column: 2;/);
});
