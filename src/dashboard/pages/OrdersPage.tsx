import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Truck,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import OrderQuickDrawer from "@/dashboard/components/orders/OrderQuickDrawer";
import {
  listDashboardOrders,
  orderStatusLabel,
  paymentStatusLabel,
  type DashboardOrderListItem,
  type DashboardOrderStatus,
  type DashboardOrdersResult,
  type DashboardOrdersSort,
  type DashboardPaymentStatus,
} from "@/dashboard/data/orders";

const STATUS_TABS: Array<"all" | DashboardOrderStatus> = [
  "all",
  "new",
  "confirmed",
  "processing",
  "ready",
  "out_for_delivery",
  "delivered",
  "done",
  "cancelled",
];

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone =
    normalized === "delivered" || normalized === "done" || normalized === "paid"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : normalized === "processing" || normalized === "confirmed"
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : normalized === "out for delivery"
          ? "bg-violet-50 text-violet-700 ring-violet-100"
          : normalized === "cancelled" || normalized === "refunded"
            ? "bg-rose-50 text-rose-700 ring-rose-100"
            : "bg-amber-50 text-amber-700 ring-amber-100";

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold ring-1 ${tone}`}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      <span className="truncate">{status}</span>
    </span>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof ShoppingBag;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_5px_18px_rgba(33,47,82,.035)] sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-[.11em] text-slate-400">{label}</div>
          <div className="mt-1.5 text-[22px] font-black tracking-[-.04em] text-[#14203a]">
            {value.toLocaleString()}
          </div>
          <div className="mt-0.5 truncate text-[9px] text-slate-400">{detail}</div>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500">
          <Icon className="size-4" />
        </span>
      </div>
    </div>
  );
}

function money(order: DashboardOrderListItem) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: order.currency || "USD",
  }).format(order.total);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function OrdersSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading orders" role="status">
      <div className="h-24 animate-pulse rounded-2xl border border-slate-100 bg-white" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl border border-slate-100 bg-white" />
    </div>
  );
}

function OrderMobileCard({
  order,
  onOpen,
}: {
  order: DashboardOrderListItem;
  onOpen: () => void;
}) {
  return (
    <article className="border-b border-slate-100 p-4 last:border-b-0">
      <button type="button" onClick={onOpen} className="w-full text-start">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12px] font-black text-[#5968ea]">#{order.publicOrderNumber}</div>
            <div className="mt-1 truncate text-[13px] font-black text-slate-700">
              {order.customerName || "Unnamed customer"}
            </div>
            <div className="mt-0.5 truncate text-[10px] text-slate-400">{order.customerPhone}</div>
          </div>
          <StatusBadge status={orderStatusLabel(order.status)} />
        </div>

        <div className="mt-3 rounded-xl bg-slate-50/80 p-3">
          <div className="line-clamp-2 text-[10px] leading-4 text-slate-500">
            {order.itemSummary || "No line items"}
          </div>
          <div className="mt-1 text-[9px] font-semibold text-slate-400">
            {order.itemCount} unit{order.itemCount === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Total</div>
            <div className="mt-1 text-[13px] font-black text-slate-700">{money(order)}</div>
          </div>
          <div>
            <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Payment</div>
            <div className="mt-1">
              <StatusBadge status={paymentStatusLabel(order.paymentStatus)} />
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-[9px] text-slate-400">{formatDate(order.createdAt)}</span>
          <span className="text-[10px] font-bold text-[#5968ea]">Open order →</span>
        </div>
      </button>
    </article>
  );
}

export default function OrdersPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | DashboardOrderStatus>("all");
  const [paymentStatus, setPaymentStatus] = useState<"all" | DashboardPaymentStatus>("all");
  const [sort, setSort] = useState<DashboardOrdersSort>("newest");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<DashboardOrdersResult | null>(null);
  const [quickOrderId, setQuickOrderId] = useState<string | null>(null);
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
          paymentStatus,
          sort,
          page,
          pageSize: 25,
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
    [page, paymentStatus, search, sort, status],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(false), search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const stats = result?.stats;
  const inProgress = useMemo(
    () => (stats ? stats.confirmed + stats.processing + stats.ready : 0),
    [stats],
  );

  const statusCount = (value: "all" | DashboardOrderStatus) => {
    if (!stats) return 0;
    if (value === "all") return stats.all;
    if (value === "out_for_delivery") return stats.outForDelivery;
    return stats[value];
  };

  const hasFilters =
    Boolean(search.trim()) ||
    status !== "all" ||
    paymentStatus !== "all" ||
    sort !== "newest";

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setPaymentStatus("all");
    setSort("newest");
    setPage(1);
  };

  if (loading && !result) {
    return <OrdersSkeleton />;
  }

  if (error && !result) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6">
        <div className="text-sm font-bold text-rose-700">Orders could not be loaded.</div>
        <div className="mt-1 text-xs text-rose-600">{error}</div>
        <button
          type="button"
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
  const pageSize = result?.pageSize ?? 25;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="pb-4 sm:pb-8">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            <span className="size-1.5 rounded-full bg-[#6a70e7]" />
            Commerce / Orders
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <h1 className="text-[28px] font-black tracking-[-.05em] text-[#14203a] sm:text-[30px]">
              Orders
            </h1>
            <span className="mb-1 rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-500">
              {stats?.all ?? 0} total
            </span>
          </div>
          <p className="mt-1.5 max-w-2xl text-[12px] leading-5 text-slate-500">
            Operational order queue from Supabase with server-side filtering and pagination.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#14203a] px-4 text-[11px] font-bold text-white transition active:scale-[.98] disabled:opacity-60 sm:w-auto"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="New" value={stats?.new ?? 0} detail="Needs review" icon={Clock3} />
        <StatCard label="In progress" value={inProgress} detail="Confirmed + preparing + ready" icon={PackageCheck} />
        <StatCard
          label="Out for delivery"
          value={stats?.outForDelivery ?? 0}
          detail="With courier"
          icon={Truck}
        />
        <StatCard
          label="Delivered"
          value={(stats?.delivered ?? 0) + (stats?.done ?? 0)}
          detail="Delivered + completed"
          icon={CheckCircle2}
        />
        <StatCard label="Cancelled" value={stats?.cancelled ?? 0} detail="Closed without sale" icon={XCircle} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
        <div className="border-b border-slate-100">
          <div className="overflow-x-auto px-3 pt-3 sm:px-4">
            <div className="flex min-w-max gap-1.5 pb-3">
              {STATUS_TABS.map((value) => {
                const active = status === value;
                const label = value === "all" ? "All" : orderStatusLabel(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setStatus(value);
                      setPage(1);
                    }}
                    aria-pressed={active}
                    className={
                      "flex h-9 items-center gap-2 rounded-xl px-3 text-[10px] font-bold transition " +
                      (active
                        ? "bg-[#14203a] text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50")
                    }
                  >
                    {label}
                    <span
                      className={
                        "rounded-full px-1.5 py-0.5 text-[8px] " +
                        (active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-400")
                      }
                    >
                      {statusCount(value)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2.5 border-t border-slate-100 p-3 sm:p-4 lg:grid-cols-[minmax(280px,1fr)_170px_170px_auto] lg:items-center">
            <div className="relative min-w-0">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Public order #, customer, phone or email"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white ps-9 pe-3 text-[11px] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
              />
            </div>

            <label className="relative">
              <span className="sr-only">Payment status</span>
              <CircleDollarSign className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={paymentStatus}
                onChange={(event) => {
                  setPaymentStatus(event.target.value as "all" | DashboardPaymentStatus);
                  setPage(1);
                }}
                className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white ps-9 pe-8 text-[10px] font-semibold text-slate-600 outline-none"
              >
                <option value="all">All payments</option>
                {(["unpaid", "paid", "partially_refunded", "refunded"] as const).map((value) => (
                  <option key={value} value={value}>
                    {paymentStatusLabel(value)}
                  </option>
                ))}
              </select>
            </label>

            <label className="relative">
              <span className="sr-only">Sort orders</span>
              <SlidersHorizontal className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as DashboardOrdersSort);
                  setPage(1);
                }}
                className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white ps-9 pe-8 text-[10px] font-semibold text-slate-600 outline-none"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="total_high">Highest total</option>
                <option value="total_low">Lowest total</option>
              </select>
            </label>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Clear filters
            </button>
          </div>
        </div>

        {loading && result ? (
          <div className="flex items-center gap-2 border-b border-slate-100 bg-indigo-50/40 px-4 py-2 text-[9px] font-semibold text-indigo-600">
            <Loader2 className="size-3 animate-spin" />
            Updating order queue…
          </div>
        ) : null}

        <div className="lg:hidden">
          {orders.map((order) => (
            <OrderMobileCard
              key={order.id}
              order={order}
              onOpen={() => setQuickOrderId(order.id)}
            />
          ))}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-[#fafbfe]">
              <tr className="border-b border-slate-100 text-[9px] font-bold uppercase tracking-[.12em] text-slate-400">
                <th className="px-5 py-3">Order</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Items</th>
                <th className="px-3 py-3">Total</th>
                <th className="px-3 py-3">Payment</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-5 py-3">Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => setQuickOrderId(order.id)}
                  className="cursor-pointer border-b border-slate-50 transition hover:bg-[#fafbff]"
                >
                  <td className="px-5 py-4">
                    <div className="text-[11px] font-black text-[#5968ea]">#{order.publicOrderNumber}</div>
                    <div className="mt-0.5 text-[8px] font-medium uppercase tracking-wide text-slate-300">
                      {order.paymentMethod}
                    </div>
                  </td>
                  <td className="max-w-[210px] px-3 py-4">
                    <div className="truncate text-[11px] font-bold text-slate-700">
                      {order.customerName || "Unnamed customer"}
                    </div>
                    <div className="mt-0.5 truncate text-[9px] text-slate-400">{order.customerPhone}</div>
                  </td>
                  <td className="max-w-[270px] px-3 py-4">
                    <div className="truncate text-[10px] text-slate-500">
                      {order.itemSummary || "No line items"}
                    </div>
                    <div className="mt-0.5 text-[8px] font-semibold text-slate-400">
                      {order.itemCount} unit{order.itemCount === 1 ? "" : "s"}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-[11px] font-black text-slate-700">{money(order)}</td>
                  <td className="px-3 py-4">
                    <StatusBadge status={paymentStatusLabel(order.paymentStatus)} />
                  </td>
                  <td className="px-3 py-4">
                    <StatusBadge status={orderStatusLabel(order.status)} />
                  </td>
                  <td className="px-5 py-4 text-[9px] leading-4 text-slate-400">
                    {formatDate(order.createdAt)}
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
              {hasFilters ? "No orders match these filters." : "No orders yet."}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {hasFilters
                ? "Clear filters or try another search."
                : "The first successful storefront order will appear here automatically."}
            </div>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 h-9 rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-[10px] font-bold text-indigo-700"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span className="text-[10px] text-slate-400">
            Showing {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <span className="text-[9px] font-semibold text-slate-400">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              aria-label="Previous orders page"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next orders page"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
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

      <OrderQuickDrawer
        orderId={quickOrderId}
        onClose={() => setQuickOrderId(null)}
        onOpenFull={(orderId) => {
          setQuickOrderId(null);
          navigate(`/dashboard/orders/${orderId}`);
        }}
      />
    </div>
  );
}
