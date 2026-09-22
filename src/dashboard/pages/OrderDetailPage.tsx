import {
  ArrowLeft,
  Check,
  Loader2,
  Package,
  RefreshCw,
  Send,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
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

function Badge({ label, tone = "slate" }: { label: string; tone?: "slate" | "blue" | "green" | "rose" | "amber" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${tones[tone]}`}>{label}</span>;
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
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="text-[13px] font-bold text-[#14203a]">{title}</div>
        {subtitle ? <div className="mt-0.5 text-[11px] text-slate-400">{subtitle}</div> : null}
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
  const [, navigate] = useLocation();
  const [order, setOrder] = useState<DashboardOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deliveryType, setDeliveryType] = useState<Exclude<DashboardDeliveryType, "pending">>("free");
  const [deliveryFee, setDeliveryFee] = useState("0");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getDashboardOrder(id);
      setOrder(next);
      if (next) {
        setDeliveryType(next.deliveryType === "paid" ? "paid" : "free");
        setDeliveryFee(String(next.shippingTotal));
      }
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load order.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const nextStatus = useMemo(() => (order ? nextOrderStatus(order.status) : null), [order]);

  const changeStatus = async (status: DashboardOrderStatus) => {
    if (!order || saving) return;
    setSaving(true);
    try {
      const next = await updateDashboardOrderStatus(order.id, status, order.version);
      setOrder(next);
      toast.success(`Order #${order.orderNumber} marked ${orderStatusLabel(status)}.`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Order status update failed.");
    } finally {
      setSaving(false);
    }
  };

  const changePayment = async (status: DashboardPaymentStatus) => {
    if (!order || saving || status === order.paymentStatus) return;
    setSaving(true);
    try {
      const next = await updateDashboardOrderPaymentStatus(order.id, status, order.version);
      setOrder(next);
      toast.success(`Payment status changed to ${paymentStatusLabel(status)}.`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Payment status update failed.");
    } finally {
      setSaving(false);
    }
  };

  const changeDelivery = async () => {
    if (!order || saving) return;
    const fee = deliveryType === "free" ? 0 : Number(deliveryFee);
    if (!Number.isFinite(fee) || fee < 0 || fee > 10000) {
      toast.error("Delivery fee must be between 0 and 10000.");
      return;
    }

    setSaving(true);
    try {
      const next = await updateDashboardOrderDelivery(
        order.id,
        deliveryType,
        fee,
        order.version,
      );
      setOrder(next);
      if (next) {
        setDeliveryType(next.deliveryType === "paid" ? "paid" : "free");
        setDeliveryFee(String(next.shippingTotal));
      }
      toast.success(deliveryType === "free" ? "Free delivery applied." : "Delivery fee updated.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Delivery update failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !order) {
    return (
      <div className="grid min-h-[420px] place-items-center">
        <Loader2 className="size-6 animate-spin text-[#5968ea]" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div>
        <button
          onClick={() => navigate("/dashboard/orders")}
          className="mb-6 flex items-center gap-2 text-[12px] font-semibold text-slate-500"
        >
          <ArrowLeft className="size-4" /> Back to orders
        </button>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6">
          <div className="text-sm font-bold text-rose-700">
            {error.includes("not found") ? "Order not found." : "Order could not be loaded."}
          </div>
          <div className="mt-1 text-xs text-rose-600">{error}</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <button
          onClick={() => navigate("/dashboard/orders")}
          className="mb-6 flex items-center gap-2 text-[12px] font-semibold text-slate-500"
        >
          <ArrowLeft className="size-4" /> Back to orders
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Order not found.
        </div>
      </div>
    );
  }

  const canCancel = ["new", "confirmed", "processing", "out_for_delivery"].includes(order.status);
  const canEditDelivery =
    order.paymentStatus === "unpaid" &&
    !["delivered", "done", "cancelled"].includes(order.status);
  const canAdvanceStatus = nextStatus !== "done" || order.paymentStatus !== "unpaid";
  const allowedPaymentStatuses = paymentStatusOptions(order.paymentStatus);
  const money = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: order.currency || "USD",
    }).format(value);

  return (
    <div>
      <button
        onClick={() => navigate("/dashboard/orders")}
        className="mb-6 flex items-center gap-2 text-[12px] font-semibold text-slate-500 hover:text-[#5968ea]"
      >
        <ArrowLeft className="size-4" /> Back to orders
      </button>

      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            Order / #{order.orderNumber}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">
              Order #{order.orderNumber}
            </h1>
            <Badge label={orderStatusLabel(order.status)} tone={statusTone(order.status)} />
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            Placed {new Date(order.createdAt).toLocaleString()} by {order.customerName}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-bold text-slate-600"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {canCancel ? (
            <button
              onClick={() => void changeStatus("cancelled")}
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 text-[11px] font-bold text-rose-600 disabled:opacity-50"
            >
              <X className="size-3.5" /> Cancel order
            </button>
          ) : null}
          {nextStatus ? (
            <button
              onClick={() => void changeStatus(nextStatus)}
              disabled={saving || !canAdvanceStatus}
              title={
                !canAdvanceStatus
                  ? "Mark the payment as paid before completing this order."
                  : undefined
              }
              className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-3.5 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : nextStatus === "delivered" ? <Check className="size-3.5" /> : <Send className="size-3.5" />}
              {nextStatus === "confirmed"
                ? "Confirm order"
                : nextStatus === "processing"
                  ? "Start processing"
                  : nextStatus === "out_for_delivery"
                    ? "Out for delivery"
                    : nextStatus === "delivered"
                      ? "Mark delivered"
                      : "Mark DONE"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-4">
          <Panel title="Order items" subtitle={`${order.items.length} line item${order.items.length === 1 ? "" : "s"}`}>
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
                      <div className="text-[12px] font-bold text-slate-700">{item.title}</div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        {[item.variantTitle, item.sku ? `SKU ${item.sku}` : "", `Qty ${item.quantity}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[12px] font-bold text-slate-700">{money(item.lineTotal)}</div>
                      <div className="mt-0.5 text-[9px] text-slate-400">{money(item.unitPrice)} each</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center text-[11px] text-slate-400">No order items found.</div>
            )}

            <div className="space-y-2 border-t border-slate-100 px-5 py-4 text-[12px]">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{money(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Shipping</span>
                <span>{money(order.shippingTotal)}</span>
              </div>
              {order.discountTotal > 0 ? (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{money(order.discountTotal)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-slate-100 pt-3 text-[14px] font-bold text-[#14203a]">
                <span>Total</span>
                <span>{money(order.total)}</span>
              </div>
            </div>
          </Panel>

          <Panel title="Order status" subtitle="Validated status progression">
            <div className="grid gap-3 px-5 py-5 sm:grid-cols-3">
              {(["new", "confirmed", "processing", "out_for_delivery", "delivered", "done"] as const).map((step) => {
                const flow = ["new", "confirmed", "processing", "out_for_delivery", "delivered", "done"] as const;
                const orderIndex = flow.indexOf(order.status as (typeof flow)[number]);
                const stepIndex = flow.indexOf(step);
                const reached = order.status !== "cancelled" && stepIndex <= orderIndex;
                return (
                  <div
                    key={step}
                    className={`rounded-xl border p-3 ${reached ? "border-indigo-100 bg-indigo-50" : "border-slate-100 bg-slate-50"}`}
                  >
                    <div className={`text-[10px] font-bold ${reached ? "text-indigo-700" : "text-slate-400"}`}>
                      {orderStatusLabel(step)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Customer">
            <div className="flex items-start gap-3 px-5 py-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-full bg-indigo-50 text-indigo-600">
                <User className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-slate-700">{order.customerName}</div>
                <div className="mt-1 text-[11px] text-slate-500">{order.customerPhone}</div>
                {order.customerEmail ? (
                  <div className="mt-0.5 truncate text-[11px] text-slate-400">{order.customerEmail}</div>
                ) : null}
              </div>
            </div>
          </Panel>

          <Panel title="Delivery" subtitle="Server-controlled fee. Changes are version-checked and audited.">
            <div className="space-y-4 px-5 py-4 text-[12px] text-slate-500">
              <div>
                <div>{order.deliveryAddress || "No delivery address provided."}</div>
                {order.city ? <div className="mt-1">{order.city}</div> : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <label>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Delivery
                  </span>
                  <select
                    value={deliveryType}
                    onChange={(event) =>
                      setDeliveryType(event.target.value as Exclude<DashboardDeliveryType, "pending">)
                    }
                    disabled={!canEditDelivery || saving}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 disabled:bg-slate-50 disabled:opacity-60"
                  >
                    <option value="free">Free Delivery</option>
                    <option value="paid">Paid Delivery</option>
                  </select>
                </label>

                <label>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Fee
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={deliveryType === "free" ? "0" : deliveryFee}
                    onChange={(event) => setDeliveryFee(event.target.value)}
                    disabled={!canEditDelivery || saving || deliveryType === "free"}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 disabled:bg-slate-50 disabled:opacity-60"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void changeDelivery()}
                  disabled={!canEditDelivery || saving}
                  className="mt-auto h-10 rounded-xl bg-[#14203a] px-4 text-[11px] font-bold text-white disabled:opacity-40"
                >
                  Save delivery
                </button>
              </div>

              {!canEditDelivery ? (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-[10px] text-slate-400">
                  Delivery pricing locks after payment or when the order reaches a final stage.
                </div>
              ) : null}

              <div className="pt-1 text-[10px] text-slate-400">
                Source: {order.source} · Payment method: {order.paymentMethod} · Version {order.version}
              </div>
            </div>
          </Panel>

          <Panel title="Payment">
            <div className="space-y-3 px-5 py-4">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Payment status
                </span>
                <select
                  value={order.paymentStatus}
                  onChange={(event) => void changePayment(event.target.value as DashboardPaymentStatus)}
                  disabled={saving}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 disabled:opacity-60"
                >
                  {allowedPaymentStatuses.map((value) => (
                    <option key={value} value={value}>
                      {paymentStatusLabel(value)}
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
            <Panel title="Notes & reference">
              <div className="space-y-3 px-5 py-4 text-[11px] text-slate-500">
                {order.customerReference ? (
                  <div>
                    <span className="font-bold text-slate-600">Reference:</span> {order.customerReference}
                  </div>
                ) : null}
                {order.notes ? <div className="leading-5">{order.notes}</div> : null}
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-[11px] text-amber-700">
          Last refresh warning: {error}
        </div>
      ) : null}
    </div>
  );
}
