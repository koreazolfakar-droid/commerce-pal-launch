import { useLanguage } from "@/dashboard/i18n";
import {
  Activity,
  BarChart3,
  Boxes,
  Package,
  RefreshCw,
  ShoppingBag,
  Tags,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const money = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

const integer = (value: number) => value.toLocaleString("en-US");

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
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium text-slate-400">{t(label)}</div>
          <div className="mt-2 text-[25px] font-bold tracking-[-.04em] text-[#14203a]">{value}</div>
          <div className="mt-1 text-[10px] text-slate-400">{t(detail)}</div>
        </div>
        <div className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-indigo-50 text-[#5968ea]">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="text-[13px] font-bold text-[#14203a]">{t(title)}</div>
        {subtitle ? <div className="mt-0.5 text-[11px] text-slate-400">{t(subtitle)}</div> : null}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-10 text-center text-[11px] text-slate-400">{children}</div>;
}

export default function DashboardHomePage({ analyticsView = false }: { analyticsView?: boolean }) {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [snapshot, setSnapshot] = useState<DashboardHomeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    try {
      const next = await loadDashboardHomeSnapshot();
      setSnapshot(next);
      setError("");
      if (manual) toast.success("Dashboard refreshed from Supabase.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to load dashboard.";
      setError(message);
      if (manual) toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const rangeLabel = useMemo(() => {
    if (!snapshot) return "Last 30 days";
    const start = new Date(snapshot.periodStart).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const end = new Date(snapshot.periodEnd).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${start} – ${end}`;
  }, [snapshot]);

  if (loading) {
    return (
      <div className="grid min-h-[480px] place-items-center rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
          <RefreshCw className="size-5 animate-spin text-[#5968ea]" />
          {t("Loading live dashboard data…")}
        </div>
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6">
        <div className="text-sm font-bold text-rose-700">
          {t("Dashboard data could not be loaded.")}
        </div>
        <div className="mt-1 text-xs text-rose-600">{error}</div>
        <button
          onClick={() => void load(true)}
          className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-[11px] font-bold text-white"
        >
          {t("Retry")}
        </button>
      </div>
    );
  }

  if (!snapshot) return null;

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            <span className="size-1.5 rounded-full bg-[#6a70e7]" />
            {t("Live Supabase overview")}
          </div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">
            {analyticsView ? t("Analytics") : t("Dashboard")}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {t("Real catalog, inventory, customer and order data. No demo business metrics.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold text-slate-500">
            {rangeLabel}
          </div>
          <button
            onClick={() => void load(true)}
            disabled={refreshing}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#14203a] px-4 text-[11px] font-bold text-white disabled:opacity-60"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {t("Refresh")}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          detail="Created in the last 30 days"
        />
        <KpiCard
          icon={Users}
          label={t("Customers")}
          value={integer(snapshot.customerCount)}
          detail="Real customer records in Supabase"
        />
        <KpiCard
          icon={Package}
          label={t("Products")}
          value={integer(snapshot.productCount)}
          detail={`${integer(snapshot.activeProductCount)} active`}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel
          title={t("Revenue trend")}
          subtitle={t("Completed sales from store_sales · last 30 days")}
        >
          <div className="h-[280px] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snapshot.trend} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashboardRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="currentColor" stopOpacity={0.02} />
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
                  stroke="currentColor"
                  fill="url(#dashboardRevenueFill)"
                  className="text-[#5968ea]"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title={t("Orders trend")} subtitle={t("Last 30 days from store_orders")}>
          <div className="h-[280px] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={snapshot.trend} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
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
                  fill="currentColor"
                  className="text-[#7c6ee6]"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel title={t("Recent orders")} subtitle={t("Latest real orders")}>
          {snapshot.recentOrders.length ? (
            <div className="divide-y divide-slate-100">
              {snapshot.recentOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 text-start hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold text-slate-700">
                      #{order.orderNumber} · {order.customer}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400">
                      {new Date(order.createdAt).toLocaleString()} · {order.status} ·{" "}
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
            <EmptyState>
              {t("No orders exist yet. The dashboard intentionally shows a truthful empty state.")}
            </EmptyState>
          )}
        </Panel>

        <div className="grid gap-4">
          <Panel title={t("Top selling products")} subtitle={t("Completed sales · last 30 days")}>
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

          <Panel title={t("Top brands")} subtitle={t("By completed sale value · last 30 days")}>
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

      {error ? (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-[11px] text-amber-700">
          {t("Last refresh warning:")} {error}
        </div>
      ) : null}
    </div>
  );
}
