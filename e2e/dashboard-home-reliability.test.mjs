import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  new URL("../src/dashboard/pages/DashboardHomePage.tsx", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;

// Render the real page with controlled hooks/transport so failures and request ordering
// can be exercised without a browser, database, or production customer records.
function harness() {
  const hooks = [];
  const effects = [];
  const requests = [];
  const downloads = [];
  let cursor = 0;
  const changed = (a, b) => !a || a.length !== b.length || a.some((x, i) => x !== b[i]);
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [hooks[index], (next) => {
        hooks[index] = typeof next === "function" ? next(hooks[index]) : next;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = { current: initial };
      return hooks[index];
    },
    useMemo(factory, deps) {
      const index = cursor++;
      if (!hooks[index] || changed(hooks[index].deps, deps)) {
        hooks[index] = { deps, value: factory() };
      }
      return hooks[index].value;
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
    useEffect(effect, deps) {
      const index = cursor++;
      const previous = hooks[index];
      if (!previous || changed(previous.deps, deps)) {
        hooks[index] = { deps, cleanup: previous?.cleanup };
        effects.push(() => {
          hooks[index].cleanup?.();
          hooks[index].cleanup = effect();
        });
      }
    },
  };
  const element = (type, props, key) => ({ type, props: props ?? {}, key });
  const t = (value) => value;
  const dependencies = {
    react,
    "react/jsx-runtime": { jsx: element, jsxs: element },
    "lucide-react": new Proxy({}, { get: (_, key) => String(key) }),
    recharts: new Proxy({}, { get: (_, key) => String(key) }),
    sonner: { toast: { success() {}, error() {} } },
    wouter: { useLocation: () => ["/dashboard", () => {}] },
    "@/dashboard/components/layout/DashboardWorkTools": { default: "DashboardWorkTools" },
    "@/dashboard/i18n": { useLanguage: () => ({ t, lang: "en" }) },
    "@/dashboard/components/layout/PageTitle": { PageTitle: "PageTitle" },
    "@/dashboard/lib/exportCsv": { downloadCsv: (...args) => downloads.push(args) },
    "@/dashboard/data/home": {
      loadDashboardHomeSnapshot(period) {
        return new Promise((resolve, reject) => requests.push({ period, resolve, reject }));
      },
    },
  };
  const module = { exports: {} };
  new Function("require", "module", "exports", compiled)(
    (name) => {
      assert.ok(name in dependencies, "Unexpected dependency: " + name);
      return dependencies[name];
    },
    module,
    module.exports,
  );
  return {
    requests,
    downloads,
    render() {
      cursor = 0;
      const tree = module.exports.DashboardReport({});
      for (const effect of effects.splice(0)) effect();
      return tree;
    },
  };
}

function* elements(tree) {
  if (Array.isArray(tree)) {
    for (const child of tree) yield* elements(child);
  } else if (tree && typeof tree === "object" && tree.props) {
    yield tree;
    yield* elements(tree.props.children);
  }
}

const find = (tree, match) => [...elements(tree)].find(match);
const button = (tree, label) => find(tree, (node) =>
  node.type === "button" &&
  (Array.isArray(node.props.children) ? node.props.children : [node.props.children]).includes(label),
);
const select = (tree) => find(tree, (node) => node.type === "select");
const reportPeriod = (tree) => find(tree, (node) => node.props.label === "Orders")?.props.detail;
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

function snapshot(days, sales = 300) {
  return {
    periodStart: days === 7 ? "2026-11-11T00:00:00Z" : "2026-10-19T00:00:00Z",
    periodEnd: "2026-11-17T12:00:00Z",
    totalSales: sales,
    ordersLast30Days: days,
    customerCount: 4, productCount: 6, activeProductCount: 6, totalUnits: 30,
    lowStockVariants: 0, outOfStockVariants: 0, visibleBrandCount: 3,
    recentOrders: [], trend: [], topProducts: [], topBrands: [],
  };
}

async function loadedHarness() {
  const h = harness();
  h.render();
  assert.equal(h.requests[0].period, 30);
  h.requests[0].resolve(snapshot(30));
  await settle();
  return h;
}

test("failed range change keeps successful report period and prevents exporting mislabeled data", async () => {
  const h = await loadedHarness();
  let tree = h.render();
  assert.equal(reportPeriod(tree), "Last 30 days");
  assert.equal(button(tree, "Export report").props.disabled, false);

  select(tree).props.onChange({ target: { value: "7" } });
  tree = h.render();
  assert.equal(h.requests[1].period, 7);
  assert.equal(reportPeriod(tree), "Last 30 days");
  assert.equal(button(tree, "Export report").props.disabled, true);

  tree = h.render();
  assert.equal(tree.props["aria-busy"], true);
  assert.ok(find(tree, (node) => node.props.role === "status"));
  assert.equal(reportPeriod(tree), "Last 30 days");

  h.requests[1].reject(new Error("Fixture offline"));
  await settle();
  tree = h.render();
  assert.equal(reportPeriod(tree), "Last 30 days");
  assert.ok(find(tree, (node) => node.props.role === "alert"));
  assert.equal(button(tree, "Export report").props.disabled, true);

  button(tree, "Retry").props.onClick();
  assert.equal(h.requests[2].period, 7);
  h.requests[2].resolve(snapshot(7, 70));
  await settle();
  tree = h.render();
  assert.equal(reportPeriod(tree), "Last 7 days");
  assert.equal(find(tree, (node) => node.props.role === "alert"), undefined);
  assert.equal(button(tree, "Export report").props.disabled, false);
  button(tree, "Export report").props.onClick();
  assert.equal(h.downloads[0][0], "space-call-report-7d.csv");
  assert.equal(h.downloads[0][1][1][1], 70);
  assert.equal(h.downloads[0][1][1][2], snapshot(7).periodStart);
});

test("an older range response cannot overwrite a newer successful report", async () => {
  const h = await loadedHarness();
  let tree = h.render();
  select(tree).props.onChange({ target: { value: "7" } });
  tree = h.render();
  select(tree).props.onChange({ target: { value: "90" } });
  h.render();
  assert.deepEqual(h.requests.map((request) => request.period), [30, 7, 90]);

  h.requests[2].resolve(snapshot(90, 900));
  await settle();
  h.requests[1].resolve(snapshot(7, 70));
  await settle();

  tree = h.render();
  assert.equal(reportPeriod(tree), "Last 90 days");
  button(tree, "Export report").props.onClick();
  assert.equal(h.downloads[0][0], "space-call-report-90d.csv");
  assert.equal(h.downloads[0][1][1][1], 900);
});
