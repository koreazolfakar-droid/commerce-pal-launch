import DashboardWorkTools from "@/dashboard/components/layout/DashboardWorkTools";
import { PageTitle } from "@/dashboard/components/layout/PageTitle";
import { downloadCsv } from "@/dashboard/lib/exportCsv";
import { useLanguage } from "@/dashboard/i18n";
import {
  Activity,
  ChevronDown,
  Download,
  Inbox,
  BarChart3,
  Boxes,
  Package,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  Tags,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { loadDashboardHomeSnapshot, type DashboardHomeSnapshot } from "@/dashboard/data/home";

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  detail: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="dashboard-panel dashboard-kpi">
      <div className="dashboard-kpi-top">
        <span className="dashboard-kpi-label">{t(label)}</span>
        <span className="dashboard-kpi-icon">
          <Icon className="size-5" />
        </span>
      </div>
      <div className="dashboard-kpi-value">{value}</div>
      <div className="dashboard-kpi-detail">{t(detail)}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className={`dashboard-panel ${className}`}>
      <div className="dashboard-panel-heading">
        <h2>{t(title)}</h2>
        {subtitle ? <p>{t(subtitle)}</p> : null}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-empty-state">
      <Inbox className="size-6" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export default function DashboardHomePage({ analyticsView = false }: { analyticsView?: boolean }) {
  return (
    <div className="dashboard-home-page space-y-5">
      <PageTitle eyebrow="Space Call" title={analyticsView ? "Analytics" : "Dashboard"} />
      {!analyticsView && <DashboardWorkTools />}
      <DashboardReport analyticsView={analyticsView} />
    </div>
  );
}

export function DashboardReport({ analyticsView = false }: { analyticsView?: boolean }) {
  const { t, lang } = useLanguage();
  const locale = lang === "ar" ? "ar" : "en-US";
  const money = (value: number, currency = "USD") =>
    new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(
      value,
    );
  const integer = (value: number) => value.toLocaleString(locale);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  // Keep report labels tied to the data that actually loaded, including after a failed range change.
  const [snapshotPeriod, setSnapshotPeriod] = useState<7 | 30 | 90>(30);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const requestId = useRef(0);
  const periodLabel = t(
    snapshotPeriod === 7 ? "Last 7 days" : snapshotPeriod === 90 ? "Last 90 days" : "Last 30 days",
  );
  const [, navigate] = useLocation();
  const [snapshot, setSnapshot] = useState<DashboardHomeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (manual = false) => {
      const request = ++requestId.current;
      if (manual) setRefreshing(true);
      else setLoading(true);
      try {
        const next = await loadDashboardHomeSnapshot(period);
        if (request !== requestId.current) return;
        setUpdatedAt(new Date());
        setSnapshot(next);
        setSnapshotPeriod(period);
        setError("");
        if (manual) toast.success(t("Dashboard refreshed."));
      } catch (cause) {
        if (request !== requestId.current) return;
        const message = cause instanceof Error ? cause.message : "Unable to load dashboard.";
        setError(message);
        if (manual) toast.error(message);
      } finally {
        if (request === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [period, t],
  );

  useEffect(() => {
    void load(false);
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const rangeLabel = useMemo(() => {
    if (!snapshot) return "Last 30 days";
    const start = new Date(snapshot.periodStart).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
    const end = new Date(snapshot.periodEnd).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${start} – ${end}`;
  }, [snapshot, locale]);

  if (loading && !snapshot) {
    return (
      <div className="space-y-5" aria-busy="true">
        <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="size-4 animate-spin text-primary" />
          {t("Loading live dashboard data…")}
        </div>
        <div aria-hidden="true" className="animate-pulse space-y-5">
          <div className="h-9 w-48 max-w-full rounded-lg bg-muted" />
          <div className="dashboard-overview-metrics grid grid-cols-2 gap-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="dashboard-panel space-y-5 p-5">
                <div className="h-3 w-24 max-w-full rounded bg-muted" />
                <div className="h-8 w-32 max-w-full rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
              </div>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="dashboard-panel h-64 bg-card" />
            <div className="dashboard-panel h-64 bg-card" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-rose-100 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950/30"
      >
        <div className="text-sm font-bold text-rose-700">
          {t("Dashboard data could not be loaded.")}
        </div>
        <div className="mt-1 text-xs text-rose-600">{error}</div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          aria-busy={refreshing}
          className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50"
        >
          {refreshing ? t("Loading live dashboard data…") : t("Retry")}
        </button>
      </div>
    );
  }

  if (!snapshot) return null;

  return (
    <div aria-busy={loading || refreshing}>
      <div className="dashboard-overview-header dashboard-home-header">
        <h2 className="text-lg font-semibold text-foreground">{t("Store performance")}</h2>
        <div className="dashboard-overview-tools">
          <label>
            <span className="sr-only">{t("Report period")}</span>
            <select
              aria-label={t("Report period")}
              value={period}
              onChange={(event) => setPeriod(Number(event.target.value) as 7 | 30 | 90)}
              disabled={refreshing}
            >
              <option value={7}>{t("Last 7 days")}</option>
              <option value={30}>{t("Last 30 days")}</option>
              <option value={90}>{t("Last 90 days")}</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading || refreshing}
            className="dashboard-button"
          >
            <RefreshCw
              aria-hidden="true"
              className={`size-4 ${loading || refreshing ? "animate-spin" : ""}`}
            />
            {t("Refresh")}
          </button>
          <button
            type="button"
            disabled={loading || refreshing || period !== snapshotPeriod || Boolean(error)}
            className="dashboard-button dashboard-button-primary"
            onClick={() =>
              downloadCsv(`space-call-report-${snapshotPeriod}d.csv`, [
                ["Metric", "Value", "Period start", "Period end"],
                [
                  "Gross sales (USD)",
                  snapshot.totalSales,
                  snapshot.periodStart,
                  snapshot.periodEnd,
                ],
                [
                  "Orders in period",
                  snapshot.ordersLast30Days,
                  snapshot.periodStart,
                  snapshot.periodEnd,
                ],
                ["Customers (current)", snapshot.customerCount, "", ""],
                ["Products (current)", snapshot.productCount, "", ""],
                ["Units on hand (current)", snapshot.totalUnits, "", ""],
                ["Low-stock variants (current)", snapshot.lowStockVariants, "", ""],
                ["Out-of-stock variants (current)", snapshot.outOfStockVariants, "", ""],
              ])
            }
          >
            <Download className="size-4" />
            {t("Export report")}
          </button>
        </div>
      </div>
      {loading || refreshing ? (
        <div
          role="status"
          className="mb-3 rounded-xl border border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground"
        >
          {lang === "ar"
            ? "جارٍ تحديث التقرير… الأرقام المعروضة من آخر تحديث ناجح."
            : "Updating report… Showing the last successfully loaded figures."}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <div className="min-w-0 flex-1 break-words">
            <p className="font-semibold">
              {lang === "ar"
                ? "تعذّر تحديث التقرير. الأرقام أدناه من آخر تحديث ناجح."
                : "Report update failed. Figures below are from the last successful update."}
            </p>
            <p className="mt-1">{error}</p>
          </div>
          <button
            type="button"
            className="dashboard-button shrink-0"
            disabled={loading || refreshing}
            onClick={() => void load(true)}
          >
            {t("Retry")}
          </button>
        </div>
      ) : null}
      <div className="dashboard-report-caption">
        <span>{rangeLabel}</span>
        <span aria-hidden="true">·</span>
        <span>
          {t("Sales and orders follow the selected period; catalog and stock show current totals.")}
        </span>
        {updatedAt && (
          <time dateTime={updatedAt.toISOString()}>
            {t(error ? "Last successful update" : "Updated")}{" "}
            {updatedAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
          </time>
        )}
      </div>

      <div className="dashboard-overview-metrics dashboard-home-primary-metrics grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          icon={BarChart3}
          label={t("Gross sales")}
          value={money(snapshot.totalSales)}
          detail="Completed paid sales · full refunds excluded"
        />
        <KpiCard
          icon={ShoppingBag}
          label={t("Orders")}
          value={integer(snapshot.ordersLast30Days)}
          detail={periodLabel}
        />
        <KpiCard
          icon={Users}
          label={t("Customers")}
          value={integer(snapshot.customerCount)}
          detail="Registered customers"
        />
        <KpiCard
          icon={Package}
          label={t("Products")}
          value={integer(snapshot.productCount)}
          detail={`${integer(snapshot.activeProductCount)} ${t("Active")}`}
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        {!analyticsView && (
          <Panel title="Stock alerts" className="dashboard-attention-panel">
            {snapshot.lowStockVariants || snapshot.outOfStockVariants ? (
              <div className="dashboard-attention-list divide-y divide-slate-100">
                {[
                  {
                    label: "Out of stock",
                    value: snapshot.outOfStockVariants,
                    tone: "text-rose-600 bg-rose-50",
                  },
                  {
                    label: "Low stock",
                    value: snapshot.lowStockVariants,
                    tone: "text-amber-600 bg-amber-50",
                  },
                ]
                  .filter((row) => row.value > 0)
                  .map((row) => (
                    <button
                      key={row.label}
                      type="button"
                      onClick={() =>
                        navigate(
                          `/dashboard/inventory?attention=${row.label === "Out of stock" ? "out" : "low"}`,
                        )
                      }
                      className="dashboard-attention-row flex w-full items-center gap-3 px-5 py-3.5 text-start hover:bg-slate-50"
                    >
                      <span className={`grid size-8 place-items-center rounded-lg ${row.tone}`}>
                        <AlertTriangle className="size-4" />
                      </span>
                      <span className="dashboard-attention-label flex-1 text-[12px] font-semibold text-slate-700">
                        {t(row.label)}
                      </span>
                      <span className="dashboard-attention-value text-[13px] font-bold text-[#14203a]">
                        {integer(row.value)}
                      </span>
                    </button>
                  ))}
              </div>
            ) : (
              <EmptyState>{t("No low-stock or out-of-stock variants.")}</EmptyState>
            )}
          </Panel>
        )}
        <Panel title={t("Recent orders")}>
          {snapshot.recentOrders.length ? (
            <div className="dashboard-recent-orders divide-y divide-slate-100">
              {snapshot.recentOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                  className="dashboard-recent-order-row grid w-full grid-cols-[minmax(0,1fr)_auto] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary items-center gap-4 px-5 py-4 text-start hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="dashboard-recent-order-title break-words text-[12px] font-bold text-slate-700">
                      #{order.orderNumber} · {order.customer}
                    </div>
                    <div className="mt-1 break-words text-[10px] text-slate-400">
                      {new Date(order.createdAt).toLocaleString(locale)} · {order.status} ·{" "}
                      {order.paymentStatus}
                    </div>
                  </div>
                  <div className="text-[12px] font-bold text-[#14203a]">
                    {money(order.total, order.currency || "USD")}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState>{t("No orders exist yet. New orders will appear here.")}</EmptyState>
          )}
        </Panel>
      </div>

      <details className="dashboard-panel dashboard-stock-summary mt-4">
        <summary>
          {t("Stock and catalog totals")}
          <ChevronDown size={18} aria-hidden="true" />
        </summary>
        <div className="dashboard-overview-metrics dashboard-overview-secondary dashboard-home-secondary-metrics grid grid-cols-2 gap-4 xl:grid-cols-4">
          <KpiCard
            icon={Boxes}
            label={t("Units on hand")}
            value={integer(snapshot.totalUnits)}
            detail="Tracked active variants"
          />
          <KpiCard
            icon={Activity}
            label={t("Low stock")}
            value={integer(snapshot.lowStockVariants)}
            detail="Tracked variants with 1–10 units"
          />
          <KpiCard
            icon={Package}
            label={t("Out of stock")}
            value={integer(snapshot.outOfStockVariants)}
            detail="Tracked active variants at zero"
          />
          <KpiCard
            icon={Tags}
            label={t("Visible brands")}
            value={integer(snapshot.visibleBrandCount)}
            detail="Brands currently visible"
          />
        </div>
      </details>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title={t("Revenue trend")} subtitle={`${t("Completed sales")} · ${periodLabel}`}>
          <div className="dashboard-chart h-[280px] p-4" dir="ltr">
            {snapshot.trend.some((point) => point.revenue > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={snapshot.trend}
                  margin={{ top: 10, right: 8, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="dashboardRevenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--dashboard-accent)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--dashboard-accent)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#eef1f6" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    minTickGap={28}
                  />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} />
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--dashboard-accent)"
                    fill="url(#dashboardRevenueFill)"
                    className="text-[#5968ea]"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState>{t("No sales in this period.")}</EmptyState>
            )}
          </div>
        </Panel>

        <Panel title={t("Orders trend")} subtitle={periodLabel}>
          <div className="dashboard-chart h-[280px] p-4" dir="ltr">
            {snapshot.trend.some((point) => point.orders > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={snapshot.trend}
                  margin={{ top: 10, right: 8, left: -10, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#eef1f6" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    minTickGap={28}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={10} />
                  <Tooltip />
                  <Bar
                    dataKey="orders"
                    fill="var(--dashboard-accent)"
                    className="text-[#7c6ee6]"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState>{t("No orders in this period.")}</EmptyState>
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel
          title={t("Top selling products")}
          subtitle={`${t("Completed sales")} · ${periodLabel}`}
        >
          {snapshot.topProducts.length ? (
            <div className="divide-y divide-slate-100 px-5">
              {snapshot.topProducts.map((product, index) => (
                <div
                  key={product.productId ?? product.title}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="w-4 text-center text-[11px] font-bold text-slate-400">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-bold text-slate-700">
                      {product.title}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400">
                      {product.quantity} {t("sold")}
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-slate-600">
                    {money(product.revenue)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>{t("No sales data yet.")}</EmptyState>
          )}
        </Panel>

        <Panel
          title={t("Top brands")}
          subtitle={`${t("By completed sale value")} · ${periodLabel}`}
        >
          {snapshot.topBrands.length ? (
            <div className="space-y-3 px-5 py-4">
              {snapshot.topBrands.map((brand) => (
                <div key={brand.brandId}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold text-slate-600">{brand.name}</span>
                    <span className="text-[10px] font-bold text-slate-500">{brand.share}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#5968ea]"
                      style={{ width: `${brand.share}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>{t("No brand sales data yet.")}</EmptyState>
          )}
        </Panel>
      </div>
    </div>
  );
}
