import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Box,
  Boxes,
  CreditCard,
  DollarSign,
  Package,
  ShoppingBag,
  UsersRound,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useDashboardLanguage } from "@/lib/dashboardI18n";
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

type StatusCounts = {
  pending?: number;
  confirmed?: number;
  processing?: number;
  shipped?: number;
  delivered?: number;
  cancelled?: number;
  [status: string]: number | undefined;
};

async function loadCommerceStats() {
  const [ordersResult, productsResult, lowStockResult, pendingResult, recentResult, customersResult] =
    await Promise.all([
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
        .limit(7),
      supabase.from("store_customers" as never).select("id", { count: "exact", head: true }),
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
    customers: customersResult.error ? null : (customersResult.count ?? 0),
    lowStock: lowStockResult.error ? null : (lowStockResult.count ?? 0),
    pending: pendingResult.error ? null : (pendingResult.count ?? 0),
    recentOrders: recentResult.error ? [] : ((recentResult.data ?? []) as RecentOrder[]),
  };
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />;
}

function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof ShoppingBag;
  loading: boolean;
}) {
  return (
    <article className="rounded-[12px] border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.025)]">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary/8 text-primary">
          <Icon className="size-4" strokeWidth={1.8} />
        </span>
        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
          Live
        </span>
      </div>
      <p className="mt-4 text-[10px] font-semibold text-muted-foreground">{label}</p>
      {loading ? (
        <SkeletonBlock className="mt-2 h-7 w-20" />
      ) : (
        <p className="mt-1 text-[25px] font-black tracking-tight text-foreground">{value}</p>
      )}
      <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-muted-foreground">{helper}</p>
    </article>
  );
}

function statusLabel(status: string, language: "ar" | "en") {
  const labels: Record<string, { ar: string; en: string }> = {
    pending: { ar: "قيد الانتظار", en: "Pending" },
    confirmed: { ar: "مؤكد", en: "Confirmed" },
    processing: { ar: "قيد التجهيز", en: "Processing" },
    shipped: { ar: "تم الشحن", en: "Shipped" },
    delivered: { ar: "مكتمل", en: "Completed" },
    cancelled: { ar: "ملغي", en: "Cancelled" },
  };
  return labels[status]?.[language] ?? status;
}

function paymentLabel(status: string, language: "ar" | "en") {
  const labels: Record<string, { ar: string; en: string }> = {
    paid: { ar: "مدفوع", en: "Paid" },
    pending: { ar: "معلّق", en: "Pending" },
    failed: { ar: "فشل", en: "Failed" },
    refunded: { ar: "مسترد", en: "Refunded" },
  };
  return labels[status]?.[language] ?? status;
}

function statusClass(status: string) {
  switch (status) {
    case "delivered":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "processing":
    case "confirmed":
    case "shipped":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "cancelled":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
    default:
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
}

function paymentClass(status: string) {
  switch (status) {
    case "paid":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "failed":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function OrderStatusCard({ counts, loading }: { counts: StatusCounts; loading: boolean }) {
  const { language, text } = useDashboardLanguage();
  const entries = [
    { key: "delivered", label: text("مكتمل", "Completed"), value: counts.delivered ?? 0, color: "var(--chart-2)" },
    { key: "processing", label: text("قيد التجهيز", "Processing"), value: (counts.confirmed ?? 0) + (counts.processing ?? 0), color: "var(--chart-1)" },
    { key: "pending", label: text("قيد الانتظار", "Pending"), value: counts.pending ?? 0, color: "var(--chart-4)" },
    { key: "cancelled", label: text("ملغي", "Cancelled"), value: counts.cancelled ?? 0, color: "var(--chart-5)" },
  ];

  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  let cursor = 0;
  const slices = entries
    .filter((entry) => entry.value > 0)
    .map((entry) => {
      const start = cursor;
      const end = total ? cursor + (entry.value / total) * 100 : cursor;
      cursor = end;
      return `${entry.color} ${start}% ${end}%`;
    });
  const background = total
    ? `conic-gradient(${slices.join(", ")})`
    : "conic-gradient(var(--muted) 0 100%)";

  return (
    <article className="rounded-[12px] border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.025)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground">{text("إحصائيات الطلبات", "Order statistics")}</p>
          <h2 className="mt-1 text-sm font-black text-foreground">{text("حالة الطلبات", "Order status")}</h2>
        </div>
        <span className="text-[9px] font-bold text-muted-foreground">{text("كل الطلبات", "All time")}</span>
      </div>

      <div className="mt-5 flex items-center gap-5">
        {loading ? (
          <SkeletonBlock className="size-28 shrink-0 rounded-full" />
        ) : (
          <div
            className="relative grid size-28 shrink-0 place-items-center rounded-full"
            style={{ background }}
            aria-label={language === "ar" ? `توزيع حالات ${total} طلب` : `Status distribution for ${total} orders`}
          >
            <div className="grid size-[66px] place-items-center rounded-full bg-card shadow-sm">
              <div className="text-center">
                <span className="block text-xl font-black text-foreground">{total}</span>
                <span className="text-[8px] font-semibold text-muted-foreground">{text("طلب", "Orders")}</span>
              </div>
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-2.5">
          {entries.map((entry) => (
            <div key={entry.key} className="flex items-center justify-between gap-3 text-[10px]">
              <span className="inline-flex min-w-0 items-center gap-2 text-muted-foreground">
                <span className="size-2 shrink-0 rounded-full" style={{ background: entry.color }} />
                <span className="truncate">{entry.label}</span>
              </span>
              <span className="font-black text-foreground">{loading ? "—" : entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function RevenueCard({
  revenue,
  aov,
  activeOrders,
  currency,
  loading,
}: {
  revenue: number;
  aov: number;
  activeOrders: number;
  currency: string;
  loading: boolean;
}) {
  const { text } = useDashboardLanguage();

  return (
    <article className="relative overflow-hidden rounded-[12px] border border-primary/20 bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--primary)/0.88)_58%,hsl(var(--primary)/0.72)_100%)] p-5 text-primary-foreground shadow-[0_8px_24px_-18px_hsl(var(--primary)/0.7)]">
      <div className="pointer-events-none absolute -end-10 -top-16 size-44 rounded-full border border-white/15" />
      <div className="pointer-events-none absolute -end-1 top-10 size-24 rounded-full border border-white/10" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold text-white/70">{text("إجمالي الإيرادات", "Total Revenue")}</p>
            {loading ? (
              <SkeletonBlock className="mt-3 h-9 w-40 bg-white/15" />
            ) : (
              <p className="mt-2 text-[31px] font-black tracking-tight">{formatPrice(revenue, currency)}</p>
            )}
          </div>
          <span className="grid size-10 place-items-center rounded-[10px] bg-white/12">
            <DollarSign className="size-[18px]" />
          </span>
        </div>

        <div className="mt-5 flex items-center gap-2 text-[9px] text-white/75">
          <span className="rounded-full bg-white/12 px-2 py-1 font-bold">{text("بيانات مباشرة", "Live data")}</span>
          <span>{text("من نظام التجارة الحالي", "From current commerce data")}</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/15 pt-4">
          <div>
            <p className="text-[9px] text-white/60">{text("متوسط قيمة الطلب", "Average order")}</p>
            <p className="mt-1 text-sm font-black">{loading ? "—" : formatPrice(aov, currency)}</p>
          </div>
          <div>
            <p className="text-[9px] text-white/60">{text("الطلبات الفعالة", "Active orders")}</p>
            <p className="mt-1 text-sm font-black">{loading ? "—" : activeOrders}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function DashboardOverview() {
  const { language, text } = useDashboardLanguage();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", "commerce-overview"],
    queryFn: loadCommerceStats,
    staleTime: 15_000,
    retry: false,
  });

  return (
    <section className="admin-page space-y-5">
      <header className="admin-page-header flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65">Dashboard</p>
          <h1 className="mt-1 text-[24px] font-black tracking-tight text-foreground sm:text-[28px]">
            {text("مرحباً، Admin", "Hello, Admin")}
          </h1>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {text("إليك ما يحدث في Space Call اليوم.", "Here’s what’s happening with Space Call today.")}
          </p>
        </div>
        <Link
          to="/dashboard/orders"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[10px] bg-primary px-3.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ShoppingBag className="size-3.5" /> {text("عرض الطلبات", "View Orders")}
        </Link>
      </header>

      {isError ? (
        <div className="flex items-center gap-3 rounded-[12px] border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-600 dark:text-rose-400">
          <AlertTriangle className="size-4 shrink-0" />
          {text("تعذر تحميل بعض بيانات لوحة التحكم حالياً.", "Some dashboard data could not be loaded right now.")}
        </div>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[1.16fr_1fr_0.58fr_0.58fr]">
        <RevenueCard
          revenue={data?.revenue ?? 0}
          aov={data?.aov ?? 0}
          activeOrders={data?.activeOrderCount ?? 0}
          currency={data?.currency ?? "USD"}
          loading={isLoading}
        />
        <OrderStatusCard counts={data?.statusCounts ?? {}} loading={isLoading} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <KpiCard
            label={text("إجمالي الطلبات", "Total Orders")}
            value={String(data?.orderCount ?? 0)}
            helper={language === "ar" ? `${data?.pending ?? 0} طلب قيد الانتظار` : `${data?.pending ?? 0} pending`}
            icon={ShoppingBag}
            loading={isLoading}
          />
          <KpiCard
            label={text("إجمالي المنتجات", "Total Products")}
            value={String(data?.products ?? 0)}
            helper={text("المنتجات الحالية في الكتالوج", "Current catalogue products")}
            icon={Package}
            loading={isLoading}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <KpiCard
            label={text("العملاء", "Customers")}
            value={String(data?.customers ?? 0)}
            helper={text("إجمالي العملاء المسجلين", "Total registered customers")}
            icon={UsersRound}
            loading={isLoading}
          />
          <KpiCard
            label={text("مخزون منخفض", "Low Stock")}
            value={String(data?.lowStock ?? 0)}
            helper={text("متغيرات لديها 5 قطع أو أقل", "Variants with 5 units or fewer")}
            icon={Boxes}
            loading={isLoading}
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-[12px] border border-border/70 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.025)]">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-black text-foreground">{text("آخر الطلبات", "Recent Orders")}</h2>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {text("أحدث الطلبات المسجلة في Space Call.", "Latest orders recorded in Space Call.")}
            </p>
          </div>
          <Link
            to="/dashboard/orders"
            className="inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-primary px-3 text-[10px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {text("عرض كل الطلبات", "View All Orders")} <ArrowRight className="size-3 rtl:rotate-180" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-11 w-full" />
            ))}
          </div>
        ) : !data?.recentOrders.length ? (
          <div className="p-10 text-center">
            <ShoppingBag className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-3 text-xs font-bold text-foreground">{text("لا توجد طلبات بعد", "No orders yet")}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {text("ستظهر الطلبات الجديدة هنا تلقائياً.", "New orders will appear here automatically.")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-start">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20 text-[9px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
                  <th className="px-5 py-3.5">{text("الطلب", "Order")}</th>
                  <th className="px-4 py-3.5">{text("العميل", "Customer")}</th>
                  <th className="px-4 py-3.5">{text("المنتجات", "Products")}</th>
                  <th className="px-4 py-3.5">{text("الإجمالي", "Total")}</th>
                  <th className="px-4 py-3.5">{text("الدفع", "Payment")}</th>
                  <th className="px-4 py-3.5">{text("الحالة", "Status")}</th>
                  <th className="px-4 py-3.5">{text("التاريخ", "Date")}</th>
                  <th className="px-5 py-3.5 text-end">{text("الإجراء", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border/45 transition-colors last:border-0 hover:bg-muted/20">
                    <td className="px-5 py-3.5 text-[11px] font-black text-foreground">#{order.order_number}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/8 text-[9px] font-black text-primary">
                          {(order.customer_name?.trim().charAt(0) || "C").toUpperCase()}
                        </span>
                        <span className="max-w-36 truncate text-[11px] font-semibold text-foreground">{order.customer_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Box className="size-3.5" /> {text("طلب", "Order")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[11px] font-black text-foreground">{formatPrice(order.total, order.currency)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${paymentClass(order.payment_status)}`}>
                        <CreditCard className="size-3" /> {paymentLabel(order.payment_status, language)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${statusClass(order.status)}`}>
                        {statusLabel(order.status, language)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[10px] text-muted-foreground">
                      {new Intl.DateTimeFormat(language === "ar" ? "ar-LB" : "en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(order.created_at))}
                    </td>
                    <td className="px-5 py-3.5 text-end">
                      <Link
                        to="/dashboard/orders"
                        className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-border/70 px-2.5 text-[9px] font-bold text-foreground transition-colors hover:bg-muted"
                      >
                        {text("فتح الطلب", "Open Order")} <ArrowRight className="size-3 rtl:rotate-180" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
