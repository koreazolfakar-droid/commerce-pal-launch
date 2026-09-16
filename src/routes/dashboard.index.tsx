import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Boxes,
  CreditCard,
  Package,
  Percent,
  ShoppingBag,
  TriangleAlert,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import { RevenueChartCard, OrdersTrendCard } from "@/dashboard/components/DashboardCharts";
import {
  DashboardPromoBanner,
  InventoryStatusCard,
  TopBrandsCard,
  TopSellingProductsCard,
} from "@/dashboard/components/DashboardInsights";
import { DashboardPageHeader } from "@/dashboard/components/DashboardPageHeader";
import { RecentOrdersTable } from "@/dashboard/components/RecentOrdersTable";
import { DashboardErrorState, DashboardSkeleton } from "@/dashboard/components/DashboardStates";
import { MiniStatCard, StatCard } from "@/dashboard/components/StatCard";
import {
  getDashboardOverview,
  getDefaultDashboardRange,
} from "@/dashboard/services/dashboardService";
import type { DashboardDateRange, DashboardOverview } from "@/dashboard/types/dashboard";
import { useDashboardLanguage } from "@/lib/dashboardI18n";
import { formatPrice } from "@/lib/productPricing";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardPage,
});

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

function DashboardPage() {
  const { language, text } = useDashboardLanguage();
  const [range, setRange] = useState<DashboardDateRange>(() => getDefaultDashboardRange());

  const validRange = useMemo(() => {
    if (!range.start || !range.end) return getDefaultDashboardRange();
    return range.start <= range.end ? range : { start: range.end, end: range.start };
  }, [range]);

  const query = useQuery({
    queryKey: ["dashboard", "production-overview", validRange.start, validRange.end],
    queryFn: () => getDashboardOverview(validRange),
    staleTime: 30_000,
    retry: 1,
  });

  return (
    <section className="admin-page space-y-4 xl:space-y-5">
      <DashboardPageHeader
        language={language}
        range={range}
        onRangeChange={setRange}
        onExport={() => query.data && exportDashboardCsv(query.data)}
      />

      {query.isError ? (
        <DashboardErrorState
          message={text("تعذّر تحميل بيانات لوحة التحكم.", "Unable to load dashboard data.")}
          retryLabel={text("إعادة المحاولة", "Retry")}
          onRetry={() => void query.refetch()}
        />
      ) : query.isLoading || !query.data ? (
        <DashboardSkeleton />
      ) : (
        <DashboardContent data={query.data} language={language} />
      )}
    </section>
  );
}

function DashboardContent({
  data,
  language,
}: {
  data: DashboardOverview;
  language: "ar" | "en";
}) {
  const { stats } = data;
  const previousLabel = language === "ar" ? "مقارنة بالفترة السابقة" : "vs previous period";
  const noChartData = language === "ar" ? "لا توجد بيانات لهذه الفترة." : "No data for this period.";

  return (
    <div className="space-y-4 xl:space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={language === "ar" ? "إجمالي المبيعات" : "Total Sales"}
          value={formatPrice(stats.revenue, data.currency)}
          trend={stats.revenueTrend}
          comparisonLabel={previousLabel}
          icon={<CreditCard className="size-5" />}
        />
        <StatCard
          title={language === "ar" ? "الطلبات" : "Orders"}
          value={stats.orders.toLocaleString()}
          trend={stats.ordersTrend}
          comparisonLabel={previousLabel}
          icon={<ShoppingBag className="size-5" />}
        />
        <StatCard
          title={language === "ar" ? "العملاء" : "Customers"}
          value={stats.customers.toLocaleString()}
          trend={stats.customersTrend}
          comparisonLabel={previousLabel}
          icon={<UsersRound className="size-5" />}
        />
        <StatCard
          title={language === "ar" ? "المنتجات" : "Products"}
          value={stats.products.toLocaleString()}
          trend={stats.productsTrend}
          comparisonLabel={previousLabel}
          icon={<Package className="size-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStatCard
          title={language === "ar" ? "معدل التحويل" : "Conversion Rate"}
          value={stats.conversionRate === null ? "—" : `${stats.conversionRate.toFixed(1)}%`}
          comparisonLabel={language === "ar" ? "يتطلب ربط التحليلات" : "Connect analytics to calculate"}
          icon={<Percent className="size-5" />}
        />
        <MiniStatCard
          title={language === "ar" ? "متوسط قيمة الطلب" : "Average Order Value"}
          value={formatPrice(stats.averageOrderValue, data.currency)}
          comparisonLabel={language === "ar" ? "متوسط الفترة المحددة" : "Selected period average"}
          icon={<CreditCard className="size-5" />}
        />
        <MiniStatCard
          title={language === "ar" ? "العملاء العائدون" : "Returning Customers"}
          value={`${stats.returningCustomerRate.toFixed(1)}%`}
          comparisonLabel={language === "ar" ? "من عملاء الفترة" : "of period customers"}
          icon={<UserRoundCheck className="size-5" />}
        />
        <MiniStatCard
          title={language === "ar" ? "تنبيهات المخزون" : "Low Stock Alerts"}
          value={stats.lowStockAlerts.toLocaleString()}
          comparisonLabel={language === "ar" ? "Variants تحتاج انتباه" : "variants need attention"}
          warningIncrease
          icon={<TriangleAlert className="size-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <RecentOrdersTable
            orders={data.recentOrders}
            language={language}
            emptyLabel={language === "ar" ? "لا توجد طلبات حديثة بعد." : "No recent orders yet."}
          />
          <DashboardPromoBanner language={language} />
        </div>

        <div className="space-y-4 xl:col-span-4">
          <TopSellingProductsCard
            products={data.topProducts}
            currency={data.currency}
            language={language}
          />
          <div className="grid grid-cols-1 gap-4 min-[1380px]:grid-cols-2">
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
