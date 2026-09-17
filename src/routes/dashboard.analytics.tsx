import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, DollarSign, Eye, RefreshCcw, ShoppingBag, UsersRound } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardCard } from "@/dashboard/components/DashboardCard";
import { getShopifyAdminAnalytics } from "@/dashboard/services/shopifyAnalytics.functions";
import type { ShopifyAnalyticsSnapshot } from "@/dashboard/types/shopifyAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardLanguage } from "@/lib/dashboardI18n";
import { formatPrice } from "@/lib/productPricing";

export const Route = createFileRoute("/dashboard/analytics")({ component: AnalyticsPage });

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function defaultRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { start: isoDate(start), end: isoDate(end) };
}

function metric(
  label: string,
  value: string,
  Icon: typeof DollarSign,
  hint?: string,
) {
  return (
    <DashboardCard className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.04em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-xl font-black tracking-[-0.03em] text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
    </DashboardCard>
  );
}

function SourceState({
  data,
  onRetry,
  language,
}: {
  data: ShopifyAnalyticsSnapshot;
  onRetry: () => void;
  language: "ar" | "en";
}) {
  const isDisabled = data.status === "disabled" || data.status === "unconfigured";
  return (
    <DashboardCard className="border-dashed p-6 text-center sm:p-8">
      <span className="mx-auto grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
        <Activity className="size-5" />
      </span>
      <h2 className="mt-3 text-sm font-black text-foreground">
        {isDisabled
          ? language === "ar"
            ? "تحليلات Shopify جاهزة للتفعيل الآمن"
            : "Shopify analytics is ready for safe activation"
          : language === "ar"
            ? "تعذّر تحميل تحليلات Shopify"
            : "Unable to load Shopify analytics"}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-muted-foreground">
        {isDisabled
          ? language === "ar"
            ? "طبقة القراءة فقط موجودة، لكنها لا تعمل إلا بعد إضافة بيانات اعتماد Admin على الخادم وتفعيل مفتاح القراءة. لا يتم تنفيذ أي كتابة على Shopify من هذه الصفحة."
            : "The read-only layer is installed, but it only runs after a server-side Admin credential and the read feature flag are enabled. This page performs no Shopify writes."
          : data.message ||
            (language === "ar" ? "حاول مرة أخرى بعد قليل." : "Please try again shortly.")}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-[11px] font-bold text-foreground transition hover:bg-muted"
      >
        <RefreshCcw className="size-3.5" />
        {language === "ar" ? "إعادة المحاولة" : "Retry"}
      </button>
    </DashboardCard>
  );
}

function AnalyticsPage() {
  const { language, text } = useDashboardLanguage();
  const initialRange = useMemo(defaultRange, []);
  const [start, setStart] = useState(initialRange.start);
  const [end, setEnd] = useState(initialRange.end);

  const query = useQuery({
    queryKey: ["dashboard", "shopify-admin-analytics", start, end],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Dashboard session expired");
      return getShopifyAdminAnalytics({ accessToken, start, end });
    },
    retry: false,
    staleTime: 60_000,
  });

  const analytics = query.data;
  const ready = analytics?.status === "ready";

  return (
    <section className="admin-page space-y-5">
      <header className="admin-page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p>{text("التحليلات", "Analytics")}</p>
          <h1>{text("تحليلات Shopify المباشرة", "Live Shopify Analytics")}</h1>
          <p>
            {text(
              "قراءة مباشرة وآمنة للمبيعات والعملاء والجلسات من Shopify Admin بدون تعديل أي بيانات.",
              "Safe read-only sales, customer and session reporting from Shopify Admin without changing store data.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={start}
            max={end}
            onChange={(event) => setStart(event.target.value)}
            className="h-9 rounded-xl border border-border bg-card px-3 text-[11px] font-semibold"
            aria-label={text("تاريخ البداية", "Start date")}
          />
          <span className="text-[10px] text-muted-foreground">—</span>
          <input
            type="date"
            value={end}
            min={start}
            onChange={(event) => setEnd(event.target.value)}
            className="h-9 rounded-xl border border-border bg-card px-3 text-[11px] font-semibold"
            aria-label={text("تاريخ النهاية", "End date")}
          />
        </div>
      </header>

      {query.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-border/70 bg-card" />
          ))}
        </div>
      ) : query.isError ? (
        <SourceState
          data={{
            status: "unavailable",
            source: "shopify-admin",
            message: query.error instanceof Error ? query.error.message : undefined,
            currency: "USD",
            totals: {
              orders: 0,
              totalSales: 0,
              averageOrderValue: null,
              customers: 0,
              returningCustomers: 0,
              returningCustomerRate: null,
              sessions: 0,
              visitors: 0,
              conversionRate: null,
            },
            salesSeries: [],
            customerSeries: [],
            sessionSeries: [],
            topProducts: [],
          }}
          onRetry={() => void query.refetch()}
          language={language}
        />
      ) : !analytics || !ready ? (
        analytics ? (
          <SourceState data={analytics} onRetry={() => void query.refetch()} language={language} />
        ) : null
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metric(
              text("إجمالي المبيعات", "Total sales"),
              formatPrice(analytics.totals.totalSales, analytics.currency),
              DollarSign,
              text("الفترة المحددة", "selected period"),
            )}
            {metric(
              text("الطلبات", "Orders"),
              analytics.totals.orders.toLocaleString(),
              ShoppingBag,
              text("من Shopify", "from Shopify"),
            )}
            {metric(
              text("العملاء", "Customers"),
              analytics.totals.customers.toLocaleString(),
              UsersRound,
              analytics.totals.returningCustomerRate === null
                ? undefined
                : `${analytics.totals.returningCustomerRate.toFixed(1)}% ${text("عائدون", "returning")}`,
            )}
            {metric(
              text("معدل التحويل", "Conversion rate"),
              analytics.totals.conversionRate === null
                ? "—"
                : `${analytics.totals.conversionRate.toFixed(2)}%`,
              Eye,
              `${analytics.totals.sessions.toLocaleString()} ${text("جلسة", "sessions")}`,
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]">
            <DashboardCard className="p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black text-foreground">
                    {text("المبيعات اليومية", "Daily sales")}
                  </h2>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {text("بيانات Shopify المباشرة للفترة المحددة", "Live Shopify data for the selected period")}
                  </p>
                </div>
                <span className="rounded-lg bg-success/10 px-2 py-1 text-[9px] font-bold text-success">
                  LIVE
                </span>
              </div>
              {analytics.salesSeries.length === 0 ? (
                <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-border/70 text-xs text-muted-foreground">
                  {text("لا توجد مبيعات في هذه الفترة.", "No sales in this period.")}
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.salesSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.55} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={30} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                      <YAxis axisLine={false} tickLine={false} width={42} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                          color: "var(--card-foreground)",
                          fontSize: 11,
                        }}
                        formatter={(value) => [
                          formatPrice(Number(value ?? 0), analytics.currency),
                          text("المبيعات", "Sales"),
                        ]}
                      />
                      <Line type="monotone" dataKey="totalSales" stroke="var(--primary)" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </DashboardCard>

            <DashboardCard className="overflow-hidden">
              <div className="border-b border-border/60 px-4 py-4 sm:px-5">
                <h2 className="text-sm font-black text-foreground">
                  {text("أفضل المنتجات", "Top products")}
                </h2>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {text("حسب إجمالي المبيعات", "by gross sales")}
                </p>
              </div>
              {analytics.topProducts.length === 0 ? (
                <div className="grid min-h-44 place-items-center p-5 text-center text-xs text-muted-foreground">
                  {text("لا توجد بيانات منتجات لهذه الفترة.", "No product sales data for this period.")}
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {analytics.topProducts.map((product, index) => (
                    <div key={`${product.title}-${index}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-[10px] font-black text-primary">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-foreground">{product.title}</p>
                        <p className="mt-0.5 text-[9px] text-muted-foreground">
                          {product.orders.toLocaleString()} {text("طلب", "orders")}
                        </p>
                      </div>
                      <span className="text-[11px] font-black text-foreground">
                        {formatPrice(product.grossSales, analytics.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </DashboardCard>
          </div>
        </>
      )}
    </section>
  );
}
