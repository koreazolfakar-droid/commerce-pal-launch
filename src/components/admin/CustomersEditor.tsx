import { useEffect, useMemo, useState } from "react";
import { Crown, Loader2, RefreshCw, Save, Search, ShieldBan, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardLanguage } from "@/lib/dashboardI18n";
import { formatPrice } from "@/lib/productPricing";

type Customer = {
  id: string;
  phone: string;
  phone_normalized: string;
  name: string;
  email: string | null;
  city: string | null;
  default_address: string | null;
  internal_notes: string | null;
  tags: string[];
  is_vip: boolean;
  is_blocked: boolean;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  created_at: string;
  updated_at: string;
};

type Order = {
  id: string;
  order_number: number;
  status: string;
  payment_status: string;
  total: number;
  currency: string;
  created_at: string;
};

export function CustomersEditor() {
  const { language, text } = useDashboardLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = customers.find((customer) => customer.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((customer) =>
      `${customer.name} ${customer.phone} ${customer.email ?? ""} ${customer.city ?? ""} ${(customer.tags ?? []).join(" ")}`
        .toLowerCase()
        .includes(q),
    );
  }, [customers, search]);

  const stats = useMemo(
    () => ({
      total: customers.length,
      vip: customers.filter((customer) => customer.is_vip).length,
      blocked: customers.filter((customer) => customer.is_blocked).length,
      spent: customers.reduce((sum, customer) => sum + Number(customer.total_spent || 0), 0),
    }),
    [customers],
  );

  const loadCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("store_customers" as never)
      .select("*")
      .order("last_order_at", { ascending: false, nullsFirst: false });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const next = (data ?? []) as Customer[];
    setCustomers(next);
    if (!selectedId && next[0]) void selectCustomer(next[0]);
  };

  const selectCustomer = async (customer: Customer) => {
    setSelectedId(customer.id);
    setLoadingOrders(true);
    const { data, error } = await supabase
      .from("store_orders" as never)
      .select("id,order_number,status,payment_status,total,currency,created_at")
      .eq("customer_phone", customer.phone)
      .order("created_at", { ascending: false })
      .limit(100);
    setLoadingOrders(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOrders((data ?? []) as Order[]);
  };

  useEffect(() => {
    void loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchSelected = (patch: Partial<Customer>) => {
    if (!selectedId) return;
    setCustomers((current) =>
      current.map((customer) =>
        customer.id === selectedId ? { ...customer, ...patch } : customer,
      ),
    );
  };

  const saveCustomer = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("store_customers" as never)
      .update({
        internal_notes: selected.internal_notes?.trim() || null,
        tags: selected.tags ?? [],
        is_vip: selected.is_vip,
        is_blocked: selected.is_blocked,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", selected.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(text("تم حفظ ملف العميل", "Customer profile saved"));
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">Customer CRM</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">
            {text("العملاء", "Customers")}
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-muted-foreground">
            {text(
              "ملفات العملاء، قيمة مشترياتهم، آخر طلب، الملاحظات الداخلية ووسوم VIP/Blocked.",
              "Customer profiles, lifetime spend, recent orders, internal notes and VIP/Blocked flags.",
            )}
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => void loadCustomers()}
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={text("العملاء", "Customers")} value={String(stats.total)} />
        <Metric label="VIP" value={String(stats.vip)} />
        <Metric label={text("محظور", "Blocked")} value={String(stats.blocked)} />
        <Metric
          label={text("إجمالي مشتريات العملاء", "Customer lifetime spend")}
          value={formatPrice(stats.spent, "USD")}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-border/70 bg-card p-3 xl:sticky xl:top-24 xl:h-[calc(100vh-8rem)] xl:overflow-y-auto">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={text("الاسم، الهاتف، البريد أو الوسم…", "Name, phone, email or tag…")}
              className="h-10 rounded-xl ps-9"
            />
          </div>
          <div className="mt-3 space-y-1.5">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                {text("لا يوجد عملاء بعد.", "No customers yet.")}
              </p>
            ) : (
              filtered.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => void selectCustomer(customer)}
                  className={`w-full rounded-xl px-3 py-3 text-start transition ${selectedId === customer.id ? "bg-foreground text-background" : "hover:bg-muted"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-black">{customer.name}</p>
                    <div className="flex items-center gap-1">
                      {customer.is_vip ? <Crown className="size-3.5" /> : null}
                      {customer.is_blocked ? <ShieldBan className="size-3.5" /> : null}
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] opacity-70">{customer.phone}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] opacity-70">
                    <span>
                      {language === "ar"
                        ? `${customer.total_orders} طلب`
                        : `${customer.total_orders} orders`}
                    </span>
                    <span>{formatPrice(customer.total_spent, "USD")}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {!selected ? (
          <div className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-border bg-card text-sm text-muted-foreground">
            <div className="text-center">
              <UserRound className="mx-auto mb-2 size-6" />
              {text("اختر عميلاً لعرض ملفه.", "Select a customer to view their profile.")}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <article className="overflow-hidden rounded-2xl border border-border/70 bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    {text("ملف العميل", "Customer Profile")}
                  </p>
                  <h2 className="text-base font-black">{selected.name}</h2>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => void saveCustomer()}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="me-1.5 size-3.5 animate-spin" />
                  ) : (
                    <Save className="me-1.5 size-3.5" />
                  )}{" "}
                  {text("حفظ الملف", "Save profile")}
                </Button>
              </div>

              <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
                <Info label={text("الهاتف", "Phone")} value={selected.phone} />
                <Info label={text("البريد", "Email")} value={selected.email || "—"} />
                <Info label={text("المدينة", "City")} value={selected.city || "—"} />
                <Info label={text("العنوان", "Address")} value={selected.default_address || "—"} />
                <Info
                  label={text("عدد الطلبات", "Order count")}
                  value={String(selected.total_orders)}
                />
                <Info
                  label={text("إجمالي المشتريات", "Total spend")}
                  value={formatPrice(selected.total_spent, "USD")}
                />

                <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
                  <label className="flex min-h-12 items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3.5 text-xs font-semibold">
                    <span className="flex items-center gap-2">
                      <Crown className="size-4" /> {text("عميل VIP", "VIP Customer")}
                    </span>
                    <Switch
                      checked={selected.is_vip}
                      onCheckedChange={(checked) => patchSelected({ is_vip: checked })}
                    />
                  </label>
                  <label className="flex min-h-12 items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3.5 text-xs font-semibold">
                    <span className="flex items-center gap-2">
                      <ShieldBan className="size-4" /> {text("محظور", "Blocked")}
                    </span>
                    <Switch
                      checked={selected.is_blocked}
                      onCheckedChange={(checked) => patchSelected({ is_blocked: checked })}
                    />
                  </label>
                </div>

                <div className="md:col-span-2">
                  <Label className="text-[11px] text-muted-foreground">
                    {text("الوسوم", "Tags")}
                  </Label>
                  <Input
                    className="mt-1.5 rounded-xl"
                    value={(selected.tags ?? []).join(", ")}
                    placeholder="VIP, wholesale, repeat-customer"
                    onChange={(event) =>
                      patchSelected({
                        tags: event.target.value
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[11px] text-muted-foreground">
                    {text("ملاحظات داخلية", "Internal notes")}
                  </Label>
                  <Textarea
                    className="mt-1.5 min-h-28 rounded-xl"
                    value={selected.internal_notes ?? ""}
                    onChange={(event) => patchSelected({ internal_notes: event.target.value })}
                    placeholder={text(
                      "ملاحظات لا تظهر للعميل…",
                      "Notes that are not shown to the customer…",
                    )}
                  />
                </div>
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-border/70 bg-card">
              <div className="border-b border-border/60 px-4 py-4 sm:px-5">
                <h3 className="text-sm font-black">{text("سجل الطلبات", "Order history")}</h3>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {text(
                    "آخر 100 طلب مرتبط برقم العميل.",
                    "The latest 100 orders linked to this customer's phone number.",
                  )}
                </p>
              </div>
              {loadingOrders ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <p className="py-10 text-center text-xs text-muted-foreground">
                  {text("لا يوجد سجل طلبات.", "No order history.")}
                </p>
              ) : (
                <div className="divide-y divide-border/60">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
                    >
                      <div>
                        <p className="text-xs font-black">
                          {text("طلب", "Order")} #{order.order_number}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {new Date(order.created_at).toLocaleString(
                            language === "ar" ? "ar-LB" : "en-LB",
                          )}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="text-xs font-black">
                          {formatPrice(order.total, order.currency)}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {order.status} • {order.payment_status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <p className="text-[10px] font-semibold text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
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
