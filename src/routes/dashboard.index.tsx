import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  DollarSign,
  ExternalLink,
  Package,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/productPricing";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

type RecentOrder = {
  id: string;
  order_number: number;
  customer_name: string;
  status: string;
  payment_status: string;
  total: number;
  currency: string;
  created_at: string;
};

type StatusCounts = Record<string, number>;

async function loadCommerceStats() {
  const [ordersResult, productsResult, lowStockResult, pendingResult, recentResult] = await Promise.all([
    supabase.from("store_orders" as never).select("total,status,currency"),
    supabase.from("store_products" as never).select("id", { count: "exact", head: true }),
    supabase
      .from("store_product_variants" as never)
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("track_inventory", true)
      .lte("stock_quantity", 5),
    supabase
      .from("store_orders" as never)
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("store_orders" as never)
      .select("id,order_number,customer_name,status,payment_status,total,currency,created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const orders = (ordersResult.data ?? []) as Array<{
    total: number | string;
    status: string;
    currency: string;
  }>;
  const activeOrders = orders.filter((order) => order.status !== "cancelled");
  const revenue = activeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const orderCount = orders.length;
  const aov = activeOrders.length ? revenue / activeOrders.length : 0;
  const currency = activeOrders[0]?.currency || "USD";
  const statusCounts = orders.reduce<StatusCounts>((counts, order) => {
    counts[order.status] = (counts[order.status] ?? 0) + 1;
    return counts;
  }, {});

  return {
    revenue,
    orderCount,
    aov,
    currency,
    activeOrderCount: activeOrders.length,
    statusCounts,
    products: productsResult.error ? null : (productsResult.count ?? 0),
    lowStock: lowStockResult.error ? null : (lowStockResult.count ?? 0),
    pending: pendingResult.error ? null : (pendingResult.count ?? 0),
    recentOrders: recentResult.error ? [] : ((recentResult.data ?? []) as RecentOrder[]),
  };
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof ShoppingBag;
}) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.02)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-black tracking-tight text-foreground">{value}</p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted/60 text-foreground">
          <Icon className="size-4" strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-3 text-[10px] leading-4 text-muted-foreground">{helper}</p>
    </article>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "قيد الانتظار",
    confirmed: "مؤكد",
    processing: "قيد التجهيز",
    shipped: "تم الشحن",
    delivered: "تم التسليم",
    cancelled: "ملغي",
  };
  return labels[status] ?? status;
}

function OrderStatusCard({ counts }: { counts: StatusCounts }) {
  const entries = [
    { key: "pending", label: "انتظار", value: counts.pending ?? 0, color: "var(--chart-1)" },
    {
      key: "processing",
      label: "تجهيز",
      value: (counts.confirmed ?? 0) + (counts.processing ?? 0),
      color: "var(--chart-2)",
    },
    {
      key: "shipped",
      label: "شحن",
      value: counts.shipped ?? 0,
      color: "var(--chart-4)",
    },
    {
      key: "delivered",
      label: "تسليم",
      value: counts.delivered ?? 0,
      color: "var(--chart-3)",
    },
    {
      key: "cancelled",
      label: "ملغي",
      value: counts.cancelled ?? 0,
      color: "var(--chart-5)",
    },
  ].filter((entry) => entry.value > 0);

  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  let cursor = 0;
  const slices = entries.map((entry) => {
    const start = cursor;
    const end = total ? cursor + (entry.value / total) * 100 : cursor;
    cursor = end;
    return `${entry.color} ${start}% ${end}%`;
  });
  const background = total
    ? `conic-gradient(${slices.join(", ")})`
    : "conic-gradient(var(--muted) 0 100%)";

  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.02)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">حالة الطلبات</p>
          <p className="mt-1 text-xs font-black text-foreground">Order statistics</p>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground">{total} طلب</span>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <div
          className="relative grid size-24 shrink-0 place-items-center rounded-full"
          style={{ background }}
          aria-label={`توزيع حالات ${total} طلب`}
        >
          <div className="grid size-14 place-items-center rounded-full bg-card shadow-sm">
            <span className="text-lg font-black text-foreground">{total}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {entries.length ? (
            entries.slice(0, 4).map((entry) => (
              <div key={entry.key} className="flex items-center justify-between gap-2 text-[10px]">
                <span className="inline-flex min-w-0 items-center gap-2 text-muted-foreground">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: entry.color }} />
                  <span className="truncate">{entry.label}</span>
                </span>
                <span className="font-black text-foreground">{entry.value}</span>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-muted-foreground">لا توجد طلبات بعد.</p>
          )}
        </div>
      </div>
    </article>
  );
}

function DashboardOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "commerce-overview"],
    queryFn: loadCommerceStats,
    staleTime: 15_000,
    retry: false,
  });

  const loadingValue = isLoading ? "…" : null;

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">Commerce Overview</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-[28px]">
            نظرة عامة على Space Call
          </h1>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            المبيعات والطلبات والمخزون من نظام Space Call الأصلي على Supabase.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border/70 bg-card px-3.5 text-xs font-bold transition hover:bg-muted"
          >
            <ExternalLink className="size-3.5" /> معاينة المتجر
          </a>
          <Link
            to="/dashboard/orders"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-foreground px-3.5 text-xs font-bold text-background transition hover:opacity-90"
          >
            <ShoppingBag className="size-3.5" /> الطلبات
          </Link>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.15fr_1fr_0.72fr_0.72fr]">
        <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 p-5 text-white shadow-[0_14px_35px_-22px_rgb(15_23_42/0.85)] dark:bg-slate-900">
          <div className="absolute -left-10 -top-16 size-36 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold text-white/60">إجمالي المبيعات</p>
                <p className="mt-3 text-3xl font-black tracking-tight">
                  {loadingValue ?? formatPrice(data?.revenue ?? 0, data?.currency ?? "USD")}
                </p>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-white/10 text-white">
                <DollarSign className="size-4" />
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
              <div>
                <p className="text-[10px] text-white/50">متوسط الطلب</p>
                <p className="mt-1 text-sm font-black">
                  {loadingValue ?? formatPrice(data?.aov ?? 0, data?.currency ?? "USD")}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/50">طلبات فعّالة</p>
                <p className="mt-1 text-sm font-black">{loadingValue ?? String(data?.activeOrderCount ?? 0)}</p>
              </div>
            </div>
          </div>
        </article>

        <OrderStatusCard counts={data?.statusCounts ?? {}} />

        <MetricCard
          label="الطلبات"
          value={loadingValue ?? String(data?.orderCount ?? 0)}
          helper={`${data?.pending ?? 0} طلب قيد الانتظار`}
          icon={ShoppingBag}
        />
        <MetricCard
          label="المنتجات"
          value={loadingValue ?? String(data?.products ?? 0)}
          helper="إجمالي المنتجات في الكتالوج"
          icon={Package}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.7fr)]">
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.02)]">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-sm font-black text-foreground">آخر الطلبات</h2>
              <p className="mt-1 text-[10px] text-muted-foreground">أحدث عمليات الشراء المسجلة في المتجر.</p>
            </div>
            <Link
              to="/dashboard/orders"
              className="text-[10px] font-bold text-muted-foreground hover:text-foreground"
            >
              عرض الكل
            </Link>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">جاري تحميل الطلبات…</div>
          ) : !data?.recentOrders.length ? (
            <div className="p-8 text-center">
              <ShoppingBag className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-xs font-bold text-foreground">لا توجد طلبات بعد</p>
              <p className="mt-1 text-[10px] text-muted-foreground">ستظهر الطلبات الجديدة هنا تلقائيًا.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-right">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-[10px] font-semibold text-muted-foreground">
                    <th className="px-5 py-3">الطلب</th>
                    <th className="px-4 py-3">العميل</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3">الإجمالي</th>
                    <th className="px-5 py-3 text-left">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border/50 last:border-0">
                      <td className="px-5 py-4 text-xs font-black text-foreground">#{order.order_number}</td>
                      <td className="px-4 py-4 text-[11px] font-semibold text-foreground">{order.customer_name}</td>
                      <td className="px-4 py-4 text-[10px] font-semibold text-muted-foreground">
                        {statusLabel(order.status)}
                      </td>
                      <td className="px-4 py-4 text-[11px] font-black text-foreground">
                        {formatPrice(order.total, order.currency)}
                      </td>
                      <td className="px-5 py-4 text-left">
                        <Link
                          to="/dashboard/orders"
                          className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-border/70 px-2.5 text-[10px] font-bold text-foreground transition hover:bg-muted"
                        >
                          فتح <ArrowLeft className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.02)]">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h2 className="text-sm font-black text-foreground">تنبيهات المخزون</h2>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Low stock monitoring</p>
              </div>
            </div>
            <p className="mt-5 text-3xl font-black tracking-tight text-foreground">
              {loadingValue ?? String(data?.lowStock ?? 0)}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">Variants لديها 5 قطع أو أقل.</p>
            <Link
              to="/dashboard/products"
              className="mt-4 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-bold transition hover:bg-muted"
            >
              <Boxes className="size-3.5" /> إدارة المخزون
            </Link>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.02)]">
            <h2 className="text-sm font-black text-foreground">إجراءات سريعة</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                to="/dashboard/products"
                className="rounded-xl border border-border/60 bg-muted/20 p-3 transition hover:bg-muted/45"
              >
                <Package className="size-4" />
                <p className="mt-2 text-[10px] font-bold">المنتجات</p>
              </Link>
              <Link
                to="/dashboard/orders"
                className="rounded-xl border border-border/60 bg-muted/20 p-3 transition hover:bg-muted/45"
              >
                <ShoppingBag className="size-4" />
                <p className="mt-2 text-[10px] font-bold">الطلبات</p>
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
