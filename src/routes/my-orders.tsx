import { useLanguage } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, ChevronDown, Circle, Flag, PackageCheck, PackageOpen, Receipt, Truck, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StoreLayout } from "@/components/StoreLayout";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import {
  loadMyOrders,
  loadMyOrderItems,
  type CustomerOrderSummary,
  type CustomerOrderItem,
} from "@/lib/customerAccount";
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

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusTone(status: string) {
  const value = status.toLowerCase();
  if (value.includes("done") || value.includes("complete") || value.includes("deliver"))
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (value.includes("cancel")) return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  if (value.includes("ready") || value.includes("ship") || value.includes("transit"))
    return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
  if (value.includes("pending") || value.includes("process") || value.includes("paid"))
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "bg-muted text-muted-foreground";
}

const CUSTOMER_STAGES = ["received", "preparing", "ready", "on_the_way", "delivered"] as const;

function customerStageIndex(status: string) {
  if (status === "processing") return 1;
  if (status === "ready") return 2;
  if (status === "out_for_delivery") return 3;
  if (status === "delivered" || status === "done") return 4;
  return 0;
}

function customerStatusLabel(status: string, ar: boolean) {
  const labels: Record<string, [string, string]> = {
    new: ["Received", "تم استلام الطلب"],
    confirmed: ["Received", "تم استلام الطلب"],
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

function formatStageTime(value: string, ar: boolean) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(ar ? "ar-LB" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function stageTime(order: CustomerOrderSummary, stage: (typeof CUSTOMER_STAGES)[number]) {
  const statusByStage: Record<(typeof CUSTOMER_STAGES)[number], string[]> = {
    received: ["new", "confirmed"],
    preparing: ["processing"],
    ready: ["ready"],
    on_the_way: ["out_for_delivery"],
    delivered: ["delivered", "done"],
  };
  const statuses = statusByStage[stage];
  const event = order.statusHistory.find((entry) => statuses.includes(entry.status));
  if (event?.createdAt) return event.createdAt;
  if (stage === "received") return order.createdAt;
  if (stage === "delivered") return order.completedAt;
  return "";
}

function OrderProgress({ order, ar }: { order: CustomerOrderSummary; ar: boolean }) {
  const { status } = order;
  if (status === "cancelled") {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm font-semibold text-rose-700 dark:text-rose-300">
        <XCircle className="h-4 w-4" aria-hidden />
        <span>{ar ? "تم إلغاء الطلب" : "This order was cancelled"}</span>
        {(() => {
          const cancelledAt = order.statusHistory.find((entry) => entry.status === "cancelled")?.createdAt;
          const time = cancelledAt ? formatStageTime(cancelledAt, ar) : "";
          return time ? <span className="ms-auto text-xs font-medium opacity-80">{time}</span> : null;
        })()}
      </div>
    );
  }

  const current = customerStageIndex(status);
  const labels = ar
    ? ["تم الاستلام", "قيد التحضير", "جاهز", "في الطريق", "تم التوصيل"]
    : ["Received", "Preparing", "Ready", "On the way", "Delivered"];
  const icons = [Check, PackageCheck, PackageCheck, Truck, Flag];

  return (
    <div className="mt-5 pb-1">
      <div className="relative px-0.5">
        <div className="absolute left-[10%] right-[10%] top-4 h-0.5 rounded-full bg-border" aria-hidden />
        <div
          className="absolute left-[10%] top-4 h-0.5 rounded-full bg-emerald-500 transition-[width] duration-300"
          style={{ width: `${current * 20}%` }}
          aria-hidden
        />
        <div className="relative grid grid-cols-5">
          {CUSTOMER_STAGES.map((stage, index) => {
            const complete = index < current || (current === 4 && index === 4);
            const active = index === current && current !== 4;
            const Icon = complete ? Check : icons[index] ?? Circle;
            return (
              <div key={stage} className="flex min-w-0 flex-col items-center text-center">
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-full border-2 bg-card transition-colors",
                    complete && "border-emerald-500 bg-emerald-500 text-white",
                    active &&
                      (index === 1
                        ? "border-amber-500 bg-amber-500 text-white ring-4 ring-amber-500/10"
                        : "border-primary bg-primary text-primary-foreground ring-4 ring-primary/10"),
                    !complete && !active && "border-border bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span
                  className={cn(
                    "mt-2 max-w-[70px] text-[9px] font-semibold leading-tight sm:max-w-[84px] sm:text-[10px]",
                    complete && "text-emerald-700 dark:text-emerald-300",
                    active &&
                      (index === 1 ? "text-amber-600 dark:text-amber-300" : "text-primary"),
                    !complete && !active && "text-muted-foreground",
                  )}
                >
                  {labels[index]}
                </span>
                <span className="mt-1 min-h-4 text-[9px] tabular-nums text-muted-foreground">
                  {(() => {
                    const time = stageTime(order, stage);
                    return time ? formatStageTime(time, ar) : "—";
                  })()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
      <div className="mx-auto max-w-3xl px-4 py-8">
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
  const { t } = useLanguage();
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

  return (
    <ul className="space-y-3">
      {orders.map((order) => (
        <OrderCard key={order.orderId} order={order} />
      ))}
    </ul>
  );
}

function OrderCard({ order }: { order: CustomerOrderSummary }) {
  const { t, language } = useLanguage();
  const ar = language === "ar";
  const [expanded, setExpanded] = useState(false);

  const itemsQuery = useQuery({
    queryKey: ["my-orders", order.orderId, "items"],
    queryFn: () => loadMyOrderItems(order.orderId),
    enabled: expanded,
    retry: 1,
  });

  return (
    <li className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">
              {t("orderNumber")} #{order.publicOrderNumber}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                statusTone(order.status),
              )}
            >
              {customerStatusLabel(order.status, ar)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("orderDate")}: {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t("orderTotal")}
          </p>
          <p className="text-base font-bold">{formatMoney(order.total, order.currency)}</p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <OrderProgress order={order} ar={ar} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 px-4 py-2.5 text-xs text-muted-foreground">
        <span>
          {t("orderPayment")}:{" "}
          <span className="font-medium text-foreground">
            {order.paymentStatus || "—"}
            {order.paymentMethod ? ` · ${order.paymentMethod}` : ""}
          </span>
        </span>
        {order.city ? (
          <span>
            {t("orderDelivery")}: <span className="font-medium text-foreground">{order.city}</span>
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-muted/40"
        aria-expanded={expanded}
      >
        <span>{expanded ? t("hideItems") : t("viewItems")}</span>
        <ChevronDown
          aria-hidden
          className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded ? (
        <div className="border-t border-border/60 px-4 py-3">
          {itemsQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">{t("myOrdersLoading")}</p>
          ) : itemsQuery.isError ? (
            <p className="text-xs text-rose-700 dark:text-rose-300">{t("myOrdersFailed")}</p>
          ) : (
            <OrderItems items={itemsQuery.data ?? []} />
          )}
        </div>
      ) : null}
    </li>
  );
}

function OrderItems({ items }: { items: CustomerOrderItem[] }) {
  const { t } = useLanguage();

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("myOrdersEmpty")}</p>;
  }

  return (
    <ul className="divide-y divide-border/50">
      {items.map((item) => {
        const showVariant =
          Boolean(item.variantTitle) &&
          item.variantTitle.trim().toLowerCase() !== "default title";

        return (
          <li key={item.itemId} className="flex items-center gap-3 py-3">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border/60 bg-muted/30">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <PackageOpen className="h-6 w-6 text-muted-foreground/40" aria-hidden />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</p>
              {showVariant ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">{item.variantTitle}</p>
              ) : null}
              <div className="mt-2 inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                {t("orderItemQty")}: {item.quantity}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
