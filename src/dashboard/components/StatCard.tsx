import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { DashboardCard } from "@/dashboard/components/DashboardCard";
import type { DashboardTrend } from "@/dashboard/types/dashboard";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: DashboardTrend | undefined;
  comparisonLabel?: string | undefined;
  warningIncrease?: boolean | undefined;
  loading?: boolean | undefined;
};

function TrendBadge({
  trend,
  warningIncrease,
}: {
  trend?: DashboardTrend | undefined;
  warningIncrease?: boolean | undefined;
}) {
  if (!trend || trend.value === null) {
    return <span className="text-[11px] font-semibold text-muted-foreground">—</span>;
  }

  const positive = trend.direction === "up";
  const negative = trend.direction === "down";
  const warning = warningIncrease && positive;
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-bold",
        warning
          ? "text-rose-600 dark:text-rose-400"
          : positive
            ? "text-emerald-600 dark:text-emerald-400"
            : negative
              ? "text-rose-600 dark:text-rose-400"
              : "text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {Math.abs(trend.value).toFixed(1)}%
    </span>
  );
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  comparisonLabel = "vs previous period",
  warningIncrease,
  loading,
}: StatCardProps) {
  return (
    <DashboardCard className="p-4 sm:p-5">
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-muted-foreground">{title}</p>
          {loading ? (
            <div className="mt-2 h-7 w-24 animate-pulse rounded-md bg-muted" />
          ) : (
            <p className="mt-1 text-[24px] font-black tracking-[-0.03em] text-foreground">{value}</p>
          )}
          <div className="mt-1.5 flex items-center gap-1.5">
            <TrendBadge trend={trend} warningIncrease={warningIncrease} />
            <span className="truncate text-[10px] text-muted-foreground">{comparisonLabel}</span>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

export function MiniStatCard({
  title,
  value,
  icon,
  trend,
  comparisonLabel = "vs previous period",
  warningIncrease,
}: StatCardProps) {
  return (
    <DashboardCard className="p-4">
      <div className="flex items-start gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary", warningIncrease && "bg-rose-500/10 text-rose-600 dark:text-rose-400")}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-muted-foreground">{title}</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <p className="text-[22px] font-black tracking-[-0.025em]">{value}</p>
            <TrendBadge trend={trend} warningIncrease={warningIncrease} />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">{comparisonLabel}</p>
        </div>
      </div>
    </DashboardCard>
  );
}
