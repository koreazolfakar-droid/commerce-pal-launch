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

import { DashboardCard } from "@/dashboard/components/DashboardCard";
import type { DashboardTrend, OrdersTrend, RevenueData } from "@/dashboard/types/dashboard";
import { formatPrice } from "@/lib/productPricing";

function TrendText({ trend }: { trend: DashboardTrend }) {
  if (trend.value === null)
    return <span className="text-xs font-semibold text-muted-foreground">—</span>;
  const positive = trend.direction === "up";
  return (
    <span
      className={
        positive
          ? "text-xs font-bold text-emerald-600 dark:text-emerald-400"
          : "text-xs font-bold text-rose-600 dark:text-rose-400"
      }
    >
      {positive ? "↑" : trend.direction === "down" ? "↓" : ""} {Math.abs(trend.value).toFixed(1)}%
    </span>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="admin-empty-state grid h-[170px] place-items-center px-4 text-center text-xs text-muted-foreground sm:h-[205px] xl:h-[250px]">
      {label}
    </div>
  );
}

export function RevenueChartCard({
  data,
  total,
  currency,
  trend,
  emptyLabel,
  language,
}: {
  data: RevenueData[];
  total: number;
  currency: string;
  trend: DashboardTrend;
  emptyLabel: string;
  language: "ar" | "en";
}) {
  const hasData = data.some((point) => point.revenue > 0);
  return (
    <DashboardCard className="p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-black text-foreground">
            {language === "ar" ? "نظرة عامة على الإيرادات" : "Revenue Overview"}
          </p>
          <div className="mt-1.5 flex items-center gap-3">
            <span className="text-[23px] font-black tracking-[-0.03em]">
              {formatPrice(total, currency)}
            </span>
            <TrendText trend={trend} />
          </div>
        </div>
        <span className="rounded-lg border border-border/70 bg-muted/20 px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground">
          {language === "ar" ? "يومي" : "Daily"}
        </span>
      </div>
      {!hasData ? (
        <EmptyChart label={emptyLabel} />
      ) : (
        <div className="h-[200px] w-full sm:h-[225px] xl:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="spacecallRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.45} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                minTickGap={24}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={44}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(value) =>
                  value >= 1000 ? `${Math.round(value / 1000)}K` : String(value)
                }
              />
              <Tooltip
                cursor={{ stroke: "var(--primary)", strokeOpacity: 0.18 }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  boxShadow: "0 10px 30px -20px rgba(15,23,42,.35)",
                  fontSize: 12,
                }}
                formatter={(value) => [
                  formatPrice(Number(value ?? 0), currency),
                  language === "ar" ? "الإيرادات" : "Revenue",
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--primary)"
                strokeWidth={2.25}
                fill="url(#spacecallRevenueFill)"
                activeDot={{
                  r: 4,
                  strokeWidth: 2,
                  fill: "var(--background)",
                  stroke: "var(--primary)",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardCard>
  );
}

export function OrdersTrendCard({
  data,
  total,
  trend,
  emptyLabel,
  language,
}: {
  data: OrdersTrend[];
  total: number;
  trend: DashboardTrend;
  emptyLabel: string;
  language: "ar" | "en";
}) {
  const hasData = data.some((point) => point.orders > 0);
  return (
    <DashboardCard className="p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-black text-foreground">
            {language === "ar" ? "اتجاه الطلبات" : "Orders Trend"}
          </p>
          <div className="mt-1.5 flex items-center gap-3">
            <span className="text-[23px] font-black tracking-[-0.03em]">
              {total.toLocaleString()}
            </span>
            <TrendText trend={trend} />
          </div>
        </div>
        <span className="rounded-lg border border-border/70 bg-muted/20 px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground">
          {language === "ar" ? "يومي" : "Daily"}
        </span>
      </div>
      {!hasData ? (
        <EmptyChart label={emptyLabel} />
      ) : (
        <div className="h-[200px] w-full sm:h-[225px] xl:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.45} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                minTickGap={24}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                width={36}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                cursor={{ fill: "color-mix(in oklab, var(--muted) 24%, transparent)" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  boxShadow: "0 10px 30px -20px rgba(15,23,42,.35)",
                  fontSize: 12,
                }}
                formatter={(value) => [
                  Number(value ?? 0),
                  language === "ar" ? "الطلبات" : "Orders",
                ]}
              />
              <Bar
                dataKey="orders"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
                opacity={0.82}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardCard>
  );
}
