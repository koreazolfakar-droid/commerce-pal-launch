import { Link } from "@tanstack/react-router";

import { DashboardCard } from "@/dashboard/components/DashboardCard";
import type { DashboardOrder, DashboardOrderStatus } from "@/dashboard/types/dashboard";
import { formatPrice } from "@/lib/productPricing";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<DashboardOrderStatus, string> = {
  delivered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  processing: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  confirmed: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  shipped: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  cancelled: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

const STATUS_LABELS: Record<DashboardOrderStatus, { en: string; ar: string }> = {
  delivered: { en: "Delivered", ar: "تم التسليم" },
  processing: { en: "Processing", ar: "قيد التجهيز" },
  confirmed: { en: "Confirmed", ar: "مؤكد" },
  shipped: { en: "Shipped", ar: "تم الشحن" },
  cancelled: { en: "Cancelled", ar: "ملغي" },
  pending: { en: "Pending", ar: "قيد الانتظار" },
};

export function OrderStatusBadge({ status, language }: { status: DashboardOrderStatus; language: "ar" | "en" }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold", STATUS_STYLES[status])}>
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {STATUS_LABELS[status][language]}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SC";
}

function dateLabel(value: string, language: "ar" | "en") {
  return new Intl.DateTimeFormat(language === "ar" ? "ar-LB" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function RecentOrdersTable({
  orders,
  language,
  emptyLabel,
}: {
  orders: DashboardOrder[];
  language: "ar" | "en";
  emptyLabel: string;
}) {
  return (
    <DashboardCard className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-border/60 px-4 py-4 sm:px-5">
        <h2 className="text-[14px] font-black">{language === "ar" ? "أحدث الطلبات" : "Recent Orders"}</h2>
        <Link to="/dashboard/orders" className="text-[11px] font-bold text-primary hover:underline">
          {language === "ar" ? "عرض الكل ←" : "View All →"}
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="grid min-h-52 place-items-center p-6 text-center text-xs text-muted-foreground">{emptyLabel}</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-start text-xs">
              <thead className="bg-muted/25 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start font-bold">#</th>
                  <th className="px-4 py-3 text-start font-bold">{language === "ar" ? "العميل" : "Customer"}</th>
                  <th className="px-4 py-3 text-start font-bold">{language === "ar" ? "المنتج" : "Items"}</th>
                  <th className="px-4 py-3 text-start font-bold">{language === "ar" ? "الإجمالي" : "Total"}</th>
                  <th className="px-4 py-3 text-start font-bold">{language === "ar" ? "الحالة" : "Status"}</th>
                  <th className="px-4 py-3 text-start font-bold">{language === "ar" ? "التاريخ" : "Date"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {orders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-muted/15">
                    <td className="px-4 py-3 font-bold text-muted-foreground">#SC{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[9px] font-black text-primary">{initials(order.customer)}</span>
                        <span className="max-w-40 truncate font-semibold">{order.customer}</span>
                      </div>
                    </td>
                    <td className="max-w-[230px] truncate px-4 py-3 text-muted-foreground">{order.item}</td>
                    <td className="px-4 py-3 font-black">{formatPrice(order.total, order.currency)}</td>
                    <td className="px-4 py-3"><OrderStatusBadge status={order.status} language={language} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{dateLabel(order.date, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border/50 md:hidden">
            {orders.map((order) => (
              <div key={order.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[9px] font-black text-primary">{initials(order.customer)}</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">{order.customer}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">#SC{order.orderNumber}</p>
                    </div>
                  </div>
                  <OrderStatusBadge status={order.status} language={language} />
                </div>
                <p className="truncate text-[11px] text-muted-foreground">{order.item}</p>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{dateLabel(order.date, language)}</span>
                  <span className="font-black">{formatPrice(order.total, order.currency)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardCard>
  );
}
