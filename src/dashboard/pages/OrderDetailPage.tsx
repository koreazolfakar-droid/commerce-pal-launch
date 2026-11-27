import DashboardConfirmDialog from "@/dashboard/components/DashboardConfirmDialog";
import { dashboardListHref } from "@/dashboard/lib/listContext";
import { OrderDeliveryLocation } from "@/dashboard/components/orders/OrderDeliveryLocation";
import { useLanguage } from "@/dashboard/i18n";
import { ArrowLeft, Check, Loader2, Package, RefreshCw, Send, User, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import {
  getDashboardOrder,
  nextOrderStatus,
  orderStatusLabel,
  paymentStatusLabel,
  updateDashboardOrderDelivery,
  updateDashboardOrderPaymentStatus,
  updateDashboardOrderStatus,
  type DashboardDeliveryType,
  type DashboardOrderDetail,
  type DashboardOrderStatus,
  type DashboardPaymentStatus,
} from "@/dashboard/data/orders";

function Badge({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "slate" | "blue" | "green" | "rose" | "amber";
}) {
  const { t } = useLanguage();
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${tones[tone]}`}>
      {t(label)}
    </span>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="text-[13px] font-bold text-[#14203a]">{t(title)}</div>
        {subtitle ? <div className="mt-0.5 text-[11px] text-slate-400">{t(subtitle)}</div> : null}
      </div>
      {children}
    </div>
  );
}

function statusTone(status: DashboardOrderStatus) {
  if (status === "delivered" || status === "done") return "green" as const;
  if (status === "cancelled") return "rose" as const;
  if (status === "new") return "amber" as const;
  return "blue" as const;
}

function paymentStatusOptions(status: DashboardPaymentStatus): DashboardPaymentStatus[] {
  if (status === "unpaid") return ["unpaid", "paid"];
  if (status === "paid") return ["paid", "partially_refunded", "refunded"];
  if (status === "partially_refunded") return ["partially_refunded", "refunded"];
  return ["refunded"];
}

export default function OrderDetailPage({ id }: { id: string }) {
  const { t, lang } = useLanguage();
  const [, navigate] = useLocation();
  const [order, setOrder] = useState<DashboardOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const mutationOrderId = useRef<string | null>(null);
  const mounted = useRef(true);
  const [error, setError] = useState("");
  const [deliveryType, setDeliveryType] =
    useState<Exclude<DashboardDeliveryType, "pending">>("free");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const requestVersion = useRef(0);
  const currentOrderId = useRef(id);
  currentOrderId.current = id;

  const load = useCallback(async () => {
    // A refresh must not replace the result of a pending version-checked mutation.
    if (mutationOrderId.current === id) return;
    const request = ++requestVersion.current;
    setLoading(true);
    setOrder((current) => (current?.id === id ? current : null));
    setError("");
    try {
      const next = await getDashboardOrder(id);
      if (request !== requestVersion.current || currentOrderId.current !== id) return;
      setOrder(next);
      if (next) {
        setDeliveryType(next.deliveryType === "paid" ? "paid" : "free");
        setDeliveryFee(String(next.shippingTotal));
      }
    } catch (cause) {
      if (request !== requestVersion.current || currentOrderId.current !== id) return;
      setError(cause instanceof Error ? cause.message : "Unable to load order.");
    } finally {
      if (request === requestVersion.current && currentOrderId.current === id) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    mounted.current = true;
    setCancelOrderId(null);
    void load();
    return () => {
      // Ignore an older order response when navigating or unmounting.
      mounted.current = false;
      requestVersion.current += 1;
    };
  }, [load]);

  const nextStatus = useMemo(
    () => (order?.id === id ? nextOrderStatus(order.status) : null),
    [order, id],
  );

  const changeStatus = async (status: DashboardOrderStatus) => {
    if (!order || saving || loading || mutationOrderId.current) return;
    mutationOrderId.current = order.id;
    const mutationRequest = ++requestVersion.current;
    setLoading(false);
    setSaving(true);
    try {
      const next = await updateDashboardOrderStatus(order.id, status, order.version);
      if (currentOrderId.current !== order.id) return;
      if (!mounted.current) return;
      setOrder(next);
      if (status === "cancelled") setCancelOrderId(null);
      toast.success(`Order #${order.publicOrderNumber} marked ${orderStatusLabel(status)}.`);
    } catch (cause) {
      if (!mounted.current || currentOrderId.current !== order.id) return;
      toast.error(cause instanceof Error ? cause.message : "Order status update failed.");
    } finally {
      mutationOrderId.current = null;
      if (mounted.current) {
        setSaving(false);
        if (currentOrderId.current === order.id) {
          if (requestVersion.current !== mutationRequest) void load();
          else setLoading(false);
        }
      }
    }
  };

  const changePayment = async (status: DashboardPaymentStatus) => {
    if (!order || saving || loading || mutationOrderId.current || status === order.paymentStatus) return;
    mutationOrderId.current = order.id;
    const mutationRequest = ++requestVersion.current;
    setLoading(false);
    setSaving(true);
    try {
      const next = await updateDashboardOrderPaymentStatus(order.id, status, order.version);
      if (currentOrderId.current !== order.id) return;
      if (!mounted.current) return;
      setOrder(next);
      toast.success(`Payment status changed to ${paymentStatusLabel(status)}.`);
    } catch (cause) {
      if (!mounted.current || currentOrderId.current !== order.id) return;
      toast.error(cause instanceof Error ? cause.message : "Payment status update failed.");
    } finally {
      mutationOrderId.current = null;
      if (mounted.current) {
        setSaving(false);
        if (currentOrderId.current === order.id) {
          if (requestVersion.current !== mutationRequest) void load();
          else setLoading(false);
        }
      }
    }
  };

  const changeDelivery = async () => {
    if (!order || saving || loading || mutationOrderId.current) return;
    if (deliveryType === "paid" && !deliveryFee.trim()) {
      toast.error(lang === "ar" ? "أدخل رسوم التوصيل." : "Enter a delivery fee.");
      return;
    }
    const fee = deliveryType === "free" ? 0 : Number(deliveryFee);
    if (!Number.isFinite(fee) || fee < 0 || fee > 10000) {
      toast.error("Delivery fee must be between 0 and 10000.");
      return;
    }

    if (deliveryType === order.deliveryType && fee === order.shippingTotal) return;
    mutationOrderId.current = order.id;
    const mutationRequest = ++requestVersion.current;
    setLoading(false);
    setSaving(true);
    try {
      const next = await updateDashboardOrderDelivery(order.id, deliveryType, fee, order.version);
      if (currentOrderId.current !== order.id) return;
      if (!mounted.current) return;
      setOrder(next);
      if (next) {
        setDeliveryType(next.deliveryType === "paid" ? "paid" : "free");
        setDeliveryFee(String(next.shippingTotal));
      }
      toast.success(deliveryType === "free" ? "Free delivery applied." : "Delivery fee updated.");
    } catch (cause) {
      if (!mounted.current || currentOrderId.current !== order.id) return;
      toast.error(cause instanceof Error ? cause.message : "Delivery update failed.");
    } finally {
      mutationOrderId.current = null;
      if (mounted.current) {
        setSaving(false);
        if (currentOrderId.current === order.id) {
          if (requestVersion.current !== mutationRequest) void load();
          else setLoading(false);
        }
      }
    }
  };

  if (loading && (!order || order.id !== id)) {
    return (
      <div className="grid min-h-[420px] place-items-center">
        <Loader2 className="size-6 animate-spin text-[#5968ea]" />
      </div>
    );
  }

  if (error && (!order || order.id !== id)) {
    return (
      <div>
        <button
          onClick={() => navigate(dashboardListHref("/dashboard/orders"))}
          className="mb-6 flex items-center gap-2 text-[12px] font-semibold text-slate-500"
        >
          <ArrowLeft className="size-4" /> {t("Back to orders")}
        </button>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6">
          <div className="text-sm font-bold text-rose-700">
            {error.includes("not found") ? t("Order not found.") : t("Order could not be loaded.")}
          </div>
          <div className="mt-1 text-xs text-rose-600">{error}</div>
          <button type="button" onClick={() => void load()} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            {t("Retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!order || order.id !== id) {
    return (
      <div>
        <button
          onClick={() => navigate(dashboardListHref("/dashboard/orders"))}
          className="mb-6 flex items-center gap-2 text-[12px] font-semibold text-slate-500"
        >
          <ArrowLeft className="size-4" /> {t("Back to orders")}
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {t("Order not found.")}
        </div>
      </div>
    );
  }

  const canCancel = ["new", "confirmed", "processing", "ready", "out_for_delivery"].includes(
    order.status,
  );
  const canEditDelivery =
    order.paymentStatus === "unpaid" && !["delivered", "done", "cancelled"].includes(order.status);
  const canAdvanceStatus = nextStatus !== "done" || order.paymentStatus !== "unpaid";
  const allowedPaymentStatuses = paymentStatusOptions(order.paymentStatus);
  const deliveryChanged = deliveryType !== order.deliveryType ||
    (deliveryType === "free" ? 0 : Number(deliveryFee)) !== order.shippingTotal;
  const money = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: order.currency || "USD",
    }).format(value);

  return (
    <div>
      <button
        onClick={() => navigate(dashboardListHref("/dashboard/orders"))}
        className="mb-6 flex items-center gap-2 text-[12px] font-semibold text-slate-500 hover:text-[#5968ea]"
      >
        <ArrowLeft className="size-4" /> {t("Back to orders")}
      </button>

      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            {t("Order / #")} {order.publicOrderNumber}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">
              {t("Order #")} {order.publicOrderNumber}
            </h1>
            <Badge label={orderStatusLabel(order.status)} tone={statusTone(order.status)} />
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            {t("Placed")} {new Date(order.createdAt).toLocaleString()} {t("by")}{" "}
            {order.customerName}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void load()}
            disabled={loading || saving}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-bold text-slate-600"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            {t("Refresh")}
          </button>
          {canCancel ? (
            <button
              onClick={() => setCancelOrderId(order.id)}
              disabled={saving || loading}
              className="flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 text-[11px] font-bold text-rose-600 disabled:opacity-50"
            >
              <X className="size-3.5" /> {t("Cancel order")}
            </button>
          ) : null}
          {nextStatus ? (
            <button
              onClick={() => void changeStatus(nextStatus)}
              disabled={saving || loading || !canAdvanceStatus}
              title={
                !canAdvanceStatus
                  ? t("Mark the payment as paid before completing this order.")
                  : undefined
              }
              className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-3.5 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : nextStatus === "delivered" ? (
                <Check className="size-3.5" />
              ) : (
                <Send className="size-3.5" />
              )}
              {nextStatus === "confirmed"
                ? t("Confirm order")
                : nextStatus === "processing"
                  ? t("Start processing")
                  : nextStatus === "ready"
                    ? t("Mark ready")
                    : nextStatus === "out_for_delivery"
                      ? t("Out for delivery")
                      : nextStatus === "delivered"
                        ? t("Mark delivered")
                        : t("Mark DONE")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-4">
          <Panel
            title={t("Order items")}
            subtitle={`${order.items.length} line item${order.items.length === 1 ? "" : "s"}`}
          >
            {order.items.length ? (
              <div className="divide-y divide-slate-100 px-5">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-4">
                    <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="size-full object-contain p-1" />
                      ) : (
                        <Package className="size-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-bold text-slate-700">
                        {item.productId ? (
                          <Link
                            href={`/dashboard/products/${item.productId}`}
                            className="hover:text-indigo-600 hover:underline"
                          >
                            {item.title}
                          </Link>
                        ) : (
                          item.title
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        {[
                          item.variantTitle,
                          item.sku ? `SKU ${item.sku}` : "",
                          `Qty ${item.quantity}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="text-[12px] font-bold text-slate-700">
                        {money(item.lineTotal)}
                      </div>
                      <div className="mt-0.5 text-[9px] text-slate-400">
                        {money(item.unitPrice)} {t("each")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center text-[11px] text-slate-400">
                {t("No order items found.")}
              </div>
            )}

            <div className="space-y-2 border-t border-slate-100 px-5 py-4 text-[12px]">
              <div className="flex justify-between text-slate-500">
                <span>{t("Subtotal")}</span>
                <span>{money(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{t("Shipping")}</span>
                <span>{money(order.shippingTotal)}</span>
              </div>
              {order.discountTotal > 0 ? (
                <div className="flex justify-between text-emerald-600">
                  <span>{t("Discount")}</span>
                  <span>-{money(order.discountTotal)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-slate-100 pt-3 text-[14px] font-bold text-[#14203a]">
                <span>{t("Total")}</span>
                <span>{money(order.total)}</span>
              </div>
            </div>
          </Panel>

          <Panel title={t("Order status")} subtitle={t("Validated status progression")}>
            <div className="grid gap-3 px-5 py-5 sm:grid-cols-3">
              {(
                [
                  "new",
                  "confirmed",
                  "processing",
                  "ready",
                  "out_for_delivery",
                  "delivered",
                  "done",
                ] as const
              ).map((step) => {
                const flow = [
                  "new",
                  "confirmed",
                  "processing",
                  "ready",
                  "out_for_delivery",
                  "delivered",
                  "done",
                ] as const;
                const orderIndex = flow.indexOf(order.status as (typeof flow)[number]);
                const stepIndex = flow.indexOf(step);
                const reached = order.status !== "cancelled" && stepIndex <= orderIndex;
                return (
                  <div
                    key={step}
                    className={`rounded-xl border p-3 ${reached ? "border-indigo-100 bg-indigo-50" : "border-slate-100 bg-slate-50"}`}
                  >
                    <div
                      className={`text-[10px] font-bold ${reached ? "text-indigo-700" : "text-slate-400"}`}
                    >
                      {orderStatusLabel(step)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title={t("Customer")}>
            <div className="flex items-start gap-3 px-5 py-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-full bg-indigo-50 text-indigo-600">
                <User className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-slate-700">
                  <Link
                    href={`/dashboard/customers?search=${encodeURIComponent(order.customerPhone || order.customerEmail || order.customerName)}`}
                    className="text-indigo-600 hover:underline"
                  >
                    {order.customerName}
                  </Link>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">{order.customerPhone}</div>
                {order.customerEmail ? (
                  <div className="mt-0.5 truncate text-[11px] text-slate-400">
                    {order.customerEmail}
                  </div>
                ) : null}
              </div>
            </div>
          </Panel>

          <Panel
            title={t("Delivery")}
            subtitle={t("Server-controlled fee. Changes are version-checked and audited.")}
          >
            <div className="space-y-4 px-5 py-4 text-[12px] text-slate-500">
              <div>
                <div>{order.deliveryAddress || t("No delivery address provided.")}</div>
                {order.city ? <div className="mt-1">{order.city}</div> : null}
              </div>

              <OrderDeliveryLocation value={order.deliveryLocation} />

              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <label>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {t("Delivery")}
                  </span>
                  <select
                    value={deliveryType}
                    onChange={(event) =>
                      setDeliveryType(
                        event.target.value as Exclude<DashboardDeliveryType, "pending">,
                      )
                    }
                    disabled={!canEditDelivery || saving || loading}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 disabled:bg-slate-50 disabled:opacity-60"
                  >
                    <option value="free">{t("Free Delivery")}</option>
                    <option value="paid">{t("Paid Delivery")}</option>
                  </select>
                </label>

                <label>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {t("Fee")}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="0.01"
                    inputMode="decimal"
                    value={deliveryType === "free" ? "0" : deliveryFee}
                    onChange={(event) => setDeliveryFee(event.target.value)}
                    disabled={!canEditDelivery || saving || loading || deliveryType === "free"}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 disabled:bg-slate-50 disabled:opacity-60"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void changeDelivery()}
                  disabled={!canEditDelivery || saving || loading || !deliveryChanged}
                  className="mt-auto h-10 rounded-xl bg-[#14203a] px-4 text-[11px] font-bold text-white disabled:opacity-40"
                >
                  {t("Save delivery")}
                </button>
              </div>

              {!canEditDelivery ? (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-[10px] text-slate-400">
                  {t(
                    "Delivery pricing locks after payment or when the order reaches a final stage.",
                  )}
                </div>
              ) : null}

              <div className="pt-1 text-[10px] text-slate-400">
                {t("Source:")} {order.source} {t("· Payment method:")} {order.paymentMethod}{" "}
                {t("· Version")} {order.version}
              </div>
            </div>
          </Panel>

          <Panel title={t("Payment")}>
            <div className="space-y-3 px-5 py-4">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {t("Payment status")}
                </span>
                <select
                  aria-label={t("Payment status")}
                  value={order.paymentStatus}
                  onChange={(event) =>
                    void changePayment(event.target.value as DashboardPaymentStatus)
                  }
                  disabled={saving || loading}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 disabled:opacity-60"
                >
                  {allowedPaymentStatuses.map((value) => (
                    <option key={value} value={value}>
                      {t(paymentStatusLabel(value))}
                    </option>
                  ))}
                </select>
              </label>
              <Badge
                label={paymentStatusLabel(order.paymentStatus)}
                tone={
                  order.paymentStatus === "paid"
                    ? "green"
                    : order.paymentStatus.includes("refund")
                      ? "rose"
                      : "amber"
                }
              />
            </div>
          </Panel>

          {order.notes || order.customerReference ? (
            <Panel title={t("Notes & reference")}>
              <div className="space-y-3 px-5 py-4 text-[11px] text-slate-500">
                {order.customerReference ? (
                  <div>
                    <span className="font-bold text-slate-600">{t("Reference:")}</span>{" "}
                    {order.customerReference}
                  </div>
                ) : null}
                {order.notes ? <div className="leading-5">{order.notes}</div> : null}
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      <DashboardConfirmDialog
        open={cancelOrderId === order.id}
        title={lang === "ar" ? "إلغاء الطلب؟" : "Cancel order?"}
        description={lang === "ar"
          ? `سيتم إلغاء الطلب #${order.publicOrderNumber} وإعادة الكميات المحجوزة إلى المخزون. لا يمكن التراجع عن الإلغاء.`
          : `Cancel order #${order.publicOrderNumber} and return its reserved quantities to stock. This cannot be undone.`}
        confirmLabel={t("Cancel order")}
        pendingLabel={lang === "ar" ? "جارٍ الإلغاء…" : "Cancelling…"}
        destructive
        pending={saving || loading}
        onClose={() => { if (!saving && !loading) setCancelOrderId(null); }}
        onConfirm={() => { if (cancelOrderId === id) void changeStatus("cancelled"); }}
      />

      {error ? (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-[11px] text-amber-700">
          {t("Last refresh warning:")} {error}
        </div>
      ) : null}
    </div>
  );
}
