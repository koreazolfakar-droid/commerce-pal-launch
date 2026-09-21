import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShoppingBag,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  listDashboardOrders,
  orderStatusLabel,
  paymentStatusLabel,
  type DashboardOrderStatus,
  type DashboardOrdersResult,
} from "@/dashboard/data/orders";

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone =
    normalized === "delivered" || normalized === "paid"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : normalized === "processing" || normalized === "confirmed"
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : normalized === "shipped"
          ? "bg-violet-50 text-violet-700 ring-violet-100"
          : normalized === "cancelled" || normalized === "refunded"
            ? "bg-rose-50 text-rose-700 ring-rose-100"
            : "bg-amber-50 text-amber-700 ring-amber-100";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${tone}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function StatCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-bold text-[#14203a]">{value.toLocaleString()}</div>
      <div className="mt-1 text-[10px] text-slate-400">{detail}</div>
    </div>
  );
}

export default function OrdersPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | DashboardOrderStatus>("all");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<DashboardOrdersResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      else setLoading(true);
      try {
        const next = await listDashboardOrders({
          search,
          status,
          page,
          pageSize: 10,
        });
        setResult(next);
        setError("");
        if (manual) toast.success("Orders refreshed from Supabase.");
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Unable to load orders.";
        setError(message);
        if (manual) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, status],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(false), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const stats = result?.stats;
  const openOrders = useMemo(
    () => (stats ? stats.new + stats.confirmed + stats.processing + stats.outForDelivery : 0),
    [stats],
  );

  if (loading && !result) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="size-6 animate-spin text-[#5968ea]" />
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6">
        <div className="text-sm font-bold text-rose-700">Orders could not be loaded.</div>
        <div className="mt-1 text-xs text-rose-600">{error}</div>
        <button
          onClick={() => void load(true)}
          className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-[11px] font-bold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const orders = result?.orders ?? [];
  const total = result?.total ?? 0;
  const pageSize = result?.pageSize ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            <span className="size-1.5 rounded-full bg-[#6a70e7]" />
            Commerce / Orders
          </div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">Orders</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Real orders from Supabase. New storefront orders appear here automatically.
          </p>
        </div>
        <button
          onClick={() => void load(true)}
          disabled={refreshing}
          className="flex h-10 items-center gap-2 rounded-xl bg-[#14203a] px-4 text-[11px] font-bold text-white disabled:opacity-60"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <StatCard label="All orders" value={stats?.all ?? 0} detail="All time" />
        <StatCard label="Open" value={openOrders} detail="New through out for delivery" />
        <StatCard label="Delivered" value={stats?.delivered ?? 0} detail="Awaiting DONE" />
        <StatCard label="Done" value={stats?.done ?? 0} detail="Recorded in Sales" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search order number, customer, phone, or email"
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-[11px] outline-none focus:border-indigo-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-slate-400" />
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "all" | DashboardOrderStatus);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600"
            >
              <option value="all">All statuses</option>
              {(["new", "confirmed", "processing", "out_for_delivery", "delivered", "done", "cancelled"] as const).map(
                (value) => (
                  <option key={value} value={value}>
                    {orderStatusLabel(value)}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead className="bg-[#fafbfe]">
              <tr className="border-y border-slate-100 text-[10px] uppercase tracking-[.12em] text-slate-400">
                <th className="px-5 py-3">Order</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Items</th>
                <th className="px-3 py-3">Total</th>
                <th className="px-3 py-3">Payment</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                  className="cursor-pointer border-b border-slate-50 hover:bg-[#fafbff]"
                >
                  <td className="px-5 py-4 text-[12px] font-bold text-[#5968ea]">#{order.orderNumber}</td>
                  <td className="px-3 py-4">
                    <div className="text-[12px] font-semibold text-slate-700">{order.customerName}</div>
                    <div className="mt-0.5 text-[10px] text-slate-400">{order.customerPhone}</div>
                  </td>
                  <td className="max-w-[250px] px-3 py-4">
                    <div className="truncate text-[11px] text-slate-500">
                      {order.itemSummary || "No line items"}
                    </div>
                    <div className="mt-0.5 text-[9px] text-slate-400">{order.itemCount} units</div>
                  </td>
                  <td className="px-3 py-4 text-[12px] font-bold text-slate-700">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: order.currency || "USD",
                    }).format(order.total)}
                  </td>
                  <td className="px-3 py-4">
                    <StatusBadge status={paymentStatusLabel(order.paymentStatus)} />
                  </td>
                  <td className="px-3 py-4">
                    <StatusBadge status={orderStatusLabel(order.status)} />
                  </td>
                  <td className="px-5 py-4 text-[11px] text-slate-400">
                    {new Date(order.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!orders.length ? (
          <div className="px-6 py-14 text-center">
            <ShoppingBag className="mx-auto size-8 text-slate-300" />
            <div className="mt-3 text-sm font-bold text-slate-600">
              {search || status !== "all" ? "No orders match these filters." : "No orders yet."}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {search || status !== "all"
                ? "Try another search or status."
                : "The first successful storefront order will appear here automatically."}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <span className="text-[11px] text-slate-400">
            Showing {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-400">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              disabled={page >= totalPages || loading}
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
    </div>
  );
}
