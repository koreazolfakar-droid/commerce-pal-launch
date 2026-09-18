import {
  ArrowLeft,
  Check,
  Loader2,
  Package,
  Save,
  ShieldAlert,
  Star,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  getDashboardCustomer,
  updateDashboardCustomer,
  type DashboardCustomerDetail,
} from "@/dashboard/data/customers";

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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="text-[13px] font-bold text-[#14203a]">{title}</div>
        {subtitle ? <div className="mt-0.5 text-[11px] text-slate-400">{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

export default function CustomerDetailPage({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const [customer, setCustomer] = useState<DashboardCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    city: "",
    defaultAddress: "",
    tags: "",
    internalNotes: "",
    isVip: false,
    isBlocked: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getDashboardCustomer(id);
      setCustomer(next);
      if (next) {
        setForm({
          name: next.name,
          email: next.email ?? "",
          city: next.city ?? "",
          defaultAddress: next.defaultAddress ?? "",
          tags: next.tags.join(", "),
          internalNotes: next.internalNotes ?? "",
          isVip: next.isVip,
          isBlocked: next.isBlocked,
        });
      }
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load customer.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    if (!customer) return false;
    return (
      form.name !== customer.name ||
      form.email !== (customer.email ?? "") ||
      form.city !== (customer.city ?? "") ||
      form.defaultAddress !== (customer.defaultAddress ?? "") ||
      form.tags !== customer.tags.join(", ") ||
      form.internalNotes !== (customer.internalNotes ?? "") ||
      form.isVip !== customer.isVip ||
      form.isBlocked !== customer.isBlocked
    );
  }, [customer, form]);

  const save = async () => {
    if (!customer || form.name.trim().length < 2) return;
    setSaving(true);
    try {
      const next = await updateDashboardCustomer(customer.id, {
        name: form.name,
        email: form.email,
        city: form.city,
        defaultAddress: form.defaultAddress,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        internalNotes: form.internalNotes,
        isVip: form.isVip,
        isBlocked: form.isBlocked,
      });
      setCustomer(next);
      if (next) {
        setForm({
          name: next.name,
          email: next.email ?? "",
          city: next.city ?? "",
          defaultAddress: next.defaultAddress ?? "",
          tags: next.tags.join(", "),
          internalNotes: next.internalNotes ?? "",
          isVip: next.isVip,
          isBlocked: next.isBlocked,
        });
      }
      toast.success("Customer profile saved.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Customer save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !customer) {
    return <div className="grid min-h-[420px] place-items-center"><Loader2 className="size-6 animate-spin text-[#5968ea]" /></div>;
  }

  if (!customer) {
    return (
      <div>
        <button onClick={() => navigate("/dashboard/customers")} className="mb-6 flex items-center gap-2 text-[12px] font-semibold text-slate-500">
          <ArrowLeft className="size-4" /> Back to customers
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {error || "Customer not found."}
        </div>
      </div>
    );
  }

  const money = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  return (
    <div>
      <button
        onClick={() => navigate("/dashboard/customers")}
        className="mb-6 flex items-center gap-2 text-[12px] font-semibold text-slate-500 hover:text-[#5968ea]"
      >
        <ArrowLeft className="size-4" /> Back to customers
      </button>

      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">Customer profile</div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">{customer.name}</h1>
            {customer.isVip ? <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">VIP</span> : null}
            {customer.isBlocked ? <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700">Blocked</span> : null}
          </div>
          <p className="mt-1.5 text-sm text-slate-500">{customer.phone} · Customer since {new Date(customer.createdAt).toLocaleDateString()}</p>
        </div>
        <button
          onClick={() => void save()}
          disabled={!dirty || saving}
          className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white disabled:opacity-40"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save changes
        </button>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-[11px] text-slate-400">Orders</div>
          <div className="mt-2 text-2xl font-bold text-[#14203a]">{customer.totalOrders}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-[11px] text-slate-400">Total spent</div>
          <div className="mt-2 text-2xl font-bold text-[#14203a]">{money(customer.totalSpent)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-[11px] text-slate-400">Last order</div>
          <div className="mt-2 text-lg font-bold text-[#14203a]">
            {customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString() : "No orders"}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-4">
          <Panel title="Customer information" subtitle="Staff-managed profile data">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {[
                ["Name", "name"],
                ["Email", "email"],
                ["City", "city"],
                ["Address", "defaultAddress"],
              ].map(([label, key]) => (
                <label key={key} className={key === "defaultAddress" ? "sm:col-span-2" : ""}>
                  <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}</span>
                  <input
                    value={form[key as keyof typeof form] as string}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400"
                  />
                </label>
              ))}
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Tags</span>
                <input
                  value={form.tags}
                  onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="VIP, Beirut, Wholesale"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Internal notes</span>
                <textarea
                  value={form.internalNotes}
                  onChange={(event) => setForm((current) => ({ ...current, internalNotes: event.target.value }))}
                  className="min-h-28 w-full rounded-xl border border-slate-200 p-3 text-[12px] outline-none focus:border-indigo-400"
                />
              </label>
            </div>
          </Panel>

          <Panel title="Order history" subtitle="Matched by normalized customer phone">
            {customer.orders.length ? (
              <div className="divide-y divide-slate-100">
                {customer.orders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 text-left hover:bg-slate-50"
                  >
                    <div>
                      <div className="text-[12px] font-bold text-slate-700">Order #{order.orderNumber}</div>
                      <div className="mt-1 text-[10px] text-slate-400">
                        {new Date(order.createdAt).toLocaleString()} · {order.status} · {order.paymentStatus}
                      </div>
                    </div>
                    <div className="text-[12px] font-bold text-[#14203a]">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency || "USD" }).format(order.total)}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center text-[11px] text-slate-400">No orders for this customer yet.</div>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Customer status">
            <div className="space-y-4 p-5">
              <label className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50 p-4">
                <input
                  type="checkbox"
                  checked={form.isVip}
                  onChange={(event) => setForm((current) => ({ ...current, isVip: event.target.checked }))}
                  className="mt-0.5"
                />
                <span>
                  <span className="flex items-center gap-2 text-[12px] font-bold text-violet-700"><Star className="size-3.5" /> VIP customer</span>
                  <span className="mt-1 block text-[10px] text-violet-600">Use for priority service and segmentation.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4">
                <input
                  type="checkbox"
                  checked={form.isBlocked}
                  onChange={(event) => setForm((current) => ({ ...current, isBlocked: event.target.checked }))}
                  className="mt-0.5"
                />
                <span>
                  <span className="flex items-center gap-2 text-[12px] font-bold text-rose-700"><ShieldAlert className="size-3.5" /> Block customer</span>
                  <span className="mt-1 block text-[10px] text-rose-600">Flags this CRM record as restricted.</span>
                </span>
              </label>
            </div>
          </Panel>

          <Panel title="Identity">
            <div className="space-y-3 p-5 text-[11px]">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-full bg-indigo-50 text-indigo-600"><User className="size-4" /></div>
                <div>
                  <div className="font-bold text-slate-700">{customer.phone}</div>
                  <div className="text-[10px] text-slate-400">Phone identity is locked to protect order history.</div>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-[10px] text-slate-500">
                Product and order metrics remain automatic even after staff edits this profile.
              </div>
            </div>
          </Panel>

          <Panel title="Tags">
            <div className="flex flex-wrap gap-2 p-5">
              {form.tags.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{tag}</span>
              ))}
              {!form.tags.trim() ? <span className="text-[11px] text-slate-400">No tags yet.</span> : null}
            </div>
          </Panel>
        </div>
      </div>

      {dirty ? (
        <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
          <Check className="size-4 text-amber-500" />
          <span className="text-[11px] font-semibold text-slate-600">Unsaved customer changes</span>
          <button onClick={() => void save()} disabled={saving} className="rounded-lg bg-[#5968ea] px-3 py-1.5 text-[10px] font-bold text-white">
            Save
          </button>
        </div>
      ) : null}
    </div>
  );
}
