import { useLanguage } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, PackageOpen, Receipt, XCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { StoreLayout } from "@/components/StoreLayout";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { loadMyOrders, type CustomerOrderSummary } from "@/lib/customerAccount";
import { absoluteUrl, canonicalLink } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my-orders")({
  head: () => ({
    meta: [
      { title: `My orders — ${STORE_NAME}` },
      {
        name: "description",
        content: `Review your past orders from ${STORE_NAME}, including status and items.`,
      },
      { property: "og:title", content: `My orders — ${STORE_NAME}` },
      {
        property: "og:description",
        content: "Review your past orders, status, and items.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/my-orders") },
      { name: "robots", content: "noindex, follow" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `My orders — ${STORE_NAME}` },
      { name: "twitter:description", content: "Review your past orders, status, and items." },
    ],
    links: [canonicalLink("/my-orders")],
  }),
  component: MyOrdersPage,
});

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency || "USD"}`;
  }
}

function formatDateTime(iso: string, ar: boolean) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(ar ? "ar-LB" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function customerStatusLabel(status: string, ar: boolean) {
  const labels: Record<string, [string, string]> = {
    new: ["Received", "تم استلام الطلب"],
    confirmed: ["Confirmed", "تم التأكيد"],
    processing: ["Preparing", "قيد التحضير"],
    ready: ["Ready", "جاهز"],
    out_for_delivery: ["On the way", "في الطريق"],
    delivered: ["Delivered", "تم التوصيل"],
    done: ["Delivered", "تم التوصيل"],
    cancelled: ["Cancelled", "ملغي"],
  };
  const label = labels[status];
  return label ? label[ar ? 1 : 0] : status.replaceAll("_", " ");
}

function statusTone(status: string) {
  if (status === "delivered" || status === "done") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "cancelled") {
    return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  if (status === "processing") {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  if (status === "out_for_delivery") {
    return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
  }
  return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
}

const MINI_ORDER_STAGES = ["received", "preparing", "ready", "on_the_way", "delivered"] as const;

function miniStageIndex(status: string) {
  if (status === "processing") return 1;
  if (status === "ready") return 2;
  if (status === "out_for_delivery") return 3;
  if (status === "delivered" || status === "done") return 4;
  return 0;
}

function MiniOrderProgress({
  order,
  ar,
}: {
  order: CustomerOrderSummary;
  ar: boolean;
}) {
  if (order.status === "cancelled") {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
        <XCircle className="h-3.5 w-3.5" aria-hidden />
        <span>{ar ? "تم إلغاء الطلب" : "Order cancelled"}</span>
      </div>
    );
  }

  const current = miniStageIndex(order.status);
  const labels = ar
    ? ["استلمنا", "تحضير", "جاهز", "بالطريق", "تم التوصيل"]
    : ["Received", "Preparing", "Ready", "On the way", "Delivered"];

  return (
    <div className="mt-4">
      <div className="relative px-0.5">
        <div
          className="absolute left-[10%] right-[10%] top-[5px] h-px bg-border"
          aria-hidden
        />
        <div
          className="absolute left-[10%] top-[5px] h-px bg-emerald-500 transition-[width] duration-300"
          style={{ width: `${current * 20}%` }}
          aria-hidden
        />

        <div className="relative grid grid-cols-5">
          {MINI_ORDER_STAGES.map((stage, index) => {
            const complete = index < current || (current === 4 && index === 4);
            const active = index === current && current !== 4;
            return (
              <div key={stage} className="flex min-w-0 flex-col items-center text-center">
                <span
                  className={cn(
                    "grid h-2.5 w-2.5 place-items-center rounded-full border bg-card",
                    complete && "border-emerald-500 bg-emerald-500",
                    active &&
                      (index === 1
                        ? "border-amber-500 bg-amber-500 ring-4 ring-amber-500/10"
                        : index === 3
                          ? "border-violet-500 bg-violet-500 ring-4 ring-violet-500/10"
                          : "border-primary bg-primary ring-4 ring-primary/10"),
                    !complete && !active && "border-border bg-muted",
                  )}
                >
                  {complete ? <Check className="h-2 w-2 text-white" aria-hidden /> : null}
                </span>
                <span
                  className={cn(
                    "mt-1.5 max-w-[62px] text-[8px] font-medium leading-tight sm:text-[9px]",
                    complete && "text-emerald-700 dark:text-emerald-300",
                    active &&
                      (index === 1
                        ? "text-amber-600 dark:text-amber-300"
                        : index === 3
                          ? "text-violet-600 dark:text-violet-300"
                          : "text-primary"),
                    !complete && !active && "text-muted-foreground",
                  )}
                >
                  {labels[index]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function isPastOrder(status: string) {
  return status === "delivered" || status === "done" || status === "cancelled";
}

function isDeliveredOrder(status: string) {
  return status === "delivered" || status === "done";
}

type OrderFilter = "all" | "active" | "delivered" | "cancelled";

function MyOrdersPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading, openAuth } = useCustomerAuth();

  if (authLoading) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <p className="text-sm text-muted-foreground">{t("myOrdersLoading")}</p>
        </div>
      </StoreLayout>
    );
  }

  if (!user) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="flex flex-col items-center gap-3 rounded-2xl border bg-surface px-5 py-14 text-center sm:px-6 sm:py-16">
            <Receipt aria-hidden className="h-12 w-12 text-muted-foreground/30" />
            <h1 className="text-xl font-semibold tracking-tight">{t("myOrdersSignIn")}</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t("myOrdersSignInDescription")}
            </p>
            <Button className="mt-1" onClick={() => openAuth()}>
              {t("myOrdersSignIn")}
            </Button>
          </div>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="mx-auto max-w-3xl px-4 py-7 sm:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{t("myOrdersTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("myOrdersSubtitle")}</p>
        </header>
        <OrdersList />
      </div>
    </StoreLayout>
  );
}

function OrdersList() {
  const { t, language } = useLanguage();
  const ar = language === "ar";
  const [filter, setFilter] = useState<OrderFilter>("all");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => loadMyOrders(50),
    retry: 1,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t("myOrdersLoading")}</p>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
        <p className="text-sm text-rose-700 dark:text-rose-300">{t("myOrdersFailed")}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  const orders = data ?? [];

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border bg-surface px-5 py-14 text-center sm:px-6 sm:py-16">
        <PackageOpen aria-hidden className="h-12 w-12 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold">{t("myOrdersEmpty")}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{t("myOrdersEmptyDescription")}</p>
        <Button asChild className="mt-1">
          <Link to="/shop">{t("browseProducts")}</Link>
        </Button>
      </div>
    );
  }

  const activeOrders = orders.filter((order) => !isPastOrder(order.status));
  const pastOrders = orders.filter((order) => isPastOrder(order.status));
  const deliveredOrders = orders.filter((order) => isDeliveredOrder(order.status));
  const cancelledOrders = orders.filter((order) => order.status === "cancelled");

  const visibleOrders =
    filter === "active"
      ? activeOrders
      : filter === "delivered"
        ? deliveredOrders
        : filter === "cancelled"
          ? cancelledOrders
          : orders;

  return (
    <div>
      <OrderStatusFilters filter={filter} onChange={setFilter} ar={ar} />

      {visibleOrders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border/70 bg-surface/50 px-5 py-10 text-center">
          <PackageOpen aria-hidden className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {ar ? "لا توجد طلبات بهذه الحالة" : "No orders with this status"}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-7">
          {filter === "all" ? (
            <>
              {activeOrders.length ? (
                <OrderSection
                  title={ar ? "الطلبات الحالية" : "Active orders"}
                  orders={activeOrders}
                  ar={ar}
                />
              ) : null}
              {pastOrders.length ? (
                <OrderSection
                  title={ar ? "الطلبات السابقة" : "Past orders"}
                  orders={pastOrders}
                  ar={ar}
                />
              ) : null}
            </>
          ) : filter === "active" ? (
            <OrderSection
              title={ar ? "الطلبات الحالية" : "Active orders"}
              orders={activeOrders}
              ar={ar}
            />
          ) : filter === "delivered" ? (
            <OrderSection
              title={ar ? "الطلبات المستلمة" : "Delivered orders"}
              orders={deliveredOrders}
              ar={ar}
            />
          ) : (
            <OrderSection
              title={ar ? "الطلبات الملغاة" : "Cancelled orders"}
              orders={cancelledOrders}
              ar={ar}
            />
          )}
        </div>
      )}
    </div>
  );
}

function OrderStatusFilters({
  filter,
  onChange,
  ar,
}: {
  filter: OrderFilter;
  onChange: (filter: OrderFilter) => void;
  ar: boolean;
}) {
  const items: Array<{ value: OrderFilter; label: string }> = [
    { value: "all", label: ar ? "الكل" : "All" },
    { value: "active", label: ar ? "الحالية" : "Active" },
    { value: "delivered", label: ar ? "تم التوصيل" : "Delivered" },
    { value: "cancelled", label: ar ? "الملغاة" : "Cancelled" },
  ];

  return (
    <div
      role="tablist"
      aria-label={ar ? "تصفية الطلبات حسب الحالة" : "Filter orders by status"}
      className="scroll-rail -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      {items.map((item) => {
        const active = filter === item.value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "press flex h-8 shrink-0 items-center rounded-full border px-3 text-[12px] font-semibold transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-surface text-muted-foreground hover:bg-accent",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function OrderSection({
  title,
  orders,
  ar,
}: {
  title: string;
  orders: CustomerOrderSummary[];
  ar: boolean;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold tracking-tight">{title}</h2>
      <ul className="space-y-3">
        {orders.map((order) => (
          <OrderCard key={order.orderId} order={order} ar={ar} />
        ))}
      </ul>
    </section>
  );
}

function OrderCard({ order, ar }: { order: CustomerOrderSummary; ar: boolean }) {
  const otherCount = Math.max(0, order.itemCount - order.previewItems.length);

  return (
    <li>
      <Link
        to="/my-orders/$orderId"
        params={{ orderId: order.orderId }}
        className="group block rounded-2xl border border-border/70 bg-card p-4 shadow-card transition-[border-color,box-shadow,transform] duration-150 hover:border-border hover:shadow-md active:scale-[0.995]"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {ar ? "طلب" : "Order"} #{order.publicOrderNumber}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  statusTone(order.status),
                )}
              >
                {customerStatusLabel(order.status, ar)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(order.createdAt, ar)}
            </p>
          </div>
          <ChevronRight
            aria-hidden
            className={cn(
              "mt-1 h-5 w-5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5",
              ar && "rotate-180 group-hover:-translate-x-0.5",
            )}
          />
        </div>

        <MiniOrderProgress order={order} ar={ar} />

        <div className="mt-4 space-y-2.5">
          {order.previewItems.length ? (
            order.previewItems.map((item) => (
              <div key={item.itemId} className="flex min-w-0 items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-border/60 bg-muted/25">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <PackageOpen className="h-5 w-5 text-muted-foreground/35" aria-hidden />
                  )}
                </div>
                <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                  {item.title}
                </p>
                <span className="shrink-0 text-xs font-semibold text-primary">
                  ×{item.quantity}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {ar ? "اضغط لعرض عناصر الطلب" : "Tap to view order items"}
            </p>
          )}

          {otherCount > 0 ? (
            <p className="ps-14 text-xs font-medium text-muted-foreground">
              +{otherCount} {ar ? "عناصر أخرى" : otherCount === 1 ? "other item" : "other items"}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex items-end justify-between border-t border-border/60 pt-3">
          <div className="min-w-0">
            {order.city ? (
              <p className="truncate text-xs text-muted-foreground">
                {ar ? "التوصيل" : "Delivery"} · {order.city}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {order.paymentMethod || order.paymentStatus || ""}
              </p>
            )}
          </div>
          <div className="text-end">
            <span className="text-xs text-muted-foreground">{ar ? "المجموع" : "Total"}</span>
            <p className="text-base font-bold tabular-nums text-foreground">
              {formatMoney(order.total, order.currency)}
            </p>
          </div>
        </div>
      </Link>
    </li>
  );
}
