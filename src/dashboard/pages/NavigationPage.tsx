import {
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  createDashboardNavigationItem,
  deleteDashboardNavigationItem,
  loadDashboardNavigationWorkspace,
  updateDashboardNavigationItem,
  type DashboardNavigationInput,
  type DashboardNavigationItem,
  type NavigationArea,
  type NavigationIconType,
} from "@/dashboard/data/navigation";

const EMPTY: DashboardNavigationInput = {
  area: "bottom",
  label: "",
  labelEn: "",
  labelAr: "",
  iconType: "lucide",
  iconValue: "House",
  href: "/",
  sortOrder: 10,
  isVisible: true,
};

const AREAS: NavigationArea[] = ["header", "bottom", "footer", "mobile_menu", "trust"];
const ICON_TYPES: NavigationIconType[] = ["lucide", "image", "svg", "none"];

export default function NavigationPage() {
  const [items, setItems] = useState<DashboardNavigationItem[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<"all" | NavigationArea>("all");
  const [editing, setEditing] = useState<DashboardNavigationItem | null>(null);
  const [draft, setDraft] = useState<DashboardNavigationInput>(EMPTY);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const workspace = await loadDashboardNavigationWorkspace();
      setItems(workspace.items);
      setCanDelete(workspace.role === "admin");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Navigation load failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesArea = area === "all" || item.area === area;
      const matchesQuery =
        !needle ||
        [item.label, item.labelEn, item.labelAr, item.href, item.iconValue]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      return matchesArea && matchesQuery;
    });
  }, [area, items, query]);

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...EMPTY, sortOrder: (items.length + 1) * 10 });
    setModalOpen(true);
  };

  const openEdit = (item: DashboardNavigationItem) => {
    setEditing(item);
    setDraft({
      area: item.area,
      label: item.label,
      labelEn: item.labelEn,
      labelAr: item.labelAr,
      iconType: item.iconType,
      iconValue: item.iconValue,
      href: item.href,
      sortOrder: item.sortOrder,
      isVisible: item.isVisible,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = editing
        ? await updateDashboardNavigationItem(editing.id, draft)
        : await createDashboardNavigationItem(draft);
      setItems((current) =>
        [...current.filter((item) => item.id !== saved.id), saved].sort(
          (a, b) => a.area.localeCompare(b.area) || a.sortOrder - b.sortOrder,
        ),
      );
      setModalOpen(false);
      toast.success(editing ? "Navigation item updated." : "Navigation item created.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Navigation save failed.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: DashboardNavigationItem) => {
    if (!canDelete) return toast.error("Only admins can delete navigation items.");
    if (!window.confirm(`Delete "${item.label}" from managed navigation?`)) return;
    try {
      await deleteDashboardNavigationItem(item.id);
      setItems((current) => current.filter((row) => row.id !== item.id));
      toast.success("Navigation item deleted.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Navigation delete failed.");
    }
  };

  const toggle = async (item: DashboardNavigationItem) => {
    const input: DashboardNavigationInput = {
      area: item.area,
      label: item.label,
      labelEn: item.labelEn,
      labelAr: item.labelAr,
      iconType: item.iconType,
      iconValue: item.iconValue,
      href: item.href,
      sortOrder: item.sortOrder,
      isVisible: !item.isVisible,
    };
    try {
      const saved = await updateDashboardNavigationItem(item.id, input);
      setItems((current) => current.map((row) => (row.id === saved.id ? saved : row)));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Visibility update failed.");
    }
  };

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-indigo-500">
            Store content / Live CMS
          </div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">Navigation</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Manage storefront Header, Bottom Nav, Footer, Mobile menu and Trust navigation from Supabase.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600">
            <RefreshCw className="size-3.5" /> Refresh
          </button>
          <button onClick={openCreate} className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white">
            <Plus className="size-4" /> Add item
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-5">
        {AREAS.map((value) => (
          <button
            key={value}
            onClick={() => setArea(area === value ? "all" : value)}
            className={`rounded-2xl border p-4 text-left transition ${
              area === value ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-slate-400">{value.replace("_", " ")}</div>
            <div className="mt-1 text-xl font-bold text-slate-800">
              {items.filter((item) => item.area === value).length}
            </div>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search navigation..."
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-[12px] outline-none focus:border-indigo-400"
            />
          </div>
          {area !== "all" ? (
            <button onClick={() => setArea("all")} className="text-[11px] font-bold text-indigo-600">
              Clear area filter
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="grid min-h-64 place-items-center"><Loader2 className="size-6 animate-spin text-indigo-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase tracking-[.1em] text-slate-400">
                  <th className="px-5 py-3">Label</th>
                  <th className="px-3 py-3">Area</th>
                  <th className="px-3 py-3">Arabic</th>
                  <th className="px-3 py-3">Icon</th>
                  <th className="px-3 py-3">URL</th>
                  <th className="px-3 py-3">Order</th>
                  <th className="px-3 py-3">Visible</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-4 text-[12px] font-bold text-slate-700">{item.labelEn || item.label}</td>
                    <td className="px-3 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{item.area}</span></td>
                    <td className="px-3 py-4 text-[12px] text-slate-500" dir="rtl">{item.labelAr || "—"}</td>
                    <td className="px-3 py-4 text-[11px] text-slate-500">{item.iconType}:{item.iconValue || "—"}</td>
                    <td className="max-w-[230px] truncate px-3 py-4 text-[11px] text-slate-500">{item.href || "—"}</td>
                    <td className="px-3 py-4 text-[11px] font-bold text-slate-600">{item.sortOrder}</td>
                    <td className="px-3 py-4">
                      <button onClick={() => void toggle(item)} className={`grid size-8 place-items-center rounded-lg ${
                        item.isVisible ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                      }`}>
                        {item.isVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(item)} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-50"><Pencil className="size-3.5" /></button>
                        {canDelete ? <button onClick={() => void remove(item)} className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="size-3.5" /></button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length ? <div className="p-12 text-center text-sm text-slate-400">No navigation items match this filter.</div> : null}
          </div>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/40 p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-slate-800">{editing ? "Edit navigation item" : "Add navigation item"}</div>
                <div className="mt-1 text-[11px] text-slate-400">Changes are served to the storefront through public-cms.</div>
              </div>
              <button onClick={() => setModalOpen(false)} className="grid size-8 place-items-center rounded-lg text-slate-400"><X className="size-4" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Area</span><select value={draft.area} onChange={(e) => setDraft((d) => ({...d,area:e.target.value as NavigationArea}))} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]">{AREAS.map((v)=><option key={v} value={v}>{v}</option>)}</select></label>
              <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Sort order</span><input type="number" value={draft.sortOrder} onChange={(e)=>setDraft((d)=>({...d,sortOrder:Number(e.target.value)||0}))} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]" /></label>
              <Field label="Primary label" value={draft.label} onChange={(value)=>setDraft((d)=>({...d,label:value}))} />
              <Field label="English label" value={draft.labelEn} onChange={(value)=>setDraft((d)=>({...d,labelEn:value}))} />
              <Field label="Arabic label" value={draft.labelAr} onChange={(value)=>setDraft((d)=>({...d,labelAr:value}))} dir="rtl" />
              <Field label="URL / path" value={draft.href} onChange={(value)=>setDraft((d)=>({...d,href:value}))} dir="ltr" />
              <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Icon type</span><select value={draft.iconType} onChange={(e)=>setDraft((d)=>({...d,iconType:e.target.value as NavigationIconType}))} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]">{ICON_TYPES.map((v)=><option key={v} value={v}>{v}</option>)}</select></label>
              <Field label="Icon value" value={draft.iconValue} onChange={(value)=>setDraft((d)=>({...d,iconValue:value}))} placeholder="House / image URL" />
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-[11px] font-semibold text-slate-600 sm:col-span-2"><input type="checkbox" checked={draft.isVisible} onChange={(e)=>setDraft((d)=>({...d,isVisible:e.target.checked}))} /> Visible on storefront</label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setModalOpen(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-bold text-slate-600">Cancel</button>
              <button onClick={()=>void save()} disabled={saving} className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white disabled:opacity-50">{saving?<Loader2 className="size-4 animate-spin" />:null} Save</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({label,value,onChange,dir,placeholder}:{label:string;value:string;onChange:(value:string)=>void;dir?:"ltr"|"rtl";placeholder?:string}) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}</span><input value={value} dir={dir} placeholder={placeholder} onChange={(e)=>onChange(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400" /></label>;
}
