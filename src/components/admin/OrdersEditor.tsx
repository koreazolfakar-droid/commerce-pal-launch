import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Save, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminCommerceUiService,
  type OrderDto,
  type OrderItemDto,
} from "@/commerce/services/adminCommerceUiService";
import type { OrderStatus, PaymentStatus } from "@/commerce/core/models";
import { useDashboardLanguage } from "@/lib/dashboardI18n";
import { formatPrice } from "@/lib/productPricing";

export function OrdersEditor() {
  const { text } = useDashboardLanguage();
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<OrderItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const selected = orders.find((order) => order.id === selectedId) ?? null;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) =>
      `${order.order_number} ${order.customer_name} ${order.customer_phone} ${order.status}`
        .toLowerCase()
        .includes(q),
    );
  }, [orders, search]);

  const selectOrder = async (orderId: string) => {
    setSelectedId(orderId);
    setLoadingItems(true);
    try {
      setItems(await adminCommerceUiService.getOrderItems(orderId));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : text("تعذر تحميل تفاصيل الطلب", "Unable to load order details"),
      );
    } finally {
      setLoadingItems(false);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const next = await adminCommerceUiService.listOrders(200);
      setOrders(next);
      if (!selectedId && next[0]) void selectOrder(next[0].id);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : text("تعذر تحميل الطلبات", "Unable to load orders"),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchSelected = (patch: Partial<OrderDto>) => {
    if (!selectedId) return;
    setOrders((current) =>
      current.map((order) => (order.id === selectedId ? { ...order, ...patch } : order)),
    );
  };

  const saveOrder = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await adminCommerceUiService.updateOrderState(selected.id, {
        status: selected.status,
        paymentStatus: selected.payment_status,
      });
      toast.success(text("تم تحديث الطلب", "Order updated"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : text("فشل تحديث الطلب", "Order update failed"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-page space-y-5">
      <header className="admin-page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">Native Commerce</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">{text("الطلبات", "Orders")}</h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-muted-foreground">
            {text(
              "طلبات Space Call الأصلية مع حالة الطلب والدفع وتفاصيل المنتجات.",
              "Space Call native orders with order status, payment status and product details.",
            )}
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => void loadOrders()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="me-2 size-4 animate-spin" />
          ) : (
            <RefreshCw className="me-2 size-4" />
          )}
          {text("تحديث", "Refresh")}
        </Button>
      </header>

      <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="admin-list-panel rounded-2xl border border-border/70 bg-card p-3 xl:sticky xl:top-24 xl:h-[calc(100vh-8rem)] xl:overflow-y-auto">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={text("رقم الطلب، الاسم أو الهاتف…", "Order number, name or phone…")}
            className="h-10 rounded-xl"
          />
          <div className="mt-3 space-y-1.5">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                {text("لا توجد طلبات.", "No orders.")}
              </p>
            ) : (
              filtered.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => void selectOrder(order.id)}
                  className={`w-full rounded-xl px-3 py-3 text-start transition ${selectedId === order.id ? "bg-foreground text-background" : "hover:bg-muted"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black">#{order.order_number}</p>
                    <span className="text-[10px] font-semibold opacity-70">{order.status}</span>
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold">{order.customer_name}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] opacity-70">
                    <span>{order.customer_phone}</span>
                    <span>{formatPrice(order.total, order.currency)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {!selected ? (
          <div className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-border bg-card text-sm text-muted-foreground">
            <div className="text-center">
              <ShoppingBag className="mx-auto mb-2 size-6" />
              {text("اختر طلباً لعرض التفاصيل.", "Select an order to view its details.")}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <article className="overflow-hidden rounded-2xl border border-border/70 bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    {text("طلب", "Order")}
                  </p>
                  <h2 className="text-base font-black">
                    {text("طلب", "Order")} #{selected.order_number}
                  </h2>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => void saveOrder()}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="me-1.5 size-3.5 animate-spin" />
                  ) : (
                    <Save className="me-1.5 size-3.5" />
                  )}{" "}
                  {text("حفظ الحالة", "Save status")}
                </Button>
              </div>

              <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
                <Info label={text("العميل", "Customer")} value={selected.customer_name} />
                <Info label={text("الهاتف", "Phone")} value={selected.customer_phone} />
                <Info label={text("المدينة", "City")} value={selected.city || "—"} />
                <Info label={text("العنوان", "Address")} value={selected.delivery_address || "—"} />
                <Info
                  label={text("طريقة الدفع", "Payment method")}
                  value={selected.payment_method === "whish" ? "Whish Money" : "Cash on delivery"}
                />
                <Info label={text("المصدر", "Source")} value={selected.source} />
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    {text("حالة الطلب", "Order status")}
                  </p>
                  <select
                    value={selected.status}
                    onChange={(event) =>
                      patchSelected({ status: event.target.value as OrderStatus })
                    }
                    className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold"
                  >
                    <option value="pending">{text("قيد الانتظار", "Pending")}</option>
                    <option value="confirmed">{text("مؤكد", "Confirmed")}</option>
                    <option value="processing">{text("قيد التجهيز", "Processing")}</option>
                    <option value="shipped">{text("تم الشحن", "Shipped")}</option>
                    <option value="delivered">{text("تم التسليم", "Delivered")}</option>
                    <option value="cancelled">{text("ملغي", "Cancelled")}</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    {text("حالة الدفع", "Payment status")}
                  </p>
                  <select
                    value={selected.payment_status}
                    onChange={(event) =>
                      patchSelected({ payment_status: event.target.value as PaymentStatus })
                    }
                    className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold"
                  >
                    <option value="unpaid">{text("غير مدفوع", "Unpaid")}</option>
                    <option value="paid">{text("مدفوع", "Paid")}</option>
                    <option value="partially_refunded">
                      {text("مسترد جزئياً", "Partially refunded")}
                    </option>
                    <option value="refunded">{text("مسترد", "Refunded")}</option>
                  </select>
                </div>
                {selected.notes ? (
                  <div className="md:col-span-2">
                    <Info label={text("ملاحظات", "Notes")} value={selected.notes} />
                  </div>
                ) : null}
              </div>
            </article>

            <article className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
              <h3 className="text-sm font-black">{text("المنتجات", "Products")}</h3>
              {loadingItems ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              ) : (
                <div className="mt-3 divide-y divide-border/60">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold">{item.title}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {item.variant_title || "Default"}
                          {item.sku ? ` • SKU ${item.sku}` : ""}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {formatPrice(item.unit_price, selected.currency)} × {item.quantity}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs font-black">
                        {formatPrice(item.line_total, selected.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 space-y-2 border-t border-border/60 pt-4 text-xs">
                <TotalRow
                  label={text("المجموع الفرعي", "Subtotal")}
                  value={formatPrice(selected.subtotal, selected.currency)}
                />
                <TotalRow
                  label={text("الشحن", "Shipping")}
                  value={formatPrice(selected.shipping_total, selected.currency)}
                />
                <TotalRow
                  label={text("الخصم", "Discount")}
                  value={`-${formatPrice(selected.discount_total, selected.currency)}`}
                />
                <div className="flex items-center justify-between border-t border-border/60 pt-3 text-base font-black">
                  <span>{text("الإجمالي", "Total")}</span>
                  <span>{formatPrice(selected.total, selected.currency)}</span>
                </div>
              </div>
            </article>
          </div>
        )}
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
      <p className="text-[10px] font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-xs font-semibold">{value}</p>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
