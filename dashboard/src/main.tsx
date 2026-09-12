import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  API_BASE,
  AdminApiError,
  type AdminCustomer,
  type AdminOrder,
  type AdminOrderStatus,
  type AdminProduct,
  checkHealth,
  clearApiKey,
  fetchCustomers,
  fetchOrders,
  fetchProducts,
  getStoredApiKey,
  storeApiKey,
  type HealthResponse,
} from "./api";
import "./styles.css";
import "./phase1.css";

type View = "overview" | "products" | "orders" | "inventory" | "customers" | "settings";

const NAV_ITEMS: Array<{ id: View; label: string; short: string; icon: string }> = [
  { id: "overview", label: "نظرة عامة", short: "الرئيسية", icon: "⌂" },
  { id: "products", label: "المنتجات", short: "المنتجات", icon: "▦" },
  { id: "orders", label: "الطلبات", short: "الطلبات", icon: "◫" },
  { id: "inventory", label: "المخزون", short: "المخزون", icon: "▤" },
  { id: "customers", label: "العملاء", short: "العملاء", icon: "◎" },
  { id: "settings", label: "الإعدادات", short: "المزيد", icon: "⚙" },
];

const ORDER_LABELS: Record<AdminOrderStatus, string> = {
  NEW: "جديد",
  CONFIRMED: "مؤكد",
  PREPARING: "قيد التحضير",
  READY: "جاهز",
  DELIVERED: "تم التوصيل",
  CANCELLED: "ملغي",
};

function money(value: number | null) {
  return value === null ? "—" : `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function inventoryTone(value: number | null) {
  if (value === null) return "muted";
  if (value <= 0) return "danger";
  if (value <= 5) return "warning";
  return "success";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ar-LB", { month: "short", day: "numeric" });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("ar-LB", { hour: "2-digit", minute: "2-digit" });
}

function buildSalesSeries(orders: AdminOrder[]) {
  const now = new Date();
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return {
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      label: date.toLocaleDateString("ar-LB", { weekday: "short" }),
      value: 0,
    };
  });
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const order of orders) {
    if (order.status === "CANCELLED") continue;
    const date = new Date(order.createdAt);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.value += order.total;
  }

  return buckets.map(({ label, value }) => ({ label, value }));
}

function App() {
  const [view, setView] = useState<View>("overview");
  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState<"ALL" | "ACTIVE" | "LOW" | "OUT">("ALL");
  const [orderFilter, setOrderFilter] = useState<"ALL" | AdminOrderStatus>("ALL");

  const connected = Boolean(health?.ok);
  const salesSeries = useMemo(() => buildSalesSeries(orders), [orders]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !normalized ||
        [product.title, product.vendor, product.productType, product.handle]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      const matchesFilter =
        productFilter === "ALL" ||
        (productFilter === "ACTIVE" && product.status === "ACTIVE") ||
        (productFilter === "LOW" && product.totalInventory !== null && product.totalInventory > 0 && product.totalInventory <= 5) ||
        (productFilter === "OUT" && product.totalInventory !== null && product.totalInventory <= 0);
      return matchesSearch && matchesFilter;
    });
  }, [products, query, productFilter]);

  const filteredOrders = useMemo(
    () => orders.filter((order) => orderFilter === "ALL" || order.status === orderFilter),
    [orders, orderFilter],
  );

  const stats = useMemo(() => {
    const active = products.filter((product) => product.status === "ACTIVE").length;
    const inventory = products.reduce((sum, product) => sum + (product.totalInventory ?? 0), 0);
    const lowStock = products.filter(
      (product) => product.totalInventory !== null && product.totalInventory <= 5,
    ).length;
    const revenue = orders
      .filter((order) => order.status !== "CANCELLED")
      .reduce((sum, order) => sum + order.total, 0);
    return { active, inventory, lowStock, revenue };
  }, [products, orders]);

  const lowStockProducts = useMemo(
    () =>
      [...products]
        .filter((product) => product.totalInventory !== null && product.totalInventory <= 5)
        .sort((a, b) => (a.totalInventory ?? 0) - (b.totalInventory ?? 0)),
    [products],
  );

  async function loadDashboard() {
    if (!getStoredApiKey()) return;
    setLoading(true);
    setError("");
    try {
      const healthResult = await checkHealth();
      setHealth(healthResult);

      if (!healthResult.config.shopifyAdminConfigured) {
        setError("Shopify Admin API غير مضبوطة على السيرفر بعد.");
        return;
      }

      const [productsResult, ordersResult, customersResult] = await Promise.allSettled([
        fetchProducts(100),
        fetchOrders(100),
        fetchCustomers(100),
      ]);

      const problems: string[] = [];
      if (productsResult.status === "fulfilled") setProducts(productsResult.value.products);
      else {
        setProducts([]);
        problems.push("المنتجات/المخزون");
      }

      if (ordersResult.status === "fulfilled") setOrders(ordersResult.value.orders);
      else {
        setOrders([]);
        problems.push("الطلبات");
      }

      if (customersResult.status === "fulfilled") setCustomers(customersResult.value.customers);
      else {
        setCustomers([]);
        problems.push("العملاء");
      }

      if (problems.length) {
        setError(`تم الاتصال بـ Shopify، لكن تعذر تحميل: ${problems.join("، ")}. راجع صلاحيات Shopify Admin API.`);
      }
    } catch (caught) {
      setHealth(null);
      setProducts([]);
      setOrders([]);
      setCustomers([]);
      if (caught instanceof AdminApiError) setError(caught.message);
      else setError("تعذر الاتصال بـ API الخاصة بالمتجر.");
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
    setOrders([]);
    setCustomers([]);
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
            <p>Dashboard مستقلة تتصل ببيانات Shopify الحقيقية من خلال API آمنة.</p>
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
          <div className="login-meta"><span>API</span><code>{API_BASE}</code></div>
        </section>
      </main>
    );
  }

  if (!health) return null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark small">SC</div>
          <div><strong>Space Call</strong><span>Commerce OS</span></div>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="status-dot" />
          <div><strong>LIVE • Shopify</strong><small>{health.config.shopifyDomain}</small></div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">SPACE CALL / COMMERCE OS</span>
            <h1>{NAV_ITEMS.find((item) => item.id === view)?.label}</h1>
            <span className="preview-badge">LIVE DATA</span>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" onClick={() => void loadDashboard()} disabled={loading}>{loading ? "تحديث…" : "تحديث"}</button>
            <button className="ghost-button danger-text" onClick={logout}>خروج</button>
          </div>
        </header>

        {error ? <div className="alert error-alert page-alert">{error}</div> : null}

        {view === "overview" ? (
          <Overview
            products={products}
            orders={orders}
            stats={stats}
            lowStockProducts={lowStockProducts}
            salesSeries={salesSeries}
            health={health}
            setView={setView}
          />
        ) : null}

        {view === "products" ? (
          <ProductsView
            products={filteredProducts}
            query={query}
            setQuery={setQuery}
            productFilter={productFilter}
            setProductFilter={setProductFilter}
          />
        ) : null}

        {view === "orders" ? (
          <OrdersView orders={filteredOrders} allOrders={orders} orderFilter={orderFilter} setOrderFilter={setOrderFilter} />
        ) : null}

        {view === "inventory" ? <InventoryView products={products} /> : null}
        {view === "customers" ? <CustomersView customers={customers} /> : null}

        {view === "settings" ? (
          <section className="panel empty-state">
            <div className="empty-icon">⚙</div>
            <span className="eyebrow">LIVE INTEGRATIONS</span>
            <h2>مركز الإعدادات والتكاملات</h2>
            <p>Shopify Admin متصل عبر API server-only. سنضيف هنا WhatsApp، AI، المستخدمين والصلاحيات بدون كشف مفاتيح الإدارة للمتصفح.</p>
          </section>
        ) : null}
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {NAV_ITEMS.filter((item) => item.id !== "settings").map((item) => (
          <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
            <strong>{item.icon}</strong><span>{item.short}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Overview({
  products,
  orders,
  stats,
  lowStockProducts,
  salesSeries,
  health,
  setView,
}: {
  products: AdminProduct[];
  orders: AdminOrder[];
  stats: { active: number; inventory: number; lowStock: number; revenue: number };
  lowStockProducts: AdminProduct[];
  salesSeries: Array<{ label: string; value: number }>;
  health: HealthResponse;
  setView: (view: View) => void;
}) {
  const maxSale = Math.max(...salesSeries.map((item) => item.value), 1);
  return (
    <>
      <div className="quick-actions">
        <button className="quick-action primary" onClick={() => setView("products")}>＋ إضافة منتج</button>
        <button className="quick-action" onClick={() => setView("orders")}>＋ طلب جديد</button>
        <button className="quick-action" onClick={() => setView("inventory")}>▤ استلام مخزون</button>
        <button className="quick-action" onClick={() => setView("customers")}>◎ العملاء</button>
      </div>

      <section className="metric-grid">
        <Metric label="إجمالي المبيعات" value={money(stats.revenue)} detail="من آخر طلبات Shopify المحملة" />
        <Metric label="الطلبات" value={String(orders.length)} detail={`${orders.filter((o) => o.status === "NEW").length} طلب جديد`} />
        <Metric label="المنتجات النشطة" value={String(stats.active)} detail={`${products.length} منتج حقيقي محمل`} />
        <Metric label="مخزون منخفض" value={String(stats.lowStock)} detail="5 قطع أو أقل" danger={stats.lowStock > 0} />
      </section>

      <section className="dashboard-grid">
        <article className="panel wide-panel">
          <div className="panel-heading"><div><span className="eyebrow">SALES OVERVIEW</span><h2>أداء آخر 7 أيام</h2></div><span className="pill muted">Live</span></div>
          <div className="sales-chart">
            {salesSeries.map((item) => (
              <div className="sales-bar-wrap" key={item.label} title={`${item.label}: ${money(item.value)}`}>
                <div className="sales-bar" style={{ height: `${Math.max(6, (item.value / maxSale) * 100)}%` }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel connection-panel">
          <span className="eyebrow">LOW STOCK</span>
          <h2>تنبيهات المخزون</h2>
          <div className="stack-list">
            {lowStockProducts.length ? lowStockProducts.slice(0, 5).map((product) => (
              <div className="stock-card" key={product.id}>
                <div><strong>{product.title}</strong><span>{product.vendor || product.productType}</span></div>
                <span className={`stock-count ${(product.totalInventory ?? 0) <= 0 ? "out" : "low"}`}>{product.totalInventory ?? "—"}</span>
              </div>
            )) : <div className="live-data-note">لا توجد تنبيهات مخزون ضمن المنتجات المحملة.</div>}
          </div>
        </article>
      </section>

      <section className="panel-grid" style={{ marginTop: 16 }}>
        <article className="panel wide-panel">
          <div className="panel-heading"><div><span className="eyebrow">RECENT ORDERS</span><h2>أحدث الطلبات</h2></div><button className="text-button" onClick={() => setView("orders")}>عرض الكل</button></div>
          <OrdersTable orders={orders.slice(0, 5)} />
        </article>
        <article className="panel connection-panel">
          <span className="eyebrow">SYSTEM</span><h2>حالة النظام</h2>
          <StatusRow label="Dashboard API" ok={health.config.apiKeyConfigured} />
          <StatusRow label="Shopify Admin" ok={health.config.shopifyAdminConfigured} />
          <StatusRow label="Allowed Origin" ok={health.config.dashboardOriginConfigured} />
          <div className="connection-note"><strong>{health.config.storeName}</strong><span>{health.config.shopifyDomain}</span></div>
        </article>
      </section>
    </>
  );
}

function ProductsView({
  products,
  query,
  setQuery,
  productFilter,
  setProductFilter,
}: {
  products: AdminProduct[];
  query: string;
  setQuery: (value: string) => void;
  productFilter: "ALL" | "ACTIVE" | "LOW" | "OUT";
  setProductFilter: (value: "ALL" | "ACTIVE" | "LOW" | "OUT") => void;
}) {
  const filters: Array<[typeof productFilter, string]> = [["ALL", "الكل"], ["ACTIVE", "نشط"], ["LOW", "مخزون منخفض"], ["OUT", "نفد المخزون"]];
  return (
    <section className="panel products-panel">
      <div className="section-toolbar">
        <div><span className="eyebrow">CATALOG</span><h2>إدارة المنتجات</h2></div>
        <div className="toolbar-actions"><button className="quick-action primary">＋ منتج جديد</button></div>
      </div>
      <div className="section-toolbar">
        <div className="toolbar-actions">{filters.map(([id, label]) => <button key={id} className={productFilter === id ? "filter-chip active" : "filter-chip"} onClick={() => setProductFilter(id)}>{label}</button>)}</div>
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالاسم، البراند أو النوع…" />
      </div>
      <ProductTable products={products} />
    </section>
  );
}

function OrdersView({ orders, allOrders, orderFilter, setOrderFilter }: { orders: AdminOrder[]; allOrders: AdminOrder[]; orderFilter: "ALL" | AdminOrderStatus; setOrderFilter: (value: "ALL" | AdminOrderStatus) => void }) {
  const filters: Array<["ALL" | AdminOrderStatus, string]> = [["ALL", "الكل"], ["NEW", "جديد"], ["CONFIRMED", "مؤكد"], ["PREPARING", "تحضير"], ["READY", "جاهز"], ["DELIVERED", "تم التوصيل"]];
  return (
    <div className="orders-layout">
      <section className="summary-strip">
        <Summary label="كل الطلبات" value={String(allOrders.length)} />
        <Summary label="جديدة" value={String(allOrders.filter((o) => o.status === "NEW").length)} />
        <Summary label="قيد التنفيذ" value={String(allOrders.filter((o) => ["CONFIRMED", "PREPARING", "READY"].includes(o.status)).length)} />
        <Summary label="القيمة" value={money(allOrders.filter((o) => o.status !== "CANCELLED").reduce((sum, o) => sum + o.total, 0))} />
      </section>
      <section className="panel products-panel">
        <div className="section-toolbar"><div><span className="eyebrow">ORDER MANAGEMENT</span><h2>الطلبات</h2></div><button className="quick-action primary">＋ إنشاء طلب</button></div>
        <div className="toolbar-actions" style={{ marginBottom: 16 }}>{filters.map(([id, label]) => <button key={id} className={orderFilter === id ? "filter-chip active" : "filter-chip"} onClick={() => setOrderFilter(id)}>{label}</button>)}</div>
        <OrdersTable orders={orders} />
      </section>
    </div>
  );
}

function InventoryView({ products }: { products: AdminProduct[] }) {
  const total = products.reduce((sum, product) => sum + (product.totalInventory ?? 0), 0);
  const low = products.filter((product) => product.totalInventory !== null && product.totalInventory > 0 && product.totalInventory <= 5).length;
  const out = products.filter((product) => product.totalInventory !== null && product.totalInventory <= 0).length;
  const maxStock = Math.max(...products.map((product) => product.totalInventory ?? 0), 1);
  return (
    <div className="inventory-layout">
      <section className="summary-strip">
        <Summary label="إجمالي الوحدات" value={String(total)} />
        <Summary label="منتجات منخفضة" value={String(low)} />
        <Summary label="نفد المخزون" value={String(out)} />
        <Summary label="SKU محملة" value={String(products.reduce((sum, product) => sum + product.variantsCount, 0))} />
      </section>
      <section className="panel products-panel">
        <div className="section-toolbar"><div><span className="eyebrow">INVENTORY CONTROL</span><h2>المخزون</h2></div><div className="toolbar-actions"><button className="quick-action primary">▤ استلام بضاعة</button><button className="quick-action">سجل الحركة</button></div></div>
        <div className="table-wrap"><table><thead><tr><th>المنتج</th><th>الحالة</th><th>المتوفر</th><th>المستوى</th><th>SKU</th></tr></thead><tbody>
          {products.map((product) => {
            const stock = product.totalInventory ?? 0;
            return <tr key={product.id}><td><div className="product-name"><strong>{product.title}</strong><span>{product.vendor || product.productType}</span></div></td><td><span className={`inventory ${inventoryTone(stock)}`}>{stock <= 0 ? "OUT" : stock <= 5 ? "LOW" : "OK"}</span></td><td>{stock}</td><td><div className="inventory-progress"><span style={{ width: `${Math.max(3, (stock / maxStock) * 100)}%` }} /></div></td><td>{product.variants.nodes[0]?.sku || "—"}</td></tr>;
          })}
          {!products.length ? <tr><td colSpan={5} className="empty-table">لا توجد بيانات مخزون متاحة.</td></tr> : null}
        </tbody></table></div>
      </section>
    </div>
  );
}

function CustomersView({ customers }: { customers: AdminCustomer[] }) {
  const spent = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);
  return (
    <div className="customers-layout">
      <section className="summary-strip">
        <Summary label="العملاء" value={String(customers.length)} />
        <Summary label="VIP" value={String(customers.filter((c) => c.segment === "VIP").length)} />
        <Summary label="عملاء عائدون" value={String(customers.filter((c) => c.segment === "RETURNING").length)} />
        <Summary label="إجمالي الإنفاق" value={money(spent)} />
      </section>
      <section className="panel products-panel">
        <div className="section-toolbar"><div><span className="eyebrow">CUSTOMER CRM</span><h2>العملاء</h2></div><button className="quick-action">تصدير CSV</button></div>
        <div className="table-wrap"><table><thead><tr><th>العميل</th><th>الشريحة</th><th>الطلبات</th><th>إجمالي الإنفاق</th><th>آخر طلب</th></tr></thead><tbody>
          {customers.map((customer) => <tr key={customer.id}><td><div className="product-name"><strong>{customer.name}</strong><span>{customer.phone}</span></div></td><td><span className={`customer-segment ${customer.segment}`}>{customer.segment}</span></td><td>{customer.orders}</td><td>{money(customer.totalSpent)}</td><td>{formatDate(customer.lastOrder)}</td></tr>)}
          {!customers.length ? <tr><td colSpan={5} className="empty-table">لا توجد بيانات عملاء متاحة أو أن صلاحية read_customers غير مفعلة.</td></tr> : null}
        </tbody></table></div>
      </section>
    </div>
  );
}

function Metric({ label, value, detail, danger = false }: { label: string; value: string; detail: string; danger?: boolean }) {
  return <article className={danger ? "metric-card danger-metric" : "metric-card"}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <article className="summary-card"><span>{label}</span><strong>{value}</strong></article>;
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return <div className="status-row"><span>{label}</span><strong className={ok ? "pill success" : "pill danger"}>{ok ? "جاهز" : "غير مضبوط"}</strong></div>;
}

function OrdersTable({ orders }: { orders: AdminOrder[] }) {
  return (
    <div className="table-wrap"><table><thead><tr><th>الطلب</th><th>العميل</th><th>الإجمالي</th><th>الدفع</th><th>الحالة</th><th>الوقت</th></tr></thead><tbody>
      {orders.map((order) => <tr key={order.id}><td><strong>{order.name}</strong></td><td><div className="product-name"><strong>{order.customer}</strong><span>{order.phone}</span></div></td><td>{money(order.total)}</td><td>{order.payment}</td><td><span className={`pill order-status ${order.status}`}>{ORDER_LABELS[order.status]}</span></td><td>{formatTime(order.createdAt)}</td></tr>)}
      {!orders.length ? <tr><td colSpan={6} className="empty-table">لا توجد طلبات متاحة أو أن صلاحية read_orders غير مفعلة.</td></tr> : null}
    </tbody></table></div>
  );
}

function ProductTable({ products }: { products: AdminProduct[] }) {
  return (
    <div className="table-wrap"><table><thead><tr><th>المنتج</th><th>الحالة</th><th>السعر</th><th>المخزون</th><th>Variants</th><th>آخر تحديث</th></tr></thead><tbody>
      {products.length ? products.map((product) => <tr key={product.id}><td><div className="product-name"><strong>{product.title}</strong><span>{product.vendor || product.productType || product.handle}</span></div></td><td><span className={product.status === "ACTIVE" ? "pill success" : "pill muted"}>{product.status}</span></td><td>{money(product.minPrice)}</td><td><span className={`inventory ${inventoryTone(product.totalInventory)}`}>{product.totalInventory ?? "—"}</span></td><td>{product.variantsCount}</td><td>{formatDate(product.updatedAt)}</td></tr>) : <tr><td colSpan={6} className="empty-table">لا توجد منتجات لعرضها.</td></tr>}
    </tbody></table></div>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
