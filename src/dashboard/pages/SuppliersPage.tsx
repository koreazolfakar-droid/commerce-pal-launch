import { useDashboardFormGuard } from "@/dashboard/hooks/useDashboardFormGuard";
import DashboardLoadError from "@/dashboard/components/DashboardLoadError";
import { useDashboardQueryState } from "@/dashboard/hooks/useDashboardQueryState";
import { useLanguage } from "@/dashboard/i18n";
import { Building2, Loader2, MapPin, Plus, Search, Save, Truck, X, RefreshCw } from "lucide-react";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  createReceivingSupplier,
  loadReceivingWorkspace,
  saveProcurementLocation,
  updateReceivingSupplier,
  type ProcurementLocation,
  type ReceivingSupplier,
  type ReceivingWorkspace,
} from "@/dashboard/data/receiving";

type SupplierDraft = {
  id?: string;
  name: string;
  code: string;
  phone: string;
  email: string;
  notes: string;
  isActive: boolean;
};

type LocationDraft = {
  id?: string;
  name: string;
  code: string;
  address: string;
  isActive: boolean;
};

const blankSupplier: SupplierDraft = {
  name: "",
  code: "",
  phone: "",
  email: "",
  notes: "",
  isActive: true,
};

const blankLocation: LocationDraft = {
  name: "",
  code: "",
  address: "",
  isActive: true,
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function SuppliersPage() {
  const { t, lang } = useLanguage();
  const [workspace, setWorkspace] = useState<ReceivingWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const requestVersion = useRef(0);
  const mounted = useRef(true);
  const [query, setQuery] = useDashboardQueryState<string>("search", "");
  const [supplierDraft, setSupplierDraft] = useState<SupplierDraft | null>(null);
  const [locationDraft, setLocationDraft] = useState<LocationDraft | null>(null);

  const formGuard = useDashboardFormGuard(
    Boolean(supplierDraft || locationDraft),
    supplierDraft || locationDraft,
    saving,
    () => {
      setSupplierDraft(null);
      setLocationDraft(null);
    },
  );
  const openSupplier = (draft: SupplierDraft) => {
    if (saveLock.current) return;
    if (formGuard.close()) setSupplierDraft(draft);
  };
  const openLocation = (draft: LocationDraft) => {
    if (saveLock.current) return;
    if (formGuard.close()) setLocationDraft(draft);
  };

  const load = useCallback(async () => {
    const request = ++requestVersion.current;
    setLoading(true);
    setLoadError("");
    try {
      const next = await loadReceivingWorkspace({
        includeReceivings: false,
        includeProductOptions: false,
        includeAudit: false,
        includeSerials: false,
      });
      if (request !== requestVersion.current || !mounted.current) return;
      setWorkspace(next);
    } catch (cause) {
      if (request !== requestVersion.current || !mounted.current) return;
      setLoadError(cause instanceof Error ? cause.message : "Unable to load suppliers.");
    } finally {
      if (request === requestVersion.current && mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      requestVersion.current += 1;
    };
  }, [load]);

  const supplierStats = useMemo(() => {
    const result = new Map<string, { poCount: number; spend: number; lastPoAt: string | null }>();
    for (const po of workspace?.purchaseOrders ?? []) {
      const current = result.get(po.supplierId) ?? { poCount: 0, spend: 0, lastPoAt: null };
      current.poCount += 1;
      if (!["cancelled", "rejected"].includes(po.status))
        current.spend += po.grandTotal * po.exchangeRate;
      if (!current.lastPoAt || new Date(po.createdAt) > new Date(current.lastPoAt))
        current.lastPoAt = po.createdAt;
      result.set(po.supplierId, current);
    }
    return result;
  }, [workspace]);

  const filteredSuppliers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return workspace?.suppliers ?? [];
    return (workspace?.suppliers ?? []).filter((supplier) =>
      [supplier.name, supplier.code, supplier.phone, supplier.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, workspace]);

  const editSupplier = (supplier: ReceivingSupplier) => {
    openSupplier({
      id: supplier.id,
      name: supplier.name,
      code: supplier.code ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      notes: supplier.notes ?? "",
      isActive: supplier.isActive,
    });
  };

  const saveSupplier = async () => {
    if (saveLock.current || loading) return;
    if (!supplierDraft) return;
    if (!supplierDraft.name.trim()) return toast.error(t("Supplier name is required."));
    saveLock.current = true;
    requestVersion.current += 1;
    setLoading(false);
    setSaving(true);
    try {
      if (supplierDraft.id) {
        await updateReceivingSupplier({
          id: supplierDraft.id,
          name: supplierDraft.name,
          code: supplierDraft.code,
          phone: supplierDraft.phone,
          email: supplierDraft.email,
          notes: supplierDraft.notes,
          isActive: supplierDraft.isActive,
        });
        if (!mounted.current) return;
        toast.success(t("Supplier updated."));
      } else {
        await createReceivingSupplier({
          name: supplierDraft.name,
          code: supplierDraft.code,
          phone: supplierDraft.phone,
          email: supplierDraft.email,
          notes: supplierDraft.notes,
          isActive: supplierDraft.isActive,
        });
        if (!mounted.current) return;
        toast.success(t("Supplier created."));
      }
      formGuard.markSaved();
      setSupplierDraft(null);
      await load();
    } catch (cause) {
      if (mounted.current) toast.error(cause instanceof Error ? cause.message : t("Saving supplier failed."));
    } finally {
      saveLock.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const editLocation = (location: ProcurementLocation) => {
    openLocation({
      id: location.id,
      name: location.name,
      code: location.code,
      address: location.address ?? "",
      isActive: location.isActive,
    });
  };

  const saveLocation = async () => {
    if (saveLock.current || loading) return;
    if (!locationDraft) return;
    if (!locationDraft.name.trim() || !locationDraft.code.trim()) {
      toast.error(lang === "ar" ? "أدخل اسم الموقع ورمزه قبل الحفظ." : "Enter a location name and code before saving.");
      return;
    }
    saveLock.current = true;
    requestVersion.current += 1;
    setLoading(false);
    setSaving(true);
    try {
      await saveProcurementLocation({
        id: locationDraft.id,
        name: locationDraft.name,
        code: locationDraft.code,
        address: locationDraft.address,
        isActive: locationDraft.isActive,
      });
      if (!mounted.current) return;
      toast.success(t(locationDraft.id ? "Location updated." : "Location created."));
      formGuard.markSaved();
      setLocationDraft(null);
      await load();
    } catch (cause) {
      if (mounted.current) toast.error(cause instanceof Error ? cause.message : t("Saving location failed."));
    } finally {
      saveLock.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  if (loading && !workspace) {
    return (
      <div className="grid min-h-[440px] place-items-center rounded-2xl border border-border bg-card">
        <Loader2 className="size-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div aria-busy={loading || saving}>
      {loadError && (
        <DashboardLoadError message={loadError} busy={loading || saving} onRetry={() => { if (!saveLock.current) void load(); }} />
      )}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-indigo-600">
            {t("Commerce / Procurement")}
          </div>
          <h1 className="mt-2 text-[30px] font-bold tracking-[-.05em] text-[#14203a]">
            {t("Suppliers & Locations")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("Manage supplier contacts, purchasing history and receiving destinations.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => { if (!saveLock.current) void load(); }}
            className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-[11px] font-bold text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> {t("Refresh")}
          </button>
          <button
            disabled={loading || saving}
            onClick={() => openLocation({ ...blankLocation })}
            className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-[11px] font-bold text-slate-700"
          >
            <MapPin className="size-3.5" /> {t("New location")}
          </button>
          <button
            disabled={loading || saving}
            onClick={() => openSupplier({ ...blankSupplier })}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#14203a] px-4 text-[11px] font-bold text-white"
          >
            <Plus className="size-3.5" /> {t("New supplier")}
          </button>
        </div>
      </div>

      {supplierDraft ? (
        <div className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-[0_8px_24px_rgba(33,47,82,.05)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[14px] font-bold text-[#14203a]">
              {supplierDraft.id ? t("Edit supplier") : t("New supplier")}
            </div>
            <button
              onClick={formGuard.close}
              disabled={saving}
              aria-label={t("Close supplier form")}
              className="grid size-8 place-items-center rounded-lg hover:bg-slate-100"
            >
              <X className="size-4 text-slate-500" />
            </button>
          </div>
          <fieldset disabled={saving} className="min-w-0 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="text"
              aria-label={t("Supplier name")}
              value={supplierDraft.name}
              onChange={(e) => setSupplierDraft({ ...supplierDraft, name: e.target.value })}
              placeholder={t("Supplier name")}
              className="h-10 rounded-xl border border-slate-200 px-3 text-[12px]"
            />
            <input
              type="text"
              aria-label={t("Code")}
              value={supplierDraft.code}
              onChange={(e) => setSupplierDraft({ ...supplierDraft, code: e.target.value })}
              placeholder={t("Code")}
              className="h-10 rounded-xl border border-slate-200 px-3 text-[12px]"
            />
            <input
              type="tel"
              aria-label={t("Phone")}
              value={supplierDraft.phone}
              onChange={(e) => setSupplierDraft({ ...supplierDraft, phone: e.target.value })}
              placeholder={t("Phone")}
              className="h-10 rounded-xl border border-slate-200 px-3 text-[12px]"
            />
            <input
              type="email"
              aria-label={t("Email")}
              value={supplierDraft.email}
              onChange={(e) => setSupplierDraft({ ...supplierDraft, email: e.target.value })}
              placeholder={t("Email")}
              className="h-10 rounded-xl border border-slate-200 px-3 text-[12px]"
            />
            <input
              type="text"
              aria-label={t("Internal notes")}
              value={supplierDraft.notes}
              onChange={(e) => setSupplierDraft({ ...supplierDraft, notes: e.target.value })}
              placeholder={t("Internal notes")}
              className="h-10 rounded-xl border border-slate-200 px-3 text-[12px] md:col-span-2 xl:col-span-3"
            />
            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[11px] text-slate-600">
              <input
                type="checkbox"
                checked={supplierDraft.isActive}
                onChange={(e) => setSupplierDraft({ ...supplierDraft, isActive: e.target.checked })}
              />
              {t("Active supplier")}
            </label>
          </fieldset>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => void saveSupplier()}
              disabled={saving || !supplierDraft.name.trim()}
              className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-5 text-[11px] font-bold text-white disabled:opacity-50"
            >
              <Save className="size-3.5" /> {t("Save supplier")}
            </button>
          </div>
        </div>
      ) : null}

      {locationDraft ? (
        <div className="mb-5 rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[14px] font-bold text-[#14203a]">
              {locationDraft.id ? t("Edit location") : t("New store / warehouse")}
            </div>
            <button
              onClick={formGuard.close}
              disabled={saving}
              aria-label={t("Close location form")}
            >
              <X className="size-4 text-slate-500" />
            </button>
          </div>
          <fieldset disabled={saving} className="min-w-0 grid gap-3 md:grid-cols-4">
            <input
              type="text"
              aria-label={t("Location name")}
              value={locationDraft.name}
              onChange={(e) => setLocationDraft({ ...locationDraft, name: e.target.value })}
              placeholder={t("Location name")}
              className="h-10 rounded-xl border border-slate-200 px-3 text-[12px]"
            />
            <input
              type="text"
              aria-label={t("Code")}
              value={locationDraft.code}
              onChange={(e) => setLocationDraft({ ...locationDraft, code: e.target.value })}
              placeholder={t("Code")}
              className="h-10 rounded-xl border border-slate-200 px-3 text-[12px]"
            />
            <input
              type="text"
              aria-label={t("Address")}
              value={locationDraft.address}
              onChange={(e) => setLocationDraft({ ...locationDraft, address: e.target.value })}
              placeholder={t("Address")}
              className="h-10 rounded-xl border border-slate-200 px-3 text-[12px]"
            />
            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[11px] text-slate-600">
              <input
                type="checkbox"
                checked={locationDraft.isActive}
                onChange={(e) => setLocationDraft({ ...locationDraft, isActive: e.target.checked })}
              />{" "}
              {t("Active")}
            </label>
          </fieldset>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => void saveLocation()}
              disabled={saving || !locationDraft.name.trim() || !locationDraft.code.trim()}
              className="rounded-xl bg-[#5968ea] px-5 py-2.5 text-[11px] font-bold text-white"
            >
              {t("Save location")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-5 rounded-2xl border border-border bg-card p-4">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label={t("Search suppliers by name, code, phone or email")}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search suppliers by name, code, phone or email")}
            className="h-10 w-full rounded-xl border border-slate-200 ps-9 pe-3 text-[11px]"
          />
        </div>
        {query.trim() && (
          <button type="button" onClick={() => setQuery("")} className="mt-2 text-xs font-semibold text-primary hover:underline">
            {t("Clear search")}
          </button>
        )}
      </div>

      <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div className="flex items-center gap-2 text-[14px] font-bold text-[#14203a]">
            <Truck className="size-4" /> {t("Suppliers")}
          </div>
          <span className="text-[10px] font-bold text-slate-400">{filteredSuppliers.length}</span>
        </div>
        <div className="divide-y divide-slate-100">
          {!filteredSuppliers.length && (
            <div role="status" className="p-6 text-center text-sm text-muted-foreground">
              {query.trim()
                ? (lang === "ar" ? "لا يوجد مورّد مطابق. جرّب بحثاً آخر أو امسح البحث." : "No matching suppliers. Try another search or clear it.")
                : (lang === "ar" ? "لم تتم إضافة مورّدين بعد." : "No suppliers added yet.")}
            </div>
          )}
          {filteredSuppliers.map((supplier) => {
            const stats = supplierStats.get(supplier.id) ?? {
              poCount: 0,
              spend: 0,
              lastPoAt: null,
            };
            return (
              <button
                key={supplier.id}
                disabled={saving || loading}
                onClick={() => editSupplier(supplier)}
                className="grid w-full gap-3 p-4 text-start transition hover:bg-slate-50 md:grid-cols-[1.2fr_1fr_repeat(3,.65fr)] md:items-center"
              >
                <div>
                  <div className="text-[12px] font-bold text-slate-800">{supplier.name}</div>
                  <div className="mt-1 text-[9px] text-slate-400">
                    {supplier.code || t("No code")} · {supplier.phone || t("No phone")} ·{" "}
                    {supplier.email || t("No email")}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500">
                  {supplier.notes || t("No internal notes")}
                </div>
                <div>
                  <div className="text-[9px] text-slate-400">{t("POs")}</div>
                  <div className="text-[12px] font-bold text-slate-700">{stats.poCount}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400">{t("Spend")}</div>
                  <div className="text-[12px] font-bold text-slate-700">{money(stats.spend)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400">{t("Last PO")}</div>
                  <div className="text-[10px] font-semibold text-slate-600">
                    {stats.lastPoAt ? new Date(stats.lastPoAt).toLocaleDateString() : "—"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div className="flex items-center gap-2 text-[14px] font-bold text-[#14203a]">
            <Building2 className="size-4" /> {t("Stores / Warehouses")}
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            {workspace?.locations.length ?? 0}
          </span>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspace && !workspace.locations.length && (
            <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">{lang === "ar" ? "أضف متجراً أو مستودعاً لاستخدامه في أوامر الشراء والاستلام." : "Add a store or warehouse to use for purchasing and receiving."}</p>
          )}
          {(workspace?.locations ?? []).map((location) => (
            <button
              key={location.id}
              disabled={saving || loading}
              onClick={() => editLocation(location)}
              className="rounded-xl border border-slate-200 p-4 text-start hover:border-indigo-200 hover:bg-indigo-50/30"
            >
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-bold text-slate-800">{location.name}</div>
                <span
                  className={`rounded-full px-2 py-1 text-[9px] font-bold ${location.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                >
                  {location.isActive ? t("Active") : t("Inactive")}
                </span>
              </div>
              <div className="mt-1 text-[10px] font-mono text-indigo-600">{location.code}</div>
              <div className="mt-2 text-[10px] text-slate-400">
                {location.address || t("No address")}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
