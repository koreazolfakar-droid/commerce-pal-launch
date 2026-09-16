import { CalendarDays, Download } from "lucide-react";

import type { DashboardDateRange } from "@/dashboard/types/dashboard";

export function DashboardPageHeader({
  language,
  range,
  onRangeChange,
  onExport,
}: {
  language: "ar" | "en";
  range: DashboardDateRange;
  onRangeChange: (next: DashboardDateRange) => void;
  onExport: () => void;
}) {
  const title = language === "ar" ? "لوحة التحكم" : "Dashboard";
  const subtitle =
    language === "ar"
      ? "مرحباً بعودتك! إليك ما يحدث في متجرك اليوم."
      : "Welcome back! Here’s what’s happening with your store today.";

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-[28px] font-black tracking-[-0.035em] text-slate-950 dark:text-foreground sm:text-[30px]">{title}</h1>
        <p className="mt-1 text-[12px] text-slate-500 dark:text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-card px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,.03)] dark:border-border/70">
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="date"
            value={range.start}
            onChange={(event) => onRangeChange({ ...range, start: event.target.value })}
            className="min-w-0 bg-transparent text-[11px] font-semibold outline-none"
            aria-label={language === "ar" ? "تاريخ البداية" : "Start date"}
          />
          <span className="text-[10px] text-muted-foreground">—</span>
          <input
            type="date"
            value={range.end}
            onChange={(event) => onRangeChange({ ...range, end: event.target.value })}
            className="min-w-0 bg-transparent text-[11px] font-semibold outline-none"
            aria-label={language === "ar" ? "تاريخ النهاية" : "End date"}
          />
        </div>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex h-[38px] items-center justify-center gap-2 rounded-xl bg-[#0b1428] px-4 text-[11px] font-black text-white shadow-[0_8px_20px_-14px_rgba(11,20,40,.8)] transition hover:bg-[#111d35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Download className="size-4" />
          {language === "ar" ? "تصدير التقرير" : "Export Report"}
        </button>
      </div>
    </header>
  );
}
