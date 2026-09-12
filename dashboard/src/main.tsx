import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  API_BASE,
  AdminApiError,
  AdminProduct,
  checkHealth,
  clearApiKey,
  fetchProducts,
  getStoredApiKey,
  storeApiKey,
  type HealthResponse,
} from "./api";
import "./styles.css";

type View = "overview" | "products" | "orders" | "inventory" | "customers" | "settings";

const NAV_ITEMS: Array<{ id: View; label: string; icon: string }> = [
  { id: "overview", label: "نظرة عامة", icon: "⌂" },
  { id: "products", label: "المنتجات", icon: "▦" },
  { id: "orders", label: "الطلبات", icon: "◫" },
  { id: "inventory", label: "المخزون", icon: "▤" },
  { id: "customers", label: "العملاء", icon: "◎" },
  { id: "settings", label: "الإعدادات", icon: "⚙" },
];

function money(value: number | null) {
  return value === null ? "—" : `$${value.toFixed(2)}`;
}

function inventoryTone(value: number | null) {
  if (value === null) return "muted";
  if (value <= 0) return "danger";
  if (value <= 5) return "warning";
  return "success";
}

function App() {
  const [view, setView] = useState<View>("overview");
  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const connected = Boolean(health?.ok);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products;
    return products.filter((product) =>
      [product.title, product.vendor, product.productType, product.handle]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [products, query]);

  const stats = useMemo(() => {
    const active = products.filter((product) => product.status === "ACTIVE").length;
    const inventory = products.reduce((sum, product) => sum + (product.totalInventory ?? 0), 0);
    const lowStock = products.filter(
      (product) => product.totalInventory !== null && product.totalInventory <= 5,
    ).length;
    return { active, inventory, lowStock };
  }, [products]);

  async function loadDashboard() {
    if (!getStoredApiKey()) return;
    setLoading(true);
    setError("");
    try {
      const healthResult = await checkHealth();
      setHealth(healthResult);
      if (healthResult.config.shopifyAdminConfigured) {
        const productsResult = await fetchProducts(50);
        setProducts(productsResult.products);
      }
    } catch (caught) {
      setHealth(null);
      setProducts([]);
      if (caught instanceof AdminApiError) {
        setError(caught.message);
      } else {
        setError("تعذر الاتصال بـ API الخاصة بالمتجر.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (getStoredApiKey()) void loadDashboard();
  }, []);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (!apiKey.trim()) return;
    storeApiKey(apiKey);
    await loadDashboard();
  }

  function logout() {
    clearApiKey();
    setApiKey("");
    setHealth(null);
    setProducts([]);
    setError("");
  }

  if (!connected) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <div className="brand-mark">SC</div>
          <div>
            <span className="eyebrow">SPACE CALL</span>
            <h1>لوحة إدارة المتجر</h1>
            <p>Dashboard منفصلة تتصل بالمتجر عبر API آمنة.</p>
          </div>
          <form onSubmit={handleLogin} className="login-form">
            <label htmlFor="apiKey">Admin API Key</label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="أدخل مفتاح لوحة الإدارة"
              autoComplete="current-password"
            />
            <button type="submit" disabled={loading || !apiKey.trim()}>
              {loading ? "جاري الاتصال…" : "اتصال بالمتجر"}
            </button>
          </form>
          {error ? <div className="alert error-alert">{error}</div> : null}
          <div className="login-meta">
            <span>API</span>
            <code>{API_BASE}</code>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark small">SC</div>
          <div>
            <strong>Space Call</strong>
            <span>Admin Console</span>
          </div>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "nav-item active" : "nav-item"}
              onClick={() => setView(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="status-dot" />
          <div>
            <strong>API متصلة</strong>
            <small>{health.config.shopifyDomain}</small>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">SPACE CALL / ADMIN</span>
            <h1>{NAV_ITEMS.find((item) => item.id === view)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" onClick={() => void loadDashboard()} disabled={loading}>
              {loading ? "تحديث…" : "تحديث البيانات"}
            </button>
            <button className="ghost-button danger-text" onClick={logout}>
              تسجيل خروج
            </button>
          </div>
        </header>

        {error ? <div className="alert error-alert page-alert">{error}</div> : null}

        {view === "overview" ? (
          <>
            <section className="metric-grid">
              <Metric label="المنتجات المحملة" value={String(products.length)} detail="آخر 50 منتج" />
              <Metric label="المنتجات النشطة" value={String(stats.active)} detail="Shopify ACTIVE" />
              <Metric label="إجمالي المخزون" value={String(stats.inventory)} detail="ضمن البيانات المحملة" />
              <Metric label="مخزون منخفض" value={String(stats.lowStock)} detail="5 قطع أو أقل" danger={stats.lowStock > 0} />
            </section>

            <section className="panel-grid">
              <article className="panel wide-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">LIVE SHOPIFY DATA</span>
                    <h2>أحدث المنتجات</h2>
                  </div>
                  <button className="text-button" onClick={() => setView("products")}>عرض الكل</button>
                </div>
                <ProductTable products={products.slice(0, 8)} />
              </article>

              <article className="panel connection-panel">
                <span className="eyebrow">CONNECTION</span>
                <h2>حالة النظام</h2>
                <StatusRow label="Dashboard API" ok={health.config.apiKeyConfigured} />
                <StatusRow label="Shopify Admin" ok={health.config.shopifyAdminConfigured} />
                <StatusRow label="Allowed Origin" ok={health.config.dashboardOriginConfigured} />
                <div className="connection-note">
                  <strong>{health.config.storeName}</strong>
                  <span>{health.config.shopifyDomain}</span>
                </div>
              </article>
            </section>
          </>
        ) : null}

        {view === "products" ? (
          <section className="panel products-panel">
            <div className="panel-heading product-toolbar">
              <div>
                <span className="eyebrow">CATALOG</span>
                <h2>إدارة المنتجات</h2>
              </div>
              <input
                className="search-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="بحث بالاسم، البراند أو النوع…"
              />
            </div>
            <ProductTable products={filteredProducts} />
          </section>
        ) : null}

        {view === "orders" || view === "inventory" || view === "customers" || view === "settings" ? (
          <section className="empty-state panel">
            <div className="empty-icon">+</div>
            <span className="eyebrow">NEXT API MODULE</span>
            <h2>البنية جاهزة لإضافة هذا القسم</h2>
            <p>
              تم فصل الـ Dashboard عن المتجر وتجهيز طبقة API. المرحلة التالية تضيف endpoints لهذا القسم بدون ربط مباشر بواجهة المتجر.
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function Metric({ label, value, detail, danger = false }: { label: string; value: string; detail: string; danger?: boolean }) {
  return (
    <article className={danger ? "metric-card danger-metric" : "metric-card"}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="status-row">
      <span>{label}</span>
      <strong className={ok ? "pill success" : "pill danger"}>{ok ? "جاهز" : "غير مضبوط"}</strong>
    </div>
  );
}

function ProductTable({ products }: { products: AdminProduct[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>المنتج</th>
            <th>الحالة</th>
            <th>السعر</th>
            <th>المخزون</th>
            <th>Variants</th>
            <th>آخر تحديث</th>
          </tr>
        </thead>
        <tbody>
          {products.length ? (
            products.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="product-name">
                    <strong>{product.title}</strong>
                    <span>{product.vendor || product.productType || product.handle}</span>
                  </div>
                </td>
                <td><span className={product.status === "ACTIVE" ? "pill success" : "pill muted"}>{product.status}</span></td>
                <td>{money(product.minPrice)}</td>
                <td><span className={`inventory ${inventoryTone(product.totalInventory)}`}>{product.totalInventory ?? "—"}</span></td>
                <td>{product.variantsCount}</td>
                <td>{new Date(product.updatedAt).toLocaleDateString("ar-LB")}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="empty-table">لا توجد منتجات لعرضها.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
