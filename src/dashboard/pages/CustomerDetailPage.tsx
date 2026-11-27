import { dashboardListHref } from "@/dashboard/lib/listContext";
import { useLanguage } from "@/dashboard/i18n";
import { useDashboardUnsavedChanges } from "@/dashboard/hooks/useDashboardUnsavedChanges";
import { ArrowLeft, Check, Loader2, Package, Save, ShieldAlert, Star, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const { t } = useLanguage();
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <div className="text-[13px] font-bold text-foreground">{t(title)}</div>
        {subtitle ? <div className="mt-0.5 text-[11px] text-muted-foreground">{t(subtitle)}</div> : null}
      </div>
      {children}
    </div>
  );
}

export default function CustomerDetailPage({ id }: { id: string }) {
  const { t, lang } = useLanguage();
  const locale = lang === "ar" ? "ar" : "en-US";
  const requestVersion = useRef(0);
  const saveLock = useRef<string | null>(null);
  const activeCustomerId = useRef(id);
  activeCustomerId.current = id;
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
    const version = ++requestVersion.current;
    setLoading(true);
    setSaving(false);
    setError("");
    try {
      const next = await getDashboardCustomer(id);
      if (version !== requestVersion.current || activeCustomerId.current !== id) return;
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
      if (version !== requestVersion.current || activeCustomerId.current !== id) return;
      setCustomer(null);
      setError(cause instanceof Error ? cause.message : "Unable to load customer.");
    } finally {
      if (version === requestVersion.current && activeCustomerId.current === id) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
    return () => {
      requestVersion.current += 1;
    };
  }, [load]);

  const dirty = useMemo(() => {
    if (!customer || customer.id !== id) return false;
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
  }, [customer, form, id]);
  useDashboardUnsavedChanges(dirty);

  const save = async () => {
    if (saveLock.current === id || loading || !dirty || !customer || customer.id !== id) return;
    if (form.name.trim().length < 2) {
      toast.error(t("Enter a valid customer name."));
      return;
    }
    const version = requestVersion.current;
    const customerId = customer.id;
    saveLock.current = customerId;
    setSaving(true);
    try {
      const next = await updateDashboardCustomer(customer.id, {
        name: form.name,
        email: form.email,
        city: form.city,
        defaultAddress: form.defaultAddress,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        internalNotes: form.internalNotes,
        isVip: form.isVip,
        isBlocked: form.isBlocked,
      });
      if (version !== requestVersion.current || activeCustomerId.current !== customerId) return;
      if (!next) throw new Error(t("Customer save could not be confirmed. Your edits are retained."));
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
      toast.success(t("Customer profile saved."));
    } catch (cause) {
      if (version === requestVersion.current && activeCustomerId.current === customerId) {
        toast.error(cause instanceof Error ? cause.message : t("Customer save failed."));
      }
    } finally {
      if (saveLock.current === customerId) saveLock.current = null;
      if (version === requestVersion.current && activeCustomerId.current === customerId) setSaving(false);
    }
  };

  if (loading && (!customer || customer.id !== id)) {
    return (
      <div className="grid min-h-[420px] place-items-center">
        <Loader2 className="size-6 animate-spin text-[#5968ea]" />
      </div>
    );
  }

  if (!customer || customer.id !== id) {
    return (
      <div>
        <button
          onClick={() => navigate(dashboardListHref("/dashboard/customers"))}
          className="mb-6 flex items-center gap-2 text-[12px] font-semibold text-muted-foreground"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" /> {t("Back to customers")}
        </button>
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <div role={error ? "alert" : "status"}>{error || t("Customer not found.")}</div>
          {error ? (
            <button type="button" disabled={loading} onClick={() => void load()} className="dashboard-button mt-4">
              {t("Retry")}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const money = (value: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(value);

  return (
    <div>
      <button
        onClick={() => navigate(dashboardListHref("/dashboard/customers"))}
        className="mb-6 flex items-center gap-2 text-[12px] font-semibold text-muted-foreground hover:text-[#5968ea]"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("Back to customers")}
      </button>

      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            {t("Customer profile")}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight text-foreground">
              {customer.name}
            </h1>
            {customer.isVip ? (
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700 dark:text-violet-300">
                {t("VIP")}
              </span>
            ) : null}
            {customer.isBlocked ? (
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                {t("Blocked")}
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {customer.phone} {t("· Customer since")}{" "}
            {new Date(customer.createdAt).toLocaleDateString(locale)}
          </p>
        </div>
        <button
          onClick={() => void save()}
          disabled={!dirty || saving || loading}
          className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white disabled:opacity-40"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
          {t("Save changes")}
        </button>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-[11px] text-muted-foreground">{t("Orders")}</div>
          <div className="mt-2 text-2xl font-bold text-foreground">{customer.totalOrders}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-[11px] text-muted-foreground">{t("Total spent")}</div>
          <div className="mt-2 text-2xl font-bold text-foreground">{money(customer.totalSpent)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-[11px] text-muted-foreground">{t("Last order")}</div>
          <div className="mt-2 text-lg font-bold text-foreground">
            {customer.lastOrderAt
              ? new Date(customer.lastOrderAt).toLocaleDateString(locale)
              : t("No orders")}
          </div>
        </div>
      </div>

      <fieldset disabled={saving || loading} className="grid min-w-0 gap-4 xl:grid-cols-[1.2fr_.8fr] disabled:opacity-70">
        <div className="space-y-4">
          <Panel title={t("Customer information")} subtitle={t("Staff-managed profile data")}>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {[
                ["Name", "name"],
                ["Email", "email"],
                ["City", "city"],
                ["Address", "defaultAddress"],
              ].map(([label, key]) => (
                <label key={key} className={key === "defaultAddress" ? "sm:col-span-2" : ""}>
                  <span className="mb-1.5 block text-[11px] font-bold text-muted-foreground">
                    {t(label)}
                  </span>
                  <input
                    type={key === "email" ? "email" : "text"}
                    value={form[key as keyof typeof form] as string}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [key]: event.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none focus:border-indigo-400"
                  />
                </label>
              ))}
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-bold text-muted-foreground">
                  {t("Tags")}
                </span>
                <input
                  value={form.tags}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, tags: event.target.value }))
                  }
                  placeholder={t("VIP, Beirut, Wholesale")}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none focus:border-indigo-400"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-bold text-muted-foreground">
                  {t("Internal notes")}
                </span>
                <textarea
                  value={form.internalNotes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, internalNotes: event.target.value }))
                  }
                  className="min-h-28 w-full rounded-xl border border-border bg-background p-3 text-[12px] outline-none focus:border-indigo-400"
                />
              </label>
            </div>
          </Panel>

          <Panel title={t("Order history")} subtitle={t("Matched by normalized customer phone")}>
            {customer.orders.length ? (
              <div className="divide-y divide-border">
                {customer.orders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 text-start hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  >
                    <div>
                      <div className="text-[12px] font-bold text-foreground">
                        {t("Order #")} {order.publicOrderNumber}
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString(locale)} · {order.status} ·{" "}
                        {order.paymentStatus}
                      </div>
                    </div>
                    <div className="text-[12px] font-bold text-foreground">
                      {new Intl.NumberFormat(locale, {
                        style: "currency",
                        currency: order.currency || "USD",
                      }).format(order.total)}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center text-[11px] text-muted-foreground">
                {t("No orders for this customer yet.")}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title={t("Customer status")}>
            <div className="space-y-4 p-5">
              <label className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/30 p-4">
                <input
                  type="checkbox"
                  checked={form.isVip}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isVip: event.target.checked }))
                  }
                  className="mt-0.5"
                />
                <span>
                  <span className="flex items-center gap-2 text-[12px] font-bold text-violet-700 dark:text-violet-300">
                    <Star className="size-3.5" /> {t("VIP customer")}
                  </span>
                  <span className="mt-1 block text-[10px] text-violet-600">
                    {t("Use for priority service and segmentation.")}
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30 p-4">
                <input
                  type="checkbox"
                  checked={form.isBlocked}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isBlocked: event.target.checked }))
                  }
                  className="mt-0.5"
                />
                <span>
                  <span className="flex items-center gap-2 text-[12px] font-bold text-rose-700 dark:text-rose-300">
                    <ShieldAlert className="size-3.5" /> {t("Block customer")}
                  </span>
                  <span className="mt-1 block text-[10px] text-rose-600">
                    {t("Flags this CRM record as restricted.")}
                  </span>
                </span>
              </label>
            </div>
          </Panel>

          <Panel title={t("Identity")}>
            <div className="space-y-3 p-5 text-[11px]">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-full bg-indigo-50 text-indigo-600">
                  <User className="size-4" />
                </div>
                <div>
                  <div className="font-bold text-foreground">{customer.phone}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {t("Phone identity is locked to protect order history.")}
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-muted px-3 py-2 text-[10px] text-muted-foreground">
                {t(
                  "Product and order metrics remain automatic even after staff edits this profile.",
                )}
              </div>
            </div>
          </Panel>

          <Panel title={t("Tags")}>
            <div className="flex flex-wrap gap-2 p-5">
              {form.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean)
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              {!form.tags.trim() ? (
                <span className="text-[11px] text-muted-foreground">{t("No tags yet.")}</span>
              ) : null}
            </div>
          </Panel>
        </div>
      </fieldset>

      {dirty ? (
        <div className="dashboard-save-bar fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-xl">
          <Check className="size-4 text-amber-500" />
          <span className="text-[11px] font-semibold text-muted-foreground">
            {t("Unsaved customer changes")}
          </span>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="rounded-lg bg-[#5968ea] px-3 py-1.5 text-[10px] font-bold text-white"
          >
            {t("Save")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
