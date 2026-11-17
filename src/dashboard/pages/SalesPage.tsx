import { useLanguage } from "@/dashboard/i18n";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { listDashboardSales, type DashboardSalesResult } from "@/dashboard/data/sales";

function money(value: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "USD",
    }).format(value);
  } catch {
    return `${currency || "USD"} ${value.toFixed(2)}`;
  }
}

function when(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function SalesPage() {
  const { t, lang } = useLanguage();
  const locale = lang === "ar" ? "ar-LB" : "en-US";
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<DashboardSalesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);

  const load = useCallback(
    async (manual = false) => {
      const request = ++requestVersion.current;
      setLoading(true);
      // A new search/page must never show rows from the previous query.
      if (!manual) setResult(null);
      setError("");
      try {
        const next = await listDashboardSales({ search, page, pageSize: 10 });
        if (request !== requestVersion.current) return;
        setResult(next);
        const lastPage = Math.max(1, Math.ceil(next.total / next.pageSize));
        if (page > lastPage) setPage(lastPage);
        if (manual) toast.success(lang === "ar" ? "تم تحديث المبيعات." : "Sales refreshed.");
      } catch (cause) {
        if (request !== requestVersion.current) return;
        const message =
          cause instanceof Error
            ? cause.message
            : lang === "ar" ? "تعذر تحميل المبيعات." : "Unable to load sales.";
        setError(message);
        if (manual) toast.error(message);
      } finally {
        if (request === requestVersion.current) setLoading(false);
      }
    },
    [page, search, lang],
  );

  useEffect(() => {
    void load(false);
    return () => {
      // Discard responses after filters change or this page unmounts.
      requestVersion.current += 1;
    };
  }, [load]);

  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / (result?.pageSize ?? 10)));

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSearch = query.trim().replace(/^#\s*(\d+)$/, "$1");
    setQuery(nextSearch);
    if (page === 1 && search === nextSearch) {
      void load(false);
      return;
    }
    setPage(1);
    setSearch(nextSearch);
  };

  return (
    <div aria-busy={loading}>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            <span className="size-1.5 rounded-full bg-[#6a70e7]" />
            {t("Commerce / Completed orders")}
          </div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">{t("Sales")}</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            {t("Read-only sales ledger created when an order reaches DONE.")}
          </p>
        </div>
        <button
          onClick={() => void load(true)}
          disabled={loading}
          className="flex h-10 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600 disabled:opacity-50 md:self-auto"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("Refresh")}
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          <div className="text-[11px] text-slate-400">{search ? (lang === "ar" ? "المبيعات المطابقة" : "Matching sales") : t("Completed sales")}</div>
          <div className="mt-1 text-2xl font-bold text-[#14203a]">
            {result ? result.total.toLocaleString(locale) : "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          <div className="text-[11px] text-slate-400">{t("Ledger rule")}</div>
          <div className="mt-1 text-sm font-bold text-[#14203a]">
            {t("DELIVERED → DONE → Sales")}
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            {t("One immutable sales snapshot per order.")}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
          <form onSubmit={submitSearch} role="search" className="flex w-full flex-wrap items-center gap-2 md:max-w-xl">
            <div className="relative min-w-0 flex-[1_1_220px]">
              <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-300" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={t("Search order number, customer or phone")}
                placeholder={t("Search order number, customer or phone")}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white ps-9 pe-3 text-[12px] text-slate-700 outline-none focus:border-[#6974eb] focus:ring-4 focus:ring-[#6974eb]/10"
              />
            </div>
            <button
              type="submit"
              className="h-10 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6974eb]/30"
            >
              {t("Search")}
            </button>
            {(query || search) && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setPage(1);
                  setSearch("");
                  if (!search && page === 1) void load(false);
                }}
                className="h-10 rounded-xl border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6974eb]/20"
              >
                {t("Clear search")}
              </button>
            )}
          </form>
          <div className="text-[10px] font-semibold text-slate-400">
            {result ? (
              <>{t("Page")} {page.toLocaleString(locale)} {t("of")} {totalPages.toLocaleString(locale)}</>
            ) : loading ? t("Loading…") : "—"}
          </div>
        </div>

        {error && (
          <div role="alert" className="m-4 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <p className="break-words">{error}</p>
            {result && (
              <p className="mt-1 text-xs">
                {lang === "ar" ? "تظهر آخر بيانات تم تحميلها بنجاح. أعد المحاولة لتحديثها." : "Showing the last successful data. Retry to update it."}
              </p>
            )}
            <button
              type="button"
              onClick={() => void load(Boolean(result))}
              disabled={loading}
              className="mt-3 rounded-lg border border-current px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              {t("Retry")}
            </button>
          </div>
        )}

        {loading && !result ? (
          <div role="status" className="grid min-h-[320px] place-items-center">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 aria-hidden="true" className="size-5 animate-spin text-[#5968ea]" />
              {t("Loading…")}
            </div>
          </div>
        ) : error && !result ? null : (result?.sales.length ?? 0) === 0 ? (
          <div className="grid min-h-[300px] place-items-center px-6 text-center">
            <div>
              <ShoppingBag className="mx-auto size-8 text-slate-300" />
              <div className="mt-3 text-sm font-bold text-slate-700">
                {search ? t("No results") : t("No completed sales yet.")}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {search ? t("Clear filters or try another search.") : t("A sale appears here only after an order reaches DONE.")}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[840px] border-collapse text-start">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wide text-slate-400">
                    <th scope="col" className="px-5 py-3 text-start">{t("Order")}</th>
                    <th scope="col" className="px-5 py-3 text-start">{t("Customer")}</th>
                    <th scope="col" className="px-5 py-3 text-start">{t("Payment")}</th>
                    <th scope="col" className="px-5 py-3 text-start">{t("Delivery")}</th>
                    <th scope="col" className="px-5 py-3 text-start">{t("Total")}</th>
                    <th scope="col" className="px-5 py-3 text-start">{t("Completed")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result?.sales.map((sale) => (
                    <tr
                      key={sale.id}
                      onClick={() => navigate(`/dashboard/orders/${sale.orderId}`)}
                      className="cursor-pointer border-b border-slate-50 text-[12px] transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4 font-bold text-[#14203a]">
                        <Link
                          href={`/dashboard/orders/${sale.orderId}`}
                          onClick={(event) => event.stopPropagation()}
                          className="rounded-md underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6974eb]"
                          aria-label={`${t("Open order →")} #${sale.orderNumber}`}
                        >
                          #{sale.orderNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-700">{sale.customerName}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          {sale.customerPhone}
                        </div>
                      </td>
                      <td className="px-5 py-4 capitalize text-slate-500">
                        {sale.paymentMethod} · {sale.paymentStatus.replaceAll("_", " ")}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {sale.shippingTotal === 0
                          ? t("Free")
                          : money(sale.shippingTotal, sale.currency, locale)}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700">
                        {money(sale.total, sale.currency, locale)}
                      </td>
                      <td className="px-5 py-4 text-slate-500">{when(sale.completedAt, locale)}</td>
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
                  className="w-full rounded-xl border border-slate-100 bg-white p-3 text-start shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-bold text-[#14203a]">
                        #{sale.orderNumber}
                      </div>
                      <div className="mt-0.5 text-[11px] font-semibold text-slate-600">
                        {sale.customerName}
                      </div>
                    </div>
                    <div className="text-[12px] font-bold text-slate-700">
                      {money(sale.total, sale.currency, locale)}
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400">{when(sale.completedAt, locale)}</div>
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
            <ChevronLeft className="size-3.5" /> {t("Previous")}
          </button>
          <span className="text-[10px] font-semibold text-slate-400">
            {result ? result.total.toLocaleString(locale) : "—"} {t("sales")}
          </span>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={!result || page >= totalPages || loading}
            className="flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-500 disabled:opacity-40"
          >
            {t("Next")}
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
