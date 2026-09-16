import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Save, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/productPricing";

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
type PaymentStatus = "unpaid" | "paid" | "refunded" | "partially_refunded";

type Order = {
  id: string;
  order_number: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: "cash" | "whish";
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_address: string | null;
  city: string | null;
  notes: string | null;
  customer_reference: string | null;
  currency: string;
  subtotal: number;
  shipping_total: number;
  discount_total: number;
  total: number;
  source: string;
  created_at: string;
  updated_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  title: string;
  variant_title: string | null;
  sku: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  options: Record<string, unknown>;
};

export function OrdersEditor() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
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

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("store_orders" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const next = (data ?? []) as Order[];
    setOrders(next);
    if (!selectedId && next[0]) void selectOrder(next[0].id);
  };

  const selectOrder = async (orderId: string) => {
    setSelectedId(orderId);
    setLoadingItems(true);
    const { data, error } = await supabase
      .from("store_order_items" as never)
      .select("*")
      .eq("order_id", orderId)
      .order("created_at");
    setLoadingItems(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((data ?? []) as OrderItem[]);
  };

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchSelected = (patch: Partial<Order>) => {
    if (!selectedId) return;
    setOrders((current) =>
      current.map((order) => (order.id === selectedId ? { ...order, ...patch } : order)),
    );
  };

  const saveOrder = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("store_orders" as never)
      .update({ status: selected.status, payment_status: selected.payment_status } as never)
      .eq("id", selected.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم تحديث الطلب");
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">Native Commerce</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">الطلبات</h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-muted-foreground">
            طلبات Space Call الأصلية من Supabase، مع حالة الطلب والدفع وتفاصيل المنتجات.
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
          تحديث
        </Button>
      </header>

      <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-border/70 bg-card p-3 xl:sticky xl:top-24 xl:h-[calc(100vh-8rem)] xl:overflow-y-auto">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="رقم الطلب، الاسم أو الهاتف…"
            className="h-10 rounded-xl"
          />
          <div className="mt-3 space-y-1.5">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">لا توجد طلبات.</p>
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
              اختر طلباً لعرض التفاصيل.
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <article className="overflow-hidden rounded-2xl border border-border/70 bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground">Order</p>
                  <h2 className="text-base font-black">طلب #{selected.order_number}</h2>
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
                  حفظ الحالة
                </Button>
              </div>

              <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
                <Info label="العميل" value={selected.customer_name} />
                <Info label="الهاتف" value={selected.customer_phone} />
                <Info label="المدينة" value={selected.city || "—"} />
                <Info label="العنوان" value={selected.delivery_address || "—"} />
                <Info
                  label="طريقة الدفع"
                  value={selected.payment_method === "whish" ? "Whish Money" : "Cash on delivery"}
                />
                <Info label="المصدر" value={selected.source} />
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground">حالة الطلب</p>
                  <select
                    value={selected.status}
                    onChange={(e) => patchSelected({ status: e.target.value as OrderStatus })}
                    className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground">حالة الدفع</p>
                  <select
                    value={selected.payment_status}
                    onChange={(e) =>
                      patchSelected({ payment_status: e.target.value as PaymentStatus })
                    }
                    className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="partially_refunded">Partially refunded</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
                {selected.notes ? (
                  <div className="md:col-span-2">
                    <Info label="ملاحظات" value={selected.notes} />
                  </div>
                ) : null}
              </div>
            </article>

            <article className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
              <h3 className="text-sm font-black">المنتجات</h3>
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
                  label="Subtotal"
                  value={formatPrice(selected.subtotal, selected.currency)}
                />
                <TotalRow
                  label="Shipping"
                  value={formatPrice(selected.shipping_total, selected.currency)}
                />
                <TotalRow
                  label="Discount"
                  value={`-${formatPrice(selected.discount_total, selected.currency)}`}
                />
                <div className="flex items-center justify-between border-t border-border/60 pt-3 text-base font-black">
                  <span>Total</span>
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
