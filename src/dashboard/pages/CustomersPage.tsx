import DashboardListViews from "@/dashboard/components/layout/DashboardListViews";
import { useDashboardQueryState } from "@/dashboard/hooks/useDashboardQueryState";
import { PageTitle } from "@/dashboard/components/layout/PageTitle";
import { useLanguage } from "@/dashboard/i18n";
import DashboardResponsiveTable from "@/dashboard/components/DashboardResponsiveTable";
import { useDashboardModal } from "@/dashboard/hooks/useDashboardModal";
import { useDashboardUnsavedChanges } from "@/dashboard/hooks/useDashboardUnsavedChanges";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  createDashboardCustomer,
  listDashboardCustomers,
  type DashboardCustomerFilter,
  type DashboardCustomerListResult,
} from "@/dashboard/data/customers";

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  const { t } = useLanguage();
  return (
    <div className="dashboard-metric-card rounded-2xl border border-border bg-card p-5">
      <div className="text-[11px] text-slate-400">{t(label)}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-foreground">{value}</div>
      <div className="mt-1 text-[10px] text-slate-400">{t(detail)}</div>
    </div>
  );
}

export default function CustomersPage() {
  const { t, lang } = useLanguage();
  const locale = lang === "ar" ? "ar" : "en-US";
  const money = (value: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(value);
  const [, navigate] = useLocation();
  const [search, setSearch] = useDashboardQueryState<string>("search", "");
  const [filter, setFilter] = useDashboardQueryState<DashboardCustomerFilter>("filter", "all", [
    "all",
    "vip",
    "blocked",
  ]);
  const [page, setPage] = useDashboardQueryState<number>("page", 1);
  const [result, setResult] = useState<DashboardCustomerListResult | null>(null);
  const requestVersion = useRef(0);
  const createLock = useRef(false);
  const mounted = useRef(true);
  const queryKey = JSON.stringify([search, filter, page]);
  const currentQuery = useRef(queryKey);
  currentQuery.current = queryKey;
  const [resultQuery, setResultQuery] = useState("");
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
  const createDirty = showCreate && Object.values(draft).some(Boolean);
  const markDraftSaved = useDashboardUnsavedChanges(createDirty);
  const closeCreate = () => {
    if (createLock.current) return;
    if (!createDirty || window.confirm(t("Discard unsaved changes?"))) setShowCreate(false);
  };
  const createDialogRef = useDashboardModal(closeCreate, showCreate);

  const load = useCallback(
    async (manual = false) => {
      const version = ++requestVersion.current;
      const requestedQuery = queryKey;
      if (manual) setRefreshing(true);
      else setLoading(true);
      try {
        const next = await listDashboardCustomers({ search, filter, page, pageSize: 20 });
        if (version !== requestVersion.current || currentQuery.current !== requestedQuery) return;
        const lastPage = Math.max(1, Math.ceil(next.total / next.pageSize));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setResult(next);
        setResultQuery(requestedQuery);
        setError("");
        if (manual) toast.success("Customers refreshed from Supabase.");
      } catch (cause) {
        if (version !== requestVersion.current || currentQuery.current !== requestedQuery) return;
        const message = cause instanceof Error ? cause.message : "Unable to load customers.";
        setError(message);
        if (manual) toast.error(message);
      } finally {
        if (version === requestVersion.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [filter, page, search, queryKey, setPage],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    const timer = window.setTimeout(() => void load(false), search ? 250 : 0);
    return () => {
      requestVersion.current += 1;
      window.clearTimeout(timer);
    };
  }, [load, search]);

  const totalPages = useMemo(
    () => resultQuery === queryKey
      ? Math.max(1, Math.ceil((result?.total ?? 0) / (result?.pageSize ?? 20)))
      : 1,
    [result, resultQuery, queryKey],
  );

  const createCustomer = async () => {
    if (createLock.current) return;
    if (draft.name.trim().length < 2 || draft.phone.replace(/\D/g, "").length < 6) {
      toast.error("Enter a valid customer name and phone.");
      return;
    }
    createLock.current = true;
    setCreating(true);
    try {
      const customer = await createDashboardCustomer({
        name: draft.name,
        phone: draft.phone,
        email: draft.email,
        city: draft.city,
        defaultAddress: draft.defaultAddress,
        tags: draft.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        internalNotes: draft.internalNotes,
        isVip: draft.isVip,
        isBlocked: draft.isBlocked,
      });
      if (!mounted.current) return;
      if (!customer) throw new Error(t("Customer creation could not be confirmed."));
      toast.success(t("Customer created."));
      markDraftSaved();
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
      navigate(`/dashboard/customers/${customer.id}`);
    } catch (cause) {
      if (mounted.current) {
        toast.error(cause instanceof Error ? cause.message : t("Customer creation failed."));
      }
    } finally {
      createLock.current = false;
      if (mounted.current) setCreating(false);
    }
  };

  if (loading && !result) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-2xl border border-border bg-card">
        <Loader2 className="size-6 animate-spin text-[#5968ea]" />
      </div>
    );
  }

  const activeResult = resultQuery === queryKey ? result : null;
  const customers = activeResult?.customers ?? [];
  const stats = result?.stats;
  const pending = loading || refreshing || (!activeResult && !error);

  return (
    <div>
      <div className="dashboard-page-header mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <PageTitle
            eyebrow="Commerce / Customers"
            title="Customers"
            description="Commerce CRM backed by real Supabase customer and order data."
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void load(true)}
            disabled={pending}
            className="dashboard-button flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {t("Refresh")}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="dashboard-button dashboard-button-primary flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold"
          >
            <Plus className="size-4" /> {t("Add customer")}
          </button>
        </div>
      </div>

      <DashboardListViews
        scope="customers"
        keys={["filter"]}
        presets={[
          { name: "VIP customers", query: "filter=vip" },
          { name: "Blocked customers", query: "filter=blocked" },
        ]}
      />

      <div className="dashboard-summary-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("Total customers")}
          value={stats ? stats.total.toLocaleString(locale) : "—"}
          detail="Real CRM records"
        />
        <StatCard
          label={t("VIP customers")}
          value={stats ? stats.vip.toLocaleString(locale) : "—"}
          detail="Flagged by staff"
        />
        <StatCard
          label={t("Blocked")}
          value={stats ? stats.blocked.toLocaleString(locale) : "—"}
          detail="Restricted customers"
        />
        <StatCard
          label={t("Avg. lifetime value")}
          value={stats ? money(stats.averageLifetimeValue) : "—"}
          detail="Across all customers"
        />
      </div>

      <div className="dashboard-catalog-panel mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              aria-label={t("Search name, phone, email or city")}
              placeholder={t("Search name, phone, email or city")}
              className="h-10 w-full rounded-xl border border-border bg-background ps-9 pe-3 text-[11px] outline-none focus:border-indigo-400"
            />
          </div>
          <select
            aria-label={t("Customer status")}
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value as DashboardCustomerFilter);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-background px-3 text-[11px] font-semibold text-slate-600"
          >
            <option value="all">{t("All customers")}</option>
            <option value="vip">{t("VIP only")}</option>
            <option value="blocked">{t("Blocked only")}</option>
          </select>
        </div>

        {pending ? (
          <div role="status" className="flex items-center gap-2 border-b border-border px-5 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
            {lang === "ar" ? "جارٍ تحميل العملاء…" : "Loading customers…"}
          </div>
        ) : null}
        {error ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <span className="min-w-0 flex-1 break-words">{error}</span>
            <button type="button" disabled={pending} onClick={() => void load(true)} className="dashboard-button">
              {t("Retry")}
            </button>
          </div>
        ) : null}
        <div className="overflow-x-auto" aria-busy={pending}>
          <DashboardResponsiveTable>
            <table className="w-full min-w-[900px] text-start">
              <thead className="bg-[#fafbfe]">
                <tr className="border-b border-slate-100 text-[10px] uppercase tracking-[.12em] text-slate-400">
                  <th className="px-5 py-3">{t("Customer")}</th>
                  <th className="px-3 py-3">{t("Phone")}</th>
                  <th className="px-3 py-3">{t("Orders")}</th>
                  <th className="px-3 py-3">{t("Total spent")}</th>
                  <th className="px-3 py-3">{t("Last order")}</th>
                  <th className="px-3 py-3">{t("Tags")}</th>
                  <th className="px-5 py-3">{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/dashboard/customers/${customer.id}`);
                      }
                    }}
                    onClick={() => navigate(`/dashboard/customers/${customer.id}`)}
                    className="cursor-pointer border-b border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  >
                    <td className="px-5 py-4">
                      <div className="text-[12px] font-bold text-slate-700">{customer.name}</div>
                      <div className="mt-0.5 text-[10px] text-slate-400">
                        {customer.email || t("No email")}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-[11px] text-slate-500">{customer.phone}</td>
                    <td className="px-3 py-4 text-[12px] font-bold text-slate-700">
                      {customer.totalOrders}
                    </td>
                    <td className="px-3 py-4 text-[12px] font-bold text-slate-700">
                      {money(customer.totalSpent)}
                    </td>
                    <td className="px-3 py-4 text-[11px] text-slate-400">
                      {customer.lastOrderAt
                        ? new Date(customer.lastOrderAt).toLocaleDateString(locale)
                        : "—"}
                    </td>
                    <td className="max-w-[220px] px-3 py-4">
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        {customer.isVip ? (
                          <span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-700">
                            {t("VIP")}
                          </span>
                        ) : null}
                        {customer.isBlocked ? (
                          <span className="rounded-full bg-rose-50 px-2 py-1 text-[9px] font-bold text-rose-700">
                            {t("Blocked")}
                          </span>
                        ) : null}
                        {!customer.isVip && !customer.isBlocked ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">
                            {t("Active")}
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DashboardResponsiveTable>
        </div>

        {!customers.length && !pending && !error ? (
          <div className="px-6 py-14 text-center">
            <Users className="mx-auto size-8 text-slate-300" />
            <div className="mt-3 text-sm font-bold text-slate-600">
              {search || filter !== "all"
                ? t("No customers match these filters.")
                : t("No customers yet.")}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {t("Customers are created automatically from orders, or you can add one manually.")}
            </div>
            {search || filter !== "all" ? (
              <button type="button" className="dashboard-button mt-4" onClick={() => {
                setSearch("");
                setFilter("all");
                setPage(1);
              }}>
                {t("Clear filters")}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <span className="text-[11px] text-slate-400">
            {t("Showing")} {activeResult?.total ? (activeResult.page - 1) * activeResult.pageSize + 1 : 0}–
            {Math.min((activeResult?.page ?? 1) * (activeResult?.pageSize ?? 20), activeResult?.total ?? 0)} {t("of")}{" "}
            {activeResult?.total ?? 0}
          </span>
          <div className="flex items-center gap-2">
            <button
              aria-label={t("Previous page")}
              disabled={pending || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
            >
              <ChevronLeft className="size-4 rtl:rotate-180" />
            </button>
            <span className="text-[10px] font-semibold text-slate-400">
              {t("Page")} {page} / {totalPages}
            </span>
            <button
              aria-label={t("Next page")}
              disabled={pending || page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
            >
              <ChevronRight className="size-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div
            ref={createDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("Add customer")}
            tabIndex={-1}
            className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-card text-foreground shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.16em] text-indigo-500">
                  {t("Customers")}
                </div>
                <div className="mt-1 text-xl font-bold text-[#14203a]">{t("Add customer")}</div>
              </div>
              <button
                onClick={closeCreate}
                aria-label={t("Close dialog")}
                className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-500"
              >
                <X className="size-4" />
              </button>
            </div>
            <fieldset disabled={creating} className="grid gap-4 p-6 sm:grid-cols-2 disabled:opacity-70">
              {[
                ["Name", "name"],
                ["Phone", "phone"],
                ["Email", "email"],
                ["City", "city"],
                ["Address", "defaultAddress"],
                ["Tags (comma separated)", "tags"],
              ].map(([label, key]) => (
                <label
                  key={key}
                  className={key === "defaultAddress" || key === "tags" ? "sm:col-span-2" : ""}
                >
                  <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                    {t(label)}
                  </span>
                  <input
                    type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
                    autoComplete={key === "name" ? "name" : key === "email" ? "email" : key === "phone" ? "tel" : "off"}
                    value={draft[key as keyof typeof draft] as string}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [key]: event.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none focus:border-indigo-400"
                  />
                </label>
              ))}
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                  {t("Internal notes")}
                </span>
                <textarea
                  value={draft.internalNotes}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, internalNotes: event.target.value }))
                  }
                  className="min-h-24 w-full rounded-xl border border-border bg-background p-3 text-[12px] outline-none focus:border-indigo-400"
                />
              </label>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={draft.isVip}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, isVip: event.target.checked }))
                  }
                />
                {t("VIP customer")}
              </label>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={draft.isBlocked}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, isBlocked: event.target.checked }))
                  }
                />
                {t("Block customer")}
              </label>
            </fieldset>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                onClick={closeCreate}
                className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-bold text-slate-600"
              >
                {t("Cancel")}
              </button>
              <button
                onClick={() => void createCustomer()}
                disabled={creating}
                className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white disabled:opacity-60"
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserPlus className="size-4" />
                )}{" "}
                {t("Create customer")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
