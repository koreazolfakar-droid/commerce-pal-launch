import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useLanguage } from "@/dashboard/i18n";
/** Reuse all table fields and actions as labelled cards on narrow screens. */
export default function DashboardResponsiveTable({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { lang } = useLanguage();
  useLayoutEffect(() => {
    const table = ref.current?.querySelector("table");
    if (!table) return;
    const labels = [...table.querySelectorAll("thead th")].map(
      (cell) => cell.textContent?.trim() ?? "",
    );
    for (const row of table.querySelectorAll("tbody tr")) {
      [...row.children].forEach((cell, index) => {
        if (cell instanceof HTMLTableCellElement && cell.colSpan === 1)
          cell.dataset.label = labels[index] ?? "";
      });
    }
  }, [children, lang]);
  return (
    <div ref={ref} className="dashboard-responsive-table">
      {children}
    </div>
  );
}
