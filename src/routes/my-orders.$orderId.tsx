import { useLanguage } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, PackageOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StoreLayout } from "@/components/StoreLayout";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import {
  loadMyOrderItems,
  loadMyOrders,
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
            <h1 className="text-lg font-semibold">{ar ? "سجّل الدخول لعرض الطلب" : "Sign in to view this order"}</h1>
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

        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
          <div className="p-4 sm:p-5">
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

          <div className="border-t border-border/60 px-4 py-4 sm:px-5">
            <h2 className="text-sm font-semibold">{ar ? "عناصر الطلب" : "Your order"}</h2>

            {itemsQuery.isLoading ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {ar ? "جارٍ تحميل العناصر..." : "Loading items..."}
              </p>
            ) : itemsQuery.isError ? (
              <p className="mt-3 text-sm text-rose-600">
                {ar ? "تعذر تحميل العناصر." : "Unable to load order items."}
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border/50">
                {(itemsQuery.data ?? []).map((item) => (
                  <li key={item.itemId} className="flex items-center gap-3 py-3">
                    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-border/60 bg-muted/25">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-full w-full object-contain p-1.5"
                        />
                      ) : (
                        <PackageOpen className="h-5 w-5 text-muted-foreground/35" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs font-medium text-primary">×{item.quantity}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-end justify-between border-t border-border/60 px-4 py-4 sm:px-5">
            <span className="text-sm text-muted-foreground">{ar ? "المجموع" : "Total"}</span>
            <span className="text-xl font-bold tabular-nums">
              {formatMoney(order.total, order.currency)}
            </span>
          </div>
        </section>
      </div>
    </StoreLayout>
  );
}
