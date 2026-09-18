import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Loader2,
  Package,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  deleteDashboardCollection,
  getDashboardCollection,
  saveDashboardCollectionProducts,
  updateDashboardCollection,
  type DashboardCollectionDetail,
  type DashboardCollectionProduct,
} from "@/dashboard/data/collections";

export default function CollectionDetailPage({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const [collection, setCollection] = useState<DashboardCollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [form, setForm] = useState({
    title: "",
    handle: "",
    titleAr: "",
    description: "",
    imageUrl: "",
    isActive: true,
    isFeatured: false,
    seoTitle: "",
    seoDescription: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getDashboardCollection(id);
      setCollection(next);
      if (next) setForm({
        title: next.title,
        handle: next.handle,
        titleAr: next.titleAr,
        description: next.description,
        imageUrl: next.imageUrl,
        isActive: next.isActive,
        isFeatured: next.isFeatured,
        seoTitle: next.seoTitle,
        seoDescription: next.seoDescription,
      });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to load collection.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const dirty = useMemo(() => {
    if (!collection) return false;
    return (
      form.title !== collection.title ||
      form.handle !== collection.handle ||
      form.titleAr !== collection.titleAr ||
      form.description !== collection.description ||
      form.imageUrl !== collection.imageUrl ||
      form.isActive !== collection.isActive ||
      form.isFeatured !== collection.isFeatured ||
      form.seoTitle !== collection.seoTitle ||
      form.seoDescription !== collection.seoDescription
    );
  }, [collection, form]);

  const saveProfile = async () => {
    if (!collection || form.title.trim().length < 2 || !form.handle.trim()) return;
    setSaving(true);
    try {
      const next = await updateDashboardCollection(collection.id, form);
      setCollection(next);
      toast.success("Collection saved.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const saveProducts = async (products: DashboardCollectionProduct[]) => {
    if (!collection) return;
    setSaving(true);
    try {
      const next = await saveDashboardCollectionProducts(collection.id, products.map((product) => product.id));
      setCollection(next);
      toast.success("Collection products saved.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Products update failed.");
      void load();
    } finally {
      setSaving(false);
    }
  };

  const addProduct = (product: DashboardCollectionProduct) => {
    if (!collection) return;
    void saveProducts([...collection.products, { ...product, sortOrder: collection.products.length }]);
  };

  const removeProduct = (productId: string) => {
    if (!collection) return;
    void saveProducts(collection.products.filter((product) => product.id !== productId));
  };

  const moveProduct = (productId: string, direction: -1 | 1) => {
    if (!collection) return;
    const next = [...collection.products];
    const index = next.findIndex((product) => product.id === productId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void saveProducts(next);
  };

  const available = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!collection) return [];
    return collection.availableProducts.filter((product) => !term || product.title.toLowerCase().includes(term)).slice(0, 40);
  }, [collection, productSearch]);

  const removeCollection = async () => {
    if (!collection || !window.confirm(`Delete "${collection.title}"? Products remain in the catalog.`)) return;
    try {
      await deleteDashboardCollection(collection.id);
      toast.success("Collection deleted.");
      navigate("/dashboard/collections");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Delete failed.");
    }
  };

  if (loading && !collection) return <div className="grid min-h-[420px] place-items-center"><Loader2 className="size-6 animate-spin text-[#5968ea]" /></div>;
  if (!collection) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Collection not found.</div>;

  return (
    <div>
      <button onClick={() => navigate("/dashboard/collections")} className="mb-6 flex items-center gap-2 text-[12px] font-semibold text-slate-500 hover:text-[#5968ea]"><ArrowLeft className="size-4" /> Back to collections</button>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">Collection / {collection.handle}</div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">{collection.title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{collection.products.length} products · {collection.isActive ? "Active" : "Draft"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void removeCollection()} className="flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-[11px] font-bold text-rose-600"><Trash2 className="size-3.5" /> Delete</button>
          <button onClick={() => void saveProfile()} disabled={!dirty || saving} className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white disabled:opacity-40"><Save className="size-3.5" /> Save</button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4"><div className="text-[13px] font-bold text-[#14203a]">Collection details</div></div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {[
                ["Title", "title"],
                ["Handle", "handle"],
                ["Arabic title", "titleAr"],
                ["Image URL", "imageUrl"],
                ["SEO title", "seoTitle"],
                ["SEO description", "seoDescription"],
              ].map(([label, key]) => (
                <label key={key} className={key === "imageUrl" || key === "seoDescription" ? "sm:col-span-2" : ""}>
                  <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}</span>
                  <input value={form[key as keyof typeof form] as string} onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400" />
                </label>
              ))}
              <label className="sm:col-span-2"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Description</span><textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} className="min-h-28 w-full rounded-xl border border-slate-200 p-3 text-[12px]" /></label>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((current) => ({ ...current, isActive: e.target.checked }))} /> Active</label>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((current) => ({ ...current, isFeatured: e.target.checked }))} /> Featured</label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="text-[13px] font-bold text-[#14203a]">Products in collection</div>
              <div className="mt-0.5 text-[11px] text-slate-400">Order here controls storefront order.</div>
            </div>
            {collection.products.length ? (
              <div className="divide-y divide-slate-100">
                {collection.products.map((product, index) => (
                  <div key={product.id} className="grid grid-cols-[52px_1fr_auto] items-center gap-3 px-5 py-3">
                    <div className="grid size-12 place-items-center overflow-hidden rounded-xl bg-slate-100">{product.imageUrl ? <img src={product.imageUrl} alt="" className="size-full object-contain p-1" /> : <Package className="size-4 text-slate-400" />}</div>
                    <div className="min-w-0"><div className="truncate text-[12px] font-bold text-slate-700">{product.title}</div><div className="mt-1 text-[10px] text-slate-400">{product.status} · Stock {product.stockQuantity} · #{index + 1}</div></div>
                    <div className="flex gap-1">
                      <button onClick={() => moveProduct(product.id, -1)} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500"><ArrowUp className="size-3.5" /></button>
                      <button onClick={() => moveProduct(product.id, 1)} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500"><ArrowDown className="size-3.5" /></button>
                      <button onClick={() => removeProduct(product.id)} className="grid size-8 place-items-center rounded-lg border border-rose-100 text-rose-500"><Trash2 className="size-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="px-5 py-10 text-center text-[11px] text-slate-400">No products in this collection.</div>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4"><div className="text-[13px] font-bold text-[#14203a]">Add products</div></div>
            <div className="p-4">
              <div className="relative mb-3"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search catalog products" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-[11px]" /></div>
              <div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto">
                {available.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 py-3">
                    <div className="grid size-10 place-items-center overflow-hidden rounded-lg bg-slate-100">{product.imageUrl ? <img src={product.imageUrl} alt="" className="size-full object-contain p-1" /> : <Package className="size-4 text-slate-400" />}</div>
                    <div className="min-w-0 flex-1"><div className="truncate text-[11px] font-bold text-slate-700">{product.title}</div><div className="mt-0.5 text-[9px] text-slate-400">{product.status} · {product.stockQuantity} stock</div></div>
                    <button onClick={() => addProduct(product)} disabled={saving} className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 disabled:opacity-40"><Plus className="size-4" /></button>
                  </div>
                ))}
                {!available.length ? <div className="py-10 text-center text-[11px] text-slate-400">No available products match.</div> : null}
              </div>
            </div>
          </div>

          {collection.imageUrl ? <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-3 text-[11px] font-bold text-slate-600">Collection image preview</div><div className="grid aspect-[16/9] place-items-center overflow-hidden rounded-xl bg-slate-50"><img src={collection.imageUrl} alt="" className="max-h-full max-w-full object-contain" /></div></div> : null}
        </div>
      </div>

      {dirty ? <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl"><span className="text-[11px] font-semibold text-slate-600">Unsaved collection changes</span><button onClick={() => void saveProfile()} className="rounded-lg bg-[#5968ea] px-3 py-1.5 text-[10px] font-bold text-white">Save</button></div> : null}
    </div>
  );
}
