import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  createDashboardCustomer,
  listDashboardCustomers,
  type DashboardCustomerFilter,
  type DashboardCustomerListResult,
} from "@/dashboard/data/customers";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-[-.04em] text-[#14203a]">{value}</div>
      <div className="mt-1 text-[10px] text-slate-400">{detail}</div>
    </div>
  );
}

export default function CustomersPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DashboardCustomerFilter>("all");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<DashboardCustomerListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    defaultAddress: "",
    tags: "",
    internalNotes: "",
    isVip: false,
    isBlocked: false,
  });

  const load = useCallback(
    async (manual = false) => {
      manual ? setRefreshing(true) : setLoading(true);
      try {
        const next = await listDashboardCustomers({ search, filter, page, pageSize: 20 });
        setResult(next);
        setError("");
        if (manual) toast.success("Customers refreshed from Supabase.");
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Unable to load customers.";
        setError(message);
        if (manual) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter, page, search],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(false), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((result?.total ?? 0) / (result?.pageSize ?? 20))),
    [result],
  );

  const createCustomer = async () => {
    if (draft.name.trim().length < 2 || draft.phone.replace(/\D/g, "").length < 6) {
      toast.error("Enter a valid customer name and phone.");
      return;
    }
    setCreating(true);
    try {
      const customer = await createDashboardCustomer({
        name: draft.name,
        phone: draft.phone,
        email: draft.email,
        city: draft.city,
        defaultAddress: draft.defaultAddress,
        tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        internalNotes: draft.internalNotes,
        isVip: draft.isVip,
        isBlocked: draft.isBlocked,
      });
      toast.success("Customer created.");
      setShowCreate(false);
      setDraft({
        name: "",
        phone: "",
        email: "",
        city: "",
        defaultAddress: "",
        tags: "",
        internalNotes: "",
        isVip: false,
        isBlocked: false,
      });
      if (customer) navigate(`/dashboard/customers/${customer.id}`);
      else void load(true);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Customer creation failed.");
    } finally {
      setCreating(false);
    }
  };

  if (loading && !result) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="size-6 animate-spin text-[#5968ea]" />
      </div>
    );
  }

  const customers = result?.customers ?? [];
  const stats = result?.stats;

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            <span className="size-1.5 rounded-full bg-[#6a70e7]" />
            Commerce / Customers
          </div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">Customers</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Shopify-style CRM backed by real Supabase customer and order data.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void load(true)}
            disabled={refreshing}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white"
          >
            <Plus className="size-4" /> Add customer
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total customers" value={(stats?.total ?? 0).toLocaleString()} detail="Real CRM records" />
        <StatCard label="VIP customers" value={(stats?.vip ?? 0).toLocaleString()} detail="Flagged by staff" />
        <StatCard label="Blocked" value={(stats?.blocked ?? 0).toLocaleString()} detail="Restricted customers" />
        <StatCard label="Avg. lifetime value" value={money(stats?.averageLifetimeValue ?? 0)} detail="Across all customers" />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, phone, email or city"
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-[11px] outline-none focus:border-indigo-400"
            />
          </div>
          <select
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value as DashboardCustomerFilter);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600"
          >
            <option value="all">All customers</option>
            <option value="vip">VIP only</option>
            <option value="blocked">Blocked only</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-[#fafbfe]">
              <tr className="border-b border-slate-100 text-[10px] uppercase tracking-[.12em] text-slate-400">
                <th className="px-5 py-3">Customer</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Orders</th>
                <th className="px-3 py-3">Total spent</th>
                <th className="px-3 py-3">Last order</th>
                <th className="px-3 py-3">Tags</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => navigate(`/dashboard/customers/${customer.id}`)}
                  className="cursor-pointer border-b border-slate-50 hover:bg-[#fafbff]"
                >
                  <td className="px-5 py-4">
                    <div className="text-[12px] font-bold text-slate-700">{customer.name}</div>
                    <div className="mt-0.5 text-[10px] text-slate-400">{customer.email || "No email"}</div>
                  </td>
                  <td className="px-3 py-4 text-[11px] text-slate-500">{customer.phone}</td>
                  <td className="px-3 py-4 text-[12px] font-bold text-slate-700">{customer.totalOrders}</td>
                  <td className="px-3 py-4 text-[12px] font-bold text-slate-700">{money(customer.totalSpent)}</td>
                  <td className="px-3 py-4 text-[11px] text-slate-400">
                    {customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="max-w-[220px] px-3 py-4">
                    <div className="flex flex-wrap gap-1">
                      {customer.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      {customer.isVip ? <span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-700">VIP</span> : null}
                      {customer.isBlocked ? <span className="rounded-full bg-rose-50 px-2 py-1 text-[9px] font-bold text-rose-700">Blocked</span> : null}
                      {!customer.isVip && !customer.isBlocked ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">Active</span> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!customers.length ? (
          <div className="px-6 py-14 text-center">
            <Users className="mx-auto size-8 text-slate-300" />
            <div className="mt-3 text-sm font-bold text-slate-600">
              {search || filter !== "all" ? "No customers match these filters." : "No customers yet."}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Customers are created automatically from orders, or you can add one manually.
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <span className="text-[11px] text-slate-400">
            Showing {result?.total ? (page - 1) * (result?.pageSize ?? 20) + 1 : 0}–
            {Math.min(page * (result?.pageSize ?? 20), result?.total ?? 0)} of {result?.total ?? 0}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-[10px] font-semibold text-slate-400">Page {page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-[11px] text-amber-700">
          Last refresh warning: {error}
        </div>
      ) : null}

      {showCreate ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.16em] text-indigo-500">Customers</div>
                <div className="mt-1 text-xl font-bold text-[#14203a]">Add customer</div>
              </div>
              <button onClick={() => setShowCreate(false)} className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-500">
                <X className="size-4" />
              </button>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              {[
                ["Name", "name"],
                ["Phone", "phone"],
                ["Email", "email"],
                ["City", "city"],
                ["Address", "defaultAddress"],
                ["Tags (comma separated)", "tags"],
              ].map(([label, key]) => (
                <label key={key} className={key === "defaultAddress" || key === "tags" ? "sm:col-span-2" : ""}>
                  <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}</span>
                  <input
                    value={draft[key as keyof typeof draft] as string}
                    onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400"
                  />
                </label>
              ))}
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Internal notes</span>
                <textarea
                  value={draft.internalNotes}
                  onChange={(event) => setDraft((current) => ({ ...current, internalNotes: event.target.value }))}
                  className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-[12px] outline-none focus:border-indigo-400"
                />
              </label>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                <input type="checkbox" checked={draft.isVip} onChange={(event) => setDraft((current) => ({ ...current, isVip: event.target.checked }))} />
                VIP customer
              </label>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                <input type="checkbox" checked={draft.isBlocked} onChange={(event) => setDraft((current) => ({ ...current, isBlocked: event.target.checked }))} />
                Block customer
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setShowCreate(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-bold text-slate-600">Cancel</button>
              <button
                onClick={() => void createCustomer()}
                disabled={creating}
                className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white disabled:opacity-60"
              >
                {creating ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                Create customer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
