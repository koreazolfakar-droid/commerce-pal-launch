import { useLanguage } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Circle,
  CreditCard,
  Flag,
  MapPin,
  PackageCheck,
  PackageOpen,
  Truck,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StoreLayout } from "@/components/StoreLayout";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import {
  loadMyOrderItems,
  loadMyOrders,
  type CustomerOrderItem,
  type CustomerOrderSummary,
} from "@/lib/customerAccount";
import { STORE_NAME } from "@/lib/storeConfig";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my-orders/$orderId")({
  head: () => ({
    meta: [
      { title: `Order details — ${STORE_NAME}` },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: CustomerOrderDetailsPage,
});

const CUSTOMER_STAGES = ["received", "preparing", "ready", "on_the_way", "delivered"] as const;

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

function formatStageTime(value: string, ar: boolean) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(ar ? "ar-LB" : "en-GB", {
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

function customerStageIndex(status: string) {
  if (status === "processing") return 1;
  if (status === "ready") return 2;
  if (status === "out_for_delivery") return 3;
  if (status === "delivered" || status === "done") return 4;
  return 0;
}

function stageTime(
  order: CustomerOrderSummary,
  stage: (typeof CUSTOMER_STAGES)[number],
) {
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

function OrderProgress({
  order,
  ar,
}: {
  order: CustomerOrderSummary;
  ar: boolean;
}) {
  if (order.status === "cancelled") {
    const cancelledAt = order.statusHistory.find(
      (entry) => entry.status === "cancelled",
    )?.createdAt;

    return (
      <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
        <XCircle className="h-4 w-4" aria-hidden />
        <span>{ar ? "تم إلغاء الطلب" : "This order was cancelled"}</span>
        {cancelledAt ? (
          <span className="ms-auto text-xs font-medium tabular-nums opacity-80">
            {formatStageTime(cancelledAt, ar)}
          </span>
        ) : null}
      </div>
    );
  }

  const current = customerStageIndex(order.status);
  const labels = ar
    ? ["تم الاستلام", "قيد التحضير", "جاهز", "في الطريق", "تم التوصيل"]
    : ["Received", "Preparing", "Ready", "On the way", "Delivered"];
  const icons = [Check, PackageCheck, PackageCheck, Truck, Flag];

  return (
    <div className="overflow-hidden">
      <div className="relative px-0.5">
        <div
          className="absolute left-[10%] right-[10%] top-4 h-0.5 rounded-full bg-border"
          aria-hidden
        />
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
            const time = stageTime(order, stage);

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
                    "mt-2 max-w-[68px] text-[9px] font-semibold leading-tight sm:max-w-[88px] sm:text-[10px]",
                    complete && "text-emerald-700 dark:text-emerald-300",
                    active &&
                      (index === 1
                        ? "text-amber-600 dark:text-amber-300"
                        : "text-primary"),
                    !complete && !active && "text-muted-foreground",
                  )}
                >
                  {labels[index]}
                </span>
                <span className="mt-1 min-h-4 text-[9px] tabular-nums text-muted-foreground">
                  {time ? formatStageTime(time, ar) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProductLine({
  item,
  currency,
  ar,
}: {
  item: CustomerOrderItem;
  currency: string;
  ar: boolean;
}) {
  const showVariant =
    Boolean(item.variantTitle) &&
    item.variantTitle.trim().toLowerCase() !== "default title";

  return (
    <li className="flex gap-3 py-4">
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border/60 bg-muted/25">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain p-1.5"
          />
        ) : (
          <PackageOpen className="h-6 w-6 text-muted-foreground/35" aria-hidden />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
              {item.title}
            </p>
            {showVariant ? (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {item.variantTitle}
              </p>
            ) : null}
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
            {formatMoney(item.lineTotal, currency)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="font-semibold text-primary">×{item.quantity}</span>
          <span className="text-muted-foreground">•</span>
          <span className="font-normal text-muted-foreground">
            {formatMoney(item.unitPrice, currency)} {ar ? "للقطعة" : "each"}
          </span>
        </div>
      </div>
    </li>
  );
}

function PriceRow({
  label,
  value,
  currency,
  strong = false,
  muted = false,
}: {
  label: string;
  value: number;
  currency: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4",
        strong ? "text-base font-bold" : "text-sm",
        muted && "text-muted-foreground",
      )}
    >
      <span>{label}</span>
      <span className="shrink-0 tabular-nums">{formatMoney(value, currency)}</span>
    </div>
  );
}

function CustomerOrderDetailsPage() {
  const { orderId } = Route.useParams();
  const { language } = useLanguage();
  const ar = language === "ar";
  const BackIcon = ar ? ArrowRight : ArrowLeft;
  const { user, loading: authLoading, openAuth } = useCustomerAuth();

  const ordersQuery = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => loadMyOrders(100),
    enabled: Boolean(user),
    retry: 1,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const order = (ordersQuery.data ?? []).find((entry) => entry.orderId === orderId) ?? null;

  const itemsQuery = useQuery({
    queryKey: ["my-orders", orderId, "items"],
    queryFn: () => loadMyOrderItems(orderId),
    enabled: Boolean(user && order),
    retry: 1,
  });

  if (authLoading) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-muted-foreground">
          {ar ? "جارٍ التحميل..." : "Loading order..."}
        </div>
      </StoreLayout>
    );
  }

  if (!user) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-2xl border bg-card p-6 text-center">
            <h1 className="text-lg font-semibold">
              {ar ? "سجّل الدخول لعرض الطلب" : "Sign in to view this order"}
            </h1>
            <Button className="mt-4" onClick={() => openAuth()}>
              {ar ? "تسجيل الدخول" : "Sign in"}
            </Button>
          </div>
        </div>
      </StoreLayout>
    );
  }

  if (ordersQuery.isLoading) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-muted-foreground">
          {ar ? "جارٍ تحميل الطلب..." : "Loading order..."}
        </div>
      </StoreLayout>
    );
  }

  if (ordersQuery.isError || !order) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Link
            to="/my-orders"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <BackIcon className="h-4 w-4" aria-hidden />
            {ar ? "العودة إلى طلباتي" : "Back to My orders"}
          </Link>
          <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
            {ar ? "تعذر العثور على هذا الطلب." : "This order could not be found."}
          </div>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="mx-auto max-w-3xl px-4 py-7 sm:py-8">
        <Link
          to="/my-orders"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <BackIcon className="h-4 w-4" aria-hidden />
          {ar ? "طلباتي" : "My orders"}
        </Link>

        <div className="space-y-4">
          <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-card sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold">
                    {ar ? "طلب" : "Order"} #{order.publicOrderNumber}
                  </h1>
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
            </div>

            <div className="mt-6">
              <OrderProgress order={order} ar={ar} />
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-card sm:p-5">
            <h2 className="text-sm font-semibold">
              {ar ? "معلومات التوصيل والدفع" : "Delivery & payment"}
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted">
                  <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {ar ? "التوصيل" : "Delivery"}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    {order.city || (ar ? "العنوان المحفوظ" : "Saved address")}
                  </p>
                  {order.deliveryAddress ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {order.deliveryAddress}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted">
                  <CreditCard className="h-4 w-4 text-muted-foreground" aria-hidden />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {ar ? "الدفع" : "Payment"}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold capitalize text-foreground">
                    {[order.paymentMethod, order.paymentStatus].filter(Boolean).join(" · ") ||
                      (ar ? "غير محدد" : "Not specified")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
            <div className="px-4 pt-4 sm:px-5 sm:pt-5">
              <h2 className="text-base font-semibold">
                {ar ? "طلبك" : "Your order"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {order.itemCount} {ar ? "عنصر" : order.itemCount === 1 ? "item" : "items"}
              </p>
            </div>

            <div className="px-4 sm:px-5">
              {itemsQuery.isLoading ? (
                <p className="py-5 text-sm text-muted-foreground">
                  {ar ? "جارٍ تحميل العناصر..." : "Loading items..."}
                </p>
              ) : itemsQuery.isError ? (
                <p className="py-5 text-sm text-rose-600">
                  {ar ? "تعذر تحميل العناصر." : "Unable to load order items."}
                </p>
              ) : (
                <ul className="divide-y divide-border/50">
                  {(itemsQuery.data ?? []).map((item) => (
                    <ProductLine
                      key={item.itemId}
                      item={item}
                      currency={order.currency}
                      ar={ar}
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-card sm:p-5">
            <h2 className="text-sm font-semibold">
              {ar ? "ملخص الدفع" : "Order summary"}
            </h2>

            <div className="mt-4 space-y-3">
              <PriceRow
                label={ar ? "المجموع الفرعي" : "Subtotal"}
                value={order.subtotal}
                currency={order.currency}
                muted
              />
              <PriceRow
                label={ar ? "رسوم التوصيل" : "Delivery"}
                value={order.shippingTotal}
                currency={order.currency}
                muted
              />
              {order.discountTotal > 0 ? (
                <PriceRow
                  label={ar ? "الخصم" : "Discount"}
                  value={-Math.abs(order.discountTotal)}
                  currency={order.currency}
                  muted
                />
              ) : null}

              <div className="border-t border-border/70 pt-3">
                <PriceRow
                  label={ar ? "الإجمالي" : "Total"}
                  value={order.total}
                  currency={order.currency}
                  strong
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </StoreLayout>
  );
}
