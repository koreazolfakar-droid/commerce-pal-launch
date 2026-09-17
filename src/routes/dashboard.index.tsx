import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { DashboardPageHeader } from "@/dashboard/components/DashboardPageHeader";
import { DashboardErrorState, DashboardSkeleton } from "@/dashboard/components/DashboardStates";
import { TablerDashboardOverview } from "@/dashboard/components/TablerDashboardOverview";
import {
  getDashboardOverview,
  getDefaultDashboardRange,
} from "@/dashboard/services/dashboardService";
import type { DashboardDateRange, DashboardOverview } from "@/dashboard/types/dashboard";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

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
        <TablerDashboardOverview data={query.data} language={language} />
      )}
    </section>
  );
}
