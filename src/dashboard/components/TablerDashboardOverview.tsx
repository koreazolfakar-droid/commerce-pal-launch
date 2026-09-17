import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CreditCard,
  Package,
  Percent,
  ShoppingBag,
  TriangleAlert,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import { OrdersTrendCard, RevenueChartCard } from "@/dashboard/components/DashboardCharts";
import {
  InventoryStatusCard,
  TopBrandsCard,
  TopSellingProductsCard,
} from "@/dashboard/components/DashboardInsights";
import { RecentOrdersTable } from "@/dashboard/components/RecentOrdersTable";
import type { DashboardOverview, DashboardTrend } from "@/dashboard/types/dashboard";
import { formatPrice } from "@/lib/productPricing";

function TrendBadge({ trend }: { trend?: DashboardTrend }) {
  if (!trend || trend.value === null || trend.direction === "neutral") {
    return <span className="text-[10px] font-semibold text-muted-foreground">—</span>;
  }

  const positive = trend.direction === "up";
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
        positive
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400"
      }`}
    >
      <Icon className="size-3" />
      {Math.abs(trend.value).toFixed(1)}%
    </span>
  );
}

function MetricCard({
  title,
  value,
  icon,
  trend,
  note,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: DashboardTrend;
  note?: string;
}) {
  return (
    <article className="rounded-xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground">{title}</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
            <p className="truncate text-xl font-bold tracking-[-0.025em] text-foreground">{value}</p>
            {trend ? <TrendBadge trend={trend} /> : null}
          </div>
          {note ? <p className="mt-1 text-[9px] text-muted-foreground">{note}</p> : null}
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/8 text-primary">
          {icon}
        </span>
      </div>
    </article>
  );
}

export function TablerDashboardOverview({
  data,
  language,
}: {
  data: DashboardOverview;
  language: "ar" | "en";
}) {
  const { stats } = data;
  const noChartData = language === "ar" ? "لا توجد بيانات لهذه الفترة." : "No data for this period.";

  return (
    <div className="space-y-4 xl:space-y-5" data-dashboard-theme="tabler">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={language === "ar" ? "إجمالي المبيعات" : "Total sales"}
          value={formatPrice(stats.revenue, data.currency)}
          trend={stats.revenueTrend}
          icon={<CreditCard className="size-[18px]" />}
        />
        <MetricCard
          title={language === "ar" ? "الطلبات" : "Orders"}
          value={stats.orders.toLocaleString()}
          trend={stats.ordersTrend}
          icon={<ShoppingBag className="size-[18px]" />}
        />
        <MetricCard
          title={language === "ar" ? "العملاء" : "Customers"}
          value={stats.customers.toLocaleString()}
          trend={stats.customersTrend}
          icon={<UsersRound className="size-[18px]" />}
        />
        <MetricCard
          title={language === "ar" ? "المنتجات" : "Products"}
          value={stats.products.toLocaleString()}
          trend={stats.productsTrend}
          icon={<Package className="size-[18px]" />}
        />
        <MetricCard
          title={language === "ar" ? "متوسط قيمة الطلب" : "Average order value"}
          value={formatPrice(stats.averageOrderValue, data.currency)}
          note={language === "ar" ? "للفترة المحددة" : "Selected period"}
          icon={<CreditCard className="size-[18px]" />}
        />
        <MetricCard
          title={language === "ar" ? "العملاء العائدون" : "Returning customers"}
          value={`${stats.returningCustomerRate.toFixed(1)}%`}
          note={language === "ar" ? "من عملاء الفترة" : "of period customers"}
          icon={<UserRoundCheck className="size-[18px]" />}
        />
        <MetricCard
          title={language === "ar" ? "تنبيهات المخزون" : "Low stock alerts"}
          value={stats.lowStockAlerts.toLocaleString()}
          note={language === "ar" ? "Variants تحتاج انتباه" : "variants need attention"}
          icon={<TriangleAlert className="size-[18px]" />}
        />
        <MetricCard
          title={language === "ar" ? "معدل التحويل" : "Conversion rate"}
          value={stats.conversionRate === null ? "—" : `${stats.conversionRate.toFixed(1)}%`}
          note={
            stats.conversionRate === null
              ? language === "ar"
                ? "يتطلب ربط التحليلات"
                : "Analytics connection required"
              : undefined
          }
          icon={<Percent className="size-[18px]" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <RevenueChartCard
            data={data.revenue}
            total={stats.revenue}
            currency={data.currency}
            trend={stats.revenueTrend}
            emptyLabel={noChartData}
            language={language}
          />
        </div>
        <div className="xl:col-span-6">
          <OrdersTrendCard
            data={data.orderTrend}
            total={stats.orders}
            trend={stats.ordersTrend}
            emptyLabel={noChartData}
            language={language}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <RecentOrdersTable
            orders={data.recentOrders}
            language={language}
            emptyLabel={language === "ar" ? "لا توجد طلبات حديثة بعد." : "No recent orders yet."}
          />
        </div>

        <div className="space-y-4 xl:col-span-4">
          <TopSellingProductsCard
            products={data.topProducts}
            currency={data.currency}
            language={language}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1 min-[1500px]:grid-cols-2">
            <TopBrandsCard brands={data.topBrands} language={language} />
            <InventoryStatusCard inventory={data.inventory} language={language} />
          </div>
        </div>
      </div>

      <div className="sr-only" aria-hidden="true">
        <Boxes />
      </div>
    </div>
  );
}
