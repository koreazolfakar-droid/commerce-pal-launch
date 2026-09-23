import {
  ArrowRight,
  Copy,
  Loader2,
  Package,
  Phone,
  RefreshCw,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  getDashboardOrder,
  orderStatusLabel,
  paymentStatusLabel,
  type DashboardOrderDetail,
  type DashboardOrderStatus,
} from "@/dashboard/data/orders";

function Badge({ status }: { status: DashboardOrderStatus }) {
  const label = orderStatusLabel(status);
  const tone =
    status === "delivered" || status === "done"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : status === "cancelled"
        ? "bg-rose-50 text-rose-700 ring-rose-100"
        : status === "new"
          ? "bg-amber-50 text-amber-700 ring-amber-100"
          : status === "out_for_delivery"
            ? "bg-violet-50 text-violet-700 ring-violet-100"
            : "bg-blue-50 text-blue-700 ring-blue-100";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold ring-1 ${tone}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function money(order: DashboardOrderDetail, value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: order.currency || "USD",
  }).format(value);
}

export default function OrderQuickDrawer({
  orderId,
  onClose,
  onOpenFull,
}: {
  orderId: string | null;
  onClose: () => void;
  onOpenFull: (orderId: string) => void;
}) {
  const [order, setOrder] = useState<DashboardOrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError("");
    try {
      const next = await getDashboardOrder(orderId);
      if (!next) {
        setOrder(null);
        setError("Order not found.");
        return;
      }
      setOrder(next);
    } catch (cause) {
      setOrder(null);
      setError(cause instanceof Error ? cause.message : "Unable to load order.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setError("");
      return;
    }
    void load();
  }, [load, orderId]);

  useEffect(() => {
    if (!orderId) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, orderId]);

  const unitCount = useMemo(
    () => order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    [order],
  );

  const copyOrderNumber = async () => {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(String(order.publicOrderNumber));
      toast.success(`Order #${order.publicOrderNumber} copied.`);
    } catch {
      toast.error("Unable to copy order number.");
    }
  };

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 z-[95]">
      <button
        type="button"
        aria-label="Close order quick view"
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={order ? `Quick view for order #${order.publicOrderNumber}` : "Order quick view"}
        className="absolute inset-y-0 end-0 flex w-full max-w-[560px] flex-col bg-white shadow-[-18px_0_48px_rgba(15,23,42,.16)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-[.15em] text-[#6a70e7]">
              Order quick view
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="truncate text-[20px] font-black tracking-[-.04em] text-[#14203a]">
                {order ? `Order #${order.publicOrderNumber}` : "Loading order"}
              </h2>
              {order ? <Badge status={order.status} /> : null}
            </div>
            {order ? (
              <div className="mt-1 text-[10px] text-slate-400">
                {new Date(order.createdAt).toLocaleString()}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick view"
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && !order ? (
            <div className="grid min-h-[320px] place-items-center">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                <Loader2 className="size-4 animate-spin text-[#5968ea]" />
                Loading order details…
              </div>
            </div>
          ) : error && !order ? (
            <div className="p-5">
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <div className="text-[11px] font-bold text-rose-700">Order could not be loaded.</div>
                <div className="mt-1 break-words text-[10px] leading-5 text-rose-600">{error}</div>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200"
                >
                  <RefreshCw className="size-3.5" />
                  Retry
                </button>
              </div>
            </div>
          ) : order ? (
            <div className="space-y-4 p-4 sm:p-5">
              <section className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                    <User className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-black text-slate-700">{order.customerName}</div>
                    <div className="mt-1 text-[10px] text-slate-500">{order.customerPhone}</div>
                    {order.customerEmail ? (
                      <div className="mt-0.5 truncate text-[9px] text-slate-400">{order.customerEmail}</div>
                    ) : null}
                  </div>
                  {order.customerPhone ? (
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                      aria-label="Call customer"
                    >
                      <Phone className="size-3.5" />
                    </a>
                  ) : null}
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="text-[8px] font-bold uppercase tracking-[.12em] text-slate-400">Delivery</div>
                  <div className="mt-1 text-[10px] leading-5 text-slate-600">
                    {[order.deliveryAddress, order.city].filter(Boolean).join(", ") || "No delivery address provided."}
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <div className="text-[11px] font-black text-slate-700">Items</div>
                    <div className="mt-0.5 text-[9px] text-slate-400">
                      {order.items.length} line item{order.items.length === 1 ? "" : "s"} · {unitCount} unit{unitCount === 1 ? "" : "s"}
                    </div>
                  </div>
                  <Package className="size-4 text-slate-300" />
                </div>

                {order.items.length ? (
                  <div className="divide-y divide-slate-100">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-50">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="size-full object-contain p-1" />
                          ) : (
                            <Package className="size-4 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 text-[10px] font-bold leading-4 text-slate-700">
                            {item.title}
                          </div>
                          <div className="mt-0.5 truncate text-[9px] text-slate-400">
                            {[item.variantTitle, item.sku ? `SKU ${item.sku}` : "", `Qty ${item.quantity}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </div>
                        <div className="shrink-0 text-[10px] font-black text-slate-700">
                          {money(order, item.lineTotal)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-[10px] text-slate-400">No order items found.</div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Payment</div>
                    <div className="mt-1 text-[10px] font-bold text-slate-700">
                      {paymentStatusLabel(order.paymentStatus)}
                    </div>
                    <div className="mt-0.5 text-[9px] text-slate-400">{order.paymentMethod}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Delivery fee</div>
                    <div className="mt-1 text-[10px] font-bold text-slate-700">
                      {money(order, order.shippingTotal)}
                    </div>
                    <div className="mt-0.5 text-[9px] text-slate-400">{order.deliveryType}</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-200/70 pt-3">
                  <span className="text-[11px] font-bold text-slate-600">Order total</span>
                  <span className="text-[18px] font-black tracking-[-.03em] text-[#14203a]">
                    {money(order, order.total)}
                  </span>
                </div>
              </section>

              {order.notes ? (
                <section className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                  <div className="text-[8px] font-bold uppercase tracking-[.12em] text-amber-600">Order note</div>
                  <div className="mt-1 text-[10px] leading-5 text-amber-800">{order.notes}</div>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-white p-4 sm:p-5">
          <button
            type="button"
            onClick={() => void copyOrderNumber()}
            disabled={!order}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[10px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <Copy className="size-3.5" />
            Copy order #
          </button>
          <button
            type="button"
            onClick={() => order && onOpenFull(order.id)}
            disabled={!order}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5968ea] px-3 text-[10px] font-bold text-white transition active:scale-[.98] disabled:opacity-40"
          >
            Open full order
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </aside>
    </div>
  );
}
