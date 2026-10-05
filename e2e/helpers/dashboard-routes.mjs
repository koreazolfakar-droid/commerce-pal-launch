import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../../src/dashboard/config/routes.tsx", import.meta.url),
  "utf8",
);
const names = [...source.matchAll(/const (\w+Page) = lazyPage/g)].map((match) => match[1]);
const imports = new Map(
  [
    ...source.matchAll(
      /const (\w+Page) = lazyPage\(\(\) => import\("@\/dashboard\/pages\/(\w+)"\)\)/g,
    ),
  ].map((match) => [match[1], match[2]]),
);
const specialPages = {
  homePage: "DashboardHomePage",
  inventoryPage: "InventoryManagerPage",
  procurementPage: "ProcurementAnalyticsPage",
  homepagePage: "HomepageBuilder",
  mediaPage: "MediaLibraryPage",
};
const js = ts.transpileModule(source.replace(/^import[\s\S]*?;\s*/gm, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const exports = {};
new Function(
  "exports",
  "lazy",
  "createElement",
  `${js}\nexports.pages = {${names.join(",")}}; exports.findRoute = findRoute;`,
)(
  exports,
  (loader) => ({ loader }),
  (type, props) => ({ type, props }),
);
export function assertDashboardRoute(path, pageName) {
  assert.equal(
    imports.get(pageName),
    specialPages[pageName] ?? pageName[0].toUpperCase() + pageName.slice(1),
    `Wrong imported page module for ${path}`,
  );
  const resolved = exports.findRoute(path);
  assert.ok(resolved, `Missing dashboard route: ${path}`);
  assert.equal(resolved.definition.page, exports.pages[pageName], `Wrong page for ${path}`);
  const rendered = exports.resolveDashboardRoute(path);
  assert.equal(rendered.type, exports.pages[pageName].Component);
  if (resolved.match.params.id) assert.equal(rendered.props.id, resolved.match.params.id);
  if (resolved.definition.navigation && resolved.definition.path)
    assertDashboardNavigation(resolved.definition.path);
  return resolved;
}
export function assertDashboardNavigation(path) {
  assert.ok(
    exports.dashboardNavigationSections.some((section) =>
      section.items.some((item) => item.href === path),
    ),
    `Missing navigation item: ${path}`,
  );
}
