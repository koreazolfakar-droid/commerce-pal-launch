import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  Download,
  Package,
  Plus,
  ShoppingBag,
  TriangleAlert,
  UserRoundCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";

import { OrdersTrendCard, RevenueChartCard } from "@/dashboard/components/DashboardCharts";
import { DashboardErrorState, DashboardSkeleton } from "@/dashboard/components/DashboardStates";
import {
  getDashboardOverview,
  getDefaultDashboardRange,
} from "@/dashboard/services/dashboardService";
import type {
  DashboardDateRange,
  DashboardOverview,
  DashboardTrend,
} from "@/dashboard/types/dashboard";
import { useDashboardLanguage } from "@/lib/dashboardI18n";
import { formatPrice } from "@/lib/productPricing";

function escapeCsv(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function exportDashboardCsv(data: DashboardOverview) {
  const rows = [
    ["Space Call Dashboard Report"],
    ["Range", data.dateRange.start, data.dateRange.end],
    [],
    ["Metric", "Value"],
    ["Revenue", data.stats.revenue],
    ["Orders", data.stats.orders],
    ["Customers", data.stats.customers],
    ["Products", data.stats.products],
    ["Average Order Value", data.stats.averageOrderValue],
    ["Returning Customer Rate", `${data.stats.returningCustomerRate.toFixed(2)}%`],
    ["Low Stock Alerts", data.stats.lowStockAlerts],
    [],
    ["Recent Orders"],
    ["Order", "Customer", "Item", "Total", "Currency", "Status", "Date"],
    ...data.recentOrders.map((order) => [
      `SC${order.orderNumber}`,
      order.customer,
      order.item,
      order.total,
      order.currency,
      order.status,
      order.date,
    ]),
  ];

  const csv = rows.map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `space-call-dashboard-${data.dateRange.start}-${data.dateRange.end}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function TrendBadge({ trend }: { trend: DashboardTrend }) {
  if (trend.value === null) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }

  const positive = trend.direction === "up";
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  const className = positive
    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : trend.direction === "down"
      ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
      : "bg-muted text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${className}`}
    >
      <Icon className="size-3" />
      {Math.abs(trend.value).toFixed(1)}%
    </span>
  );
}

function KpiCard({
  label,
  value,
  detail,
  trend,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  trend?: DashboardTrend;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground">{value}</p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/8 text-primary">
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-3">
        <span className="truncate text-[10px] text-muted-foreground">{detail}</span>
        {trend ? <TrendBadge trend={trend} /> : null}
      </div>
    </article>
  );
}

function statusClasses(status: string) {
  if (status === "delivered") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "cancelled") return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  if (status === "shipped") return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
  if (status === "processing" || status === "confirmed") {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "bg-muted text-muted-foreground";
}

function inventoryLabel(key: string, language: "ar" | "en") {
  const labels: Record<string, { ar: string; en: string }> = {
    in_stock: { ar: "متوفر", en: "In stock" },
    low_stock: { ar: "منخفض", en: "Low stock" },
    out_of_stock: { ar: "نافد", en: "Out of stock" },
    on_order: { ar: "قيد الطلب", en: "On order" },
  };
  return labels[key]?.[language] ?? key;
}

export function TablerDashboardOverview() {
  const { language, text } = useDashboardLanguage();
  const [range, setRange] = useState<DashboardDateRange>(() => getDefaultDashboardRange());

  const validRange = useMemo(() => {
    if (!range.start || !range.end) return getDefaultDashboardRange();
    return range.start <= range.end ? range : { start: range.end, end: range.start };
  }, [range]);

  const query = useQuery({
    queryKey: ["dashboard", "tabler-overview", validRange.start, validRange.end],
    queryFn: () => getDashboardOverview(validRange),
    staleTime: 30_000,
    retry: 1,
  });

  if (query.isError) {
    return (
      <DashboardErrorState
        message={text("تعذّر تحميل بيانات لوحة التحكم.", "Unable to load dashboard data.")}
        retryLabel={text("إعادة المحاولة", "Retry")}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (query.isLoading || !query.data) return <DashboardSkeleton />;

  const data = query.data;
  const { stats } = data;
  const noChartData = text("لا توجد بيانات لهذه الفترة.", "No data for this period.");

  return (
    <section className="admin-page space-y-5">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {text("نظرة عامة", "Overview")}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {text("لوحة التحكم", "Dashboard")}
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {text(
              "نظرة سريعة على المبيعات والطلبات والعملاء والمخزون.",
              "A quick view of sales, orders, customers and inventory.",
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-border/70 bg-card px-3 text-[11px] font-semibold text-muted-foreground">
            <CalendarDays className="size-4" />
            <input
              type="date"
              value={range.start}
              onChange={(event) =>
                setRange((current) => ({ ...current, start: event.target.value }))
              }
              className="w-[118px] bg-transparent font-semibold text-foreground outline-none"
            />
            <span>–</span>
            <input
              type="date"
              value={range.end}
              onChange={(event) => setRange((current) => ({ ...current, end: event.target.value }))}
              className="w-[118px] bg-transparent font-semibold text-foreground outline-none"
            />
          </label>

          <button
            type="button"
            onClick={() => exportDashboardCsv(data)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border/70 bg-card px-3 text-[11px] font-bold text-foreground transition hover:bg-muted"
          >
            <Download className="size-4" />
            {text("تصدير", "Export")}
          </button>

          <Link
            to="/dashboard/products"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3.5 text-[11px] font-black text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="size-4" />
            {text("منتج جديد", "New product")}
          </Link>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-12">
        <article className="relative overflow-hidden rounded-xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6 xl:col-span-6">
          <div className="absolute inset-y-0 end-0 w-40 bg-[radial-gradient(circle_at_center,var(--color-primary)_0,transparent_68%)] opacity-[0.08]" />
          <div className="relative max-w-xl">
            <span className="inline-flex rounded-md bg-primary/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-primary">
              Space Call Commerce OS
            </span>
            <h2 className="mt-4 text-xl font-black tracking-tight sm:text-2xl">
              {text(
                "مرحباً بك في مركز إدارة Space Call",
                "Welcome to your Space Call command center",
              )}
            </h2>
            <p className="mt-2 max-w-lg text-xs leading-5 text-muted-foreground">
              {text(
                "تابع أهم الأرقام، راقب المخزون، وانتقل مباشرة إلى المنتجات أو الطلبات بدون ازدحام بصري.",
                "Track the numbers that matter, watch inventory, and jump directly into products or orders without visual clutter.",
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/dashboard/orders"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/70 bg-background px-3 text-[11px] font-bold hover:bg-muted"
              >
                <ShoppingBag className="size-4" /> {text("عرض الطلبات", "View orders")}
              </Link>
              <Link
                to="/dashboard/inventory"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/70 bg-background px-3 text-[11px] font-bold hover:bg-muted"
              >
                <Boxes className="size-4" /> {text("إدارة المخزون", "Manage inventory")}
              </Link>
            </div>
          </div>
        </article>

        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-6">
          <KpiCard
            label={text("إجمالي المبيعات", "Total sales")}
            value={formatPrice(stats.revenue, data.currency)}
            detail={text("مقارنة بالفترة السابقة", "vs previous period")}
            trend={stats.revenueTrend}
            icon={<WalletCards className="size-5" />}
          />
          <KpiCard
            label={text("الطلبات", "Orders")}
            value={stats.orders.toLocaleString()}
            detail={text("خلال الفترة المحددة", "in selected period")}
            trend={stats.ordersTrend}
            icon={<ShoppingBag className="size-5" />}
          />
          <KpiCard
            label={text("العملاء", "Customers")}
            value={stats.customers.toLocaleString()}
            detail={text("عملاء المتجر", "store customers")}
            trend={stats.customersTrend}
            icon={<UsersRound className="size-5" />}
          />
          <KpiCard
            label={text("المنتجات", "Products")}
            value={stats.products.toLocaleString()}
            detail={text("الكتالوج الحالي", "current catalog")}
            trend={stats.productsTrend}
            icon={<Package className="size-5" />}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={text("متوسط الطلب", "Average order")}
          value={formatPrice(stats.averageOrderValue, data.currency)}
          detail={text("متوسط الفترة", "period average")}
          icon={<WalletCards className="size-5" />}
        />
        <KpiCard
          label={text("العملاء العائدون", "Returning customers")}
          value={`${stats.returningCustomerRate.toFixed(1)}%`}
          detail={text("من عملاء الفترة", "of period customers")}
          icon={<UserRoundCheck className="size-5" />}
        />
        <KpiCard
          label={text("تنبيهات المخزون", "Low stock alerts")}
          value={stats.lowStockAlerts.toLocaleString()}
          detail={text("عناصر تحتاج انتباه", "items need attention")}
          icon={<TriangleAlert className="size-5" />}
        />
        <KpiCard
          label={text("معدل التحويل", "Conversion rate")}
          value={stats.conversionRate === null ? "—" : `${stats.conversionRate.toFixed(1)}%`}
          detail={text("حسب مصدر التحليلات", "from analytics source")}
          icon={<ArrowUpRight className="size-5" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <RevenueChartCard
            data={data.revenue}
            total={stats.revenue}
            currency={data.currency}
            trend={stats.revenueTrend}
            emptyLabel={noChartData}
            language={language}
          />
        </div>
        <div className="xl:col-span-5">
          <OrdersTrendCard
            data={data.orderTrend}
            total={stats.orders}
            trend={stats.ordersTrend}
            emptyLabel={noChartData}
            language={language}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <article className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] xl:col-span-8">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5">
            <div>
              <h3 className="text-sm font-black">{text("الطلبات الأخيرة", "Recent orders")}</h3>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {text("آخر نشاط للطلبات", "Latest order activity")}
              </p>
            </div>
            <Link
              to="/dashboard/orders"
              className="text-[11px] font-bold text-primary hover:underline"
            >
              {text("عرض الكل", "View all")}
            </Link>
          </div>

          {data.recentOrders.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground">
              {text("لا توجد طلبات حديثة بعد.", "No recent orders yet.")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-start">
                <thead className="bg-muted/25 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{text("الطلب", "Order")}</th>
                    <th className="px-3 py-3">{text("العميل", "Customer")}</th>
                    <th className="px-3 py-3">{text("العنصر", "Item")}</th>
                    <th className="px-3 py-3">{text("الحالة", "Status")}</th>
                    <th className="px-4 py-3 text-end">{text("الإجمالي", "Total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.slice(0, 8).map((order) => (
                    <tr key={order.id} className="border-t border-border/50 text-xs">
                      <td className="px-4 py-3.5 font-black">SC{order.orderNumber}</td>
                      <td className="px-3 py-3.5">
                        <p className="font-bold">{order.customer}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{order.date}</p>
                      </td>
                      <td className="max-w-52 truncate px-3 py-3.5 text-muted-foreground">
                        {order.item}
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClasses(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-end font-black">
                        {formatPrice(order.total, order.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <div className="space-y-4 xl:col-span-4">
          <article className="rounded-xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black">{text("حالة المخزون", "Inventory status")}</h3>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {text("توزيع عناصر المخزون", "Inventory distribution")}
                </p>
              </div>
              <Boxes className="size-5 text-muted-foreground" />
            </div>
            <div className="mt-4 space-y-3">
              {data.inventory.map((item) => (
                <div key={item.key}>
                  <div className="mb-1.5 flex items-center justify-between text-[11px]">
                    <span className="font-semibold">{inventoryLabel(item.key, language)}</span>
                    <span className="font-black">{item.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(0, Math.min(100, item.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black">{text("أفضل المنتجات", "Top products")}</h3>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {text("حسب الأداء في الفترة", "By period performance")}
                </p>
              </div>
              <Package className="size-5 text-muted-foreground" />
            </div>
            <div className="mt-4 divide-y divide-border/50">
              {data.topProducts.length === 0 ? (
                <p className="py-5 text-center text-[11px] text-muted-foreground">
                  {text("لا توجد بيانات منتجات بعد.", "No product data yet.")}
                </p>
              ) : (
                data.topProducts.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-border/60 bg-muted/40">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <Package className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold">{product.name}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {product.unitsSold} {text("مباعة", "sold")}
                      </p>
                    </div>
                    <span className="text-[11px] font-black">
                      {formatPrice(product.revenue, data.currency)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
