import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  ShoppingBag,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  listDashboardSales,
  type DashboardSalesResult,
} from "@/dashboard/data/sales";

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(value);
  } catch {
    return `${currency || "USD"} ${value.toFixed(2)}`;
  }
}

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function SalesPage() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<DashboardSalesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (manual = false) => {
      if (!manual) setLoading(true);
      try {
        const next = await listDashboardSales({ search, page, pageSize: 10 });
        setResult(next);
        setError("");
        if (manual) toast.success("Sales refreshed.");
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Unable to load sales.";
        setError(message);
        if (manual) toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [page, search],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / (result?.pageSize ?? 10)));

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(query.trim());
  };

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            <span className="size-1.5 rounded-full bg-[#6a70e7]" />
            Commerce / Completed orders
          </div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">Sales</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Read-only sales ledger created when an order reaches DONE.
          </p>
        </div>
        <button
          onClick={() => void load(true)}
          disabled={loading}
          className="flex h-10 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600 disabled:opacity-50 md:self-auto"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          <div className="text-[11px] text-slate-400">Completed sales</div>
          <div className="mt-1 text-2xl font-bold text-[#14203a]">
            {(result?.total ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          <div className="text-[11px] text-slate-400">Ledger rule</div>
          <div className="mt-1 text-sm font-bold text-[#14203a]">DELIVERED → DONE → Sales</div>
          <div className="mt-1 text-[10px] text-slate-400">
            One immutable sales snapshot per order.
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
          <form onSubmit={submitSearch} className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-300" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order number, customer or phone"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[12px] text-slate-700 outline-none focus:border-[#6974eb] focus:ring-4 focus:ring-[#6974eb]/10"
            />
          </form>
          <div className="text-[10px] font-semibold text-slate-400">
            Page {page} of {totalPages}
          </div>
        </div>

        {loading && !result ? (
          <div className="grid min-h-[320px] place-items-center">
            <Loader2 className="size-6 animate-spin text-[#5968ea]" />
          </div>
        ) : error && !result ? (
          <div className="m-4 rounded-xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700">
            {error}
          </div>
        ) : (result?.sales.length ?? 0) === 0 ? (
          <div className="grid min-h-[300px] place-items-center px-6 text-center">
            <div>
              <ShoppingBag className="mx-auto size-8 text-slate-300" />
              <div className="mt-3 text-sm font-bold text-slate-700">No completed sales yet.</div>
              <div className="mt-1 text-xs text-slate-400">
                A sale appears here only after an order reaches DONE.
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[840px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Payment</th>
                    <th className="px-5 py-3">Delivery</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {result?.sales.map((sale) => (
                    <tr
                      key={sale.id}
                      onClick={() => navigate(`/dashboard/orders/${sale.orderId}`)}
                      className="cursor-pointer border-b border-slate-50 text-[12px] transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4 font-bold text-[#14203a]">#{sale.orderNumber}</td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-700">{sale.customerName}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">{sale.customerPhone}</div>
                      </td>
                      <td className="px-5 py-4 capitalize text-slate-500">
                        {sale.paymentMethod} · {sale.paymentStatus.replaceAll("_", " ")}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {sale.shippingTotal === 0
                          ? "Free"
                          : money(sale.shippingTotal, sale.currency)}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700">
                        {money(sale.total, sale.currency)}
                      </td>
                      <td className="px-5 py-4 text-slate-500">{when(sale.completedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 p-3 md:hidden">
              {result?.sales.map((sale) => (
                <button
                  key={sale.id}
                  type="button"
                  onClick={() => navigate(`/dashboard/orders/${sale.orderId}`)}
                  className="w-full rounded-xl border border-slate-100 bg-white p-3 text-left shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-bold text-[#14203a]">#{sale.orderNumber}</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-slate-600">
                        {sale.customerName}
                      </div>
                    </div>
                    <div className="text-[12px] font-bold text-slate-700">
                      {money(sale.total, sale.currency)}
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400">{when(sale.completedAt)}</div>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1 || loading}
            className="flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-500 disabled:opacity-40"
          >
            <ChevronLeft className="size-3.5" /> Previous
          </button>
          <span className="text-[10px] font-semibold text-slate-400">
            {(result?.total ?? 0).toLocaleString()} sales
          </span>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={page >= totalPages || loading}
            className="flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-500 disabled:opacity-40"
          >
            Next <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
