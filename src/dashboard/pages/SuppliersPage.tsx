import { Building2, Loader2, MapPin, Plus, Search, Save, Truck, X } from "lucide-react";
import { useCallback, useMemo, useState, useEffect } from "react";
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
  const [workspace, setWorkspace] = useState<ReceivingWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [supplierDraft, setSupplierDraft] = useState<SupplierDraft | null>(null);
  const [locationDraft, setLocationDraft] = useState<LocationDraft | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setWorkspace(await loadReceivingWorkspace());
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to load suppliers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const supplierStats = useMemo(() => {
    const result = new Map<string, { poCount: number; spend: number; lastPoAt: string | null }>();
    for (const po of workspace?.purchaseOrders ?? []) {
      const current = result.get(po.supplierId) ?? { poCount: 0, spend: 0, lastPoAt: null };
      current.poCount += 1;
      if (!["cancelled", "rejected"].includes(po.status)) current.spend += po.grandTotal;
      if (!current.lastPoAt || new Date(po.createdAt) > new Date(current.lastPoAt)) current.lastPoAt = po.createdAt;
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
    setSupplierDraft({
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
    if (!supplierDraft) return;
    if (!supplierDraft.name.trim()) return toast.error("Supplier name is required.");
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
        toast.success("Supplier updated.");
      } else {
        await createReceivingSupplier({
          name: supplierDraft.name,
          code: supplierDraft.code,
          phone: supplierDraft.phone,
          email: supplierDraft.email,
          notes: supplierDraft.notes,
        });
        toast.success("Supplier created.");
      }
      setSupplierDraft(null);
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Saving supplier failed.");
    } finally {
      setSaving(false);
    }
  };

  const editLocation = (location: ProcurementLocation) => {
    setLocationDraft({
      id: location.id,
      name: location.name,
      code: location.code,
      address: location.address ?? "",
      isActive: location.isActive,
    });
  };

  const saveLocation = async () => {
    if (!locationDraft) return;
    setSaving(true);
    try {
      await saveProcurementLocation({
        id: locationDraft.id,
        name: locationDraft.name,
        code: locationDraft.code,
        address: locationDraft.address,
        isActive: locationDraft.isActive,
      });
      toast.success(locationDraft.id ? "Location updated." : "Location created.");
      setLocationDraft(null);
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Saving location failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !workspace) {
    return <div className="grid min-h-[440px] place-items-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="size-6 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-indigo-600">Commerce / Procurement</div>
          <h1 className="mt-2 text-[30px] font-bold tracking-[-.05em] text-[#14203a]">Suppliers & Locations</h1>
          <p className="mt-1 text-sm text-slate-500">Manage supplier contacts, purchasing history and receiving destinations.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setLocationDraft({ ...blankLocation })} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-700"><MapPin className="size-3.5" /> New location</button>
          <button onClick={() => setSupplierDraft({ ...blankSupplier })} className="flex h-10 items-center gap-2 rounded-xl bg-[#14203a] px-4 text-[11px] font-bold text-white"><Plus className="size-3.5" /> New supplier</button>
        </div>
      </div>

      {supplierDraft ? (
        <div className="mb-5 rounded-2xl border border-indigo-100 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.05)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[14px] font-bold text-[#14203a]">{supplierDraft.id ? "Edit supplier" : "New supplier"}</div>
            <button onClick={() => setSupplierDraft(null)} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100"><X className="size-4 text-slate-500" /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input value={supplierDraft.name} onChange={(e) => setSupplierDraft({ ...supplierDraft, name: e.target.value })} placeholder="Supplier name" className="h-10 rounded-xl border border-slate-200 px-3 text-[12px]" />
            <input value={supplierDraft.code} onChange={(e) => setSupplierDraft({ ...supplierDraft, code: e.target.value })} placeholder="Code" className="h-10 rounded-xl border border-slate-200 px-3 text-[12px]" />
            <input value={supplierDraft.phone} onChange={(e) => setSupplierDraft({ ...supplierDraft, phone: e.target.value })} placeholder="Phone" className="h-10 rounded-xl border border-slate-200 px-3 text-[12px]" />
            <input value={supplierDraft.email} onChange={(e) => setSupplierDraft({ ...supplierDraft, email: e.target.value })} placeholder="Email" className="h-10 rounded-xl border border-slate-200 px-3 text-[12px]" />
            <input value={supplierDraft.notes} onChange={(e) => setSupplierDraft({ ...supplierDraft, notes: e.target.value })} placeholder="Internal notes" className="h-10 rounded-xl border border-slate-200 px-3 text-[12px] md:col-span-2 xl:col-span-3" />
            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[11px] text-slate-600">
              <input type="checkbox" checked={supplierDraft.isActive} onChange={(e) => setSupplierDraft({ ...supplierDraft, isActive: e.target.checked })} />
              Active supplier
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={() => void saveSupplier()} disabled={saving} className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-5 text-[11px] font-bold text-white disabled:opacity-50"><Save className="size-3.5" /> Save supplier</button>
          </div>
        </div>
      ) : null}

      {locationDraft ? (
        <div className="mb-5 rounded-2xl border border-indigo-100 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[14px] font-bold text-[#14203a]">{locationDraft.id ? "Edit location" : "New store / warehouse"}</div>
            <button onClick={() => setLocationDraft(null)}><X className="size-4 text-slate-500" /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <input value={locationDraft.name} onChange={(e) => setLocationDraft({ ...locationDraft, name: e.target.value })} placeholder="Location name" className="h-10 rounded-xl border border-slate-200 px-3 text-[12px]" />
            <input value={locationDraft.code} onChange={(e) => setLocationDraft({ ...locationDraft, code: e.target.value })} placeholder="Code" className="h-10 rounded-xl border border-slate-200 px-3 text-[12px]" />
            <input value={locationDraft.address} onChange={(e) => setLocationDraft({ ...locationDraft, address: e.target.value })} placeholder="Address" className="h-10 rounded-xl border border-slate-200 px-3 text-[12px]" />
            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[11px] text-slate-600"><input type="checkbox" checked={locationDraft.isActive} onChange={(e) => setLocationDraft({ ...locationDraft, isActive: e.target.checked })} /> Active</label>
          </div>
          <div className="mt-4 flex justify-end"><button onClick={() => void saveLocation()} disabled={saving} className="rounded-xl bg-[#5968ea] px-5 py-2.5 text-[11px] font-bold text-white">Save location</button></div>
        </div>
      ) : null}

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search suppliers by name, code, phone or email" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-[11px]" />
        </div>
      </div>

      <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div className="flex items-center gap-2 text-[14px] font-bold text-[#14203a]"><Truck className="size-4" /> Suppliers</div>
          <span className="text-[10px] font-bold text-slate-400">{filteredSuppliers.length}</span>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredSuppliers.map((supplier) => {
            const stats = supplierStats.get(supplier.id) ?? { poCount: 0, spend: 0, lastPoAt: null };
            return (
              <button key={supplier.id} onClick={() => editSupplier(supplier)} className="grid w-full gap-3 p-4 text-left transition hover:bg-slate-50 md:grid-cols-[1.2fr_1fr_repeat(3,.65fr)] md:items-center">
                <div>
                  <div className="text-[12px] font-bold text-slate-800">{supplier.name}</div>
                  <div className="mt-1 text-[9px] text-slate-400">{supplier.code || "No code"} · {supplier.phone || "No phone"} · {supplier.email || "No email"}</div>
                </div>
                <div className="text-[10px] text-slate-500">{supplier.notes || "No internal notes"}</div>
                <div><div className="text-[9px] text-slate-400">POs</div><div className="text-[12px] font-bold text-slate-700">{stats.poCount}</div></div>
                <div><div className="text-[9px] text-slate-400">Spend</div><div className="text-[12px] font-bold text-slate-700">{money(stats.spend)}</div></div>
                <div><div className="text-[9px] text-slate-400">Last PO</div><div className="text-[10px] font-semibold text-slate-600">{stats.lastPoAt ? new Date(stats.lastPoAt).toLocaleDateString() : "—"}</div></div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div className="flex items-center gap-2 text-[14px] font-bold text-[#14203a]"><Building2 className="size-4" /> Stores / Warehouses</div>
          <span className="text-[10px] font-bold text-slate-400">{workspace?.locations.length ?? 0}</span>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {(workspace?.locations ?? []).map((location) => (
            <button key={location.id} onClick={() => editLocation(location)} className="rounded-xl border border-slate-200 p-4 text-left hover:border-indigo-200 hover:bg-indigo-50/30">
              <div className="flex items-center justify-between"><div className="text-[12px] font-bold text-slate-800">{location.name}</div><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${location.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{location.isActive ? "Active" : "Inactive"}</span></div>
              <div className="mt-1 text-[10px] font-mono text-indigo-600">{location.code}</div>
              <div className="mt-2 text-[10px] text-slate-400">{location.address || "No address"}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
