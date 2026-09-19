import {
  Archive,
  Copy,
  Filter,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

import {
  listDashboardBrands,
  listDashboardCategories,
  listDashboardProducts,
  type DashboardProduct,
} from "@/dashboard/data/catalog";
import {
  duplicateDashboardProduct,
  setDashboardProductsStatus,
} from "@/dashboard/data/productManagement";

type StatusFilter = "All" | "Active" | "Draft" | "Archived";
type StockFilter = "all" | "low" | "out" | "available";
type SortMode = "updated" | "name" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc";

function money(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusPill({ status }: { status: DashboardProduct["status"] }) {
  const tone =
    status === "Active"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Draft"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${tone}`}>{status}</span>;
}

export default function ProductsPage() {
  const [, navigate] = useLocation();
  const [catalog, setCatalog] = useState<DashboardProduct[]>([]);
  const [brands, setBrands] = useState<Awaited<ReturnType<typeof listDashboardBrands>>>([]);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof listDashboardCategories>>>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stock, setStock] = useState<StockFilter>("all");
  const [sort, setSort] = useState<SortMode>("updated");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [products, brandRows, categoryRows] = await Promise.all([
        listDashboardProducts(),
        listDashboardBrands(),
        listDashboardCategories(),
      ]);
      setCatalog(products);
      setBrands(brandRows);
      setCategories(categoryRows);
      setSelected((current) => new Set([...current].filter((id) => products.some((p) => p.id === id))));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = catalog.filter((product) => {
      if (
        needle &&
        !`${product.name} ${product.brand} ${product.sku} ${product.barcode} ${product.handle} ${product.category}`
          .toLowerCase()
          .includes(needle)
      ) return false;
      if (status !== "All" && product.status !== status) return false;
      if (brandId && product.brandId !== brandId) return false;
      if (categoryId && product.categoryId !== categoryId) return false;
      if (stock === "out" && product.stock !== 0) return false;
      if (stock === "low" && !(product.stock > 0 && product.stock < 10)) return false;
      if (stock === "available" && product.stock <= 0) return false;
      return true;
    });

    return rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "stock-asc") return a.stock - b.stock;
      if (sort === "stock-desc") return b.stock - a.stock;
      return 0;
    });
  }, [brandId, catalog, categoryId, search, sort, status, stock]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((product) => selected.has(product.id));

  const toggleAll = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allFilteredSelected) filtered.forEach((product) => next.delete(product.id));
      else filtered.forEach((product) => next.add(product.id));
      return next;
    });
  };

  const bulkStatus = async (nextStatus: "Active" | "Draft" | "Archived") => {
    const ids = [...selected];
    if (!ids.length || working) return;
    setWorking(true);
    try {
      const count = await setDashboardProductsStatus(ids, nextStatus);
      toast.success(`${count} product${count === 1 ? "" : "s"} moved to ${nextStatus}.`);
      setSelected(new Set());
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Bulk product update failed.");
    } finally {
      setWorking(false);
    }
  };

  const duplicate = async (product: DashboardProduct) => {
    if (working) return;
    setWorking(true);
    try {
      const newId = await duplicateDashboardProduct(product.id);
      toast.success("Draft copy created with zero stock and fresh identifiers.");
      navigate(`/dashboard/products/${newId}`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Product duplicate failed.");
    } finally {
      setWorking(false);
    }
  };

  const active = catalog.filter((product) => product.status === "Active").length;
  const drafts = catalog.filter((product) => product.status === "Draft").length;
  const archived = catalog.filter((product) => product.status === "Archived").length;
  const lowStock = catalog.filter((product) => product.stock > 0 && product.stock < 10).length;

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-indigo-500">
            Commerce / Product management
          </div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">Products</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Manage live products, variants, stock state and merchandising without leaving the Space Call dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void load()}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
          <button
            onClick={() => navigate("/dashboard/products/new")}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(89,104,234,.22)]"
          >
            <Plus className="size-4" /> Add product
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Total", catalog.length, "text-[#14203a]"],
          ["Active", active, "text-emerald-600"],
          ["Draft", drafts, "text-amber-600"],
          ["Archived", archived, "text-slate-500"],
          ["Low stock", lowStock, "text-rose-600"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-[10px] font-semibold text-slate-400">{label}</div>
            <div className={`mt-1 text-xl font-bold ${tone}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(5,minmax(130px,auto))]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Product, brand, SKU, barcode or handle"
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-[12px] outline-none focus:border-indigo-400"
            />
          </div>
          <Select value={status} onChange={(value) => setStatus(value as StatusFilter)}>
            <option>All</option><option>Active</option><option>Draft</option><option>Archived</option>
          </Select>
          <Select value={brandId} onChange={setBrandId}>
            <option value="">All brands</option>
            {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </Select>
          <Select value={categoryId} onChange={setCategoryId}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
          <Select value={stock} onChange={(value) => setStock(value as StockFilter)}>
            <option value="all">All stock</option><option value="available">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option>
          </Select>
          <Select value={sort} onChange={(value) => setSort(value as SortMode)}>
            <option value="updated">Recently updated</option><option value="name">Name A–Z</option><option value="price-asc">Price ↑</option><option value="price-desc">Price ↓</option><option value="stock-asc">Stock ↑</option><option value="stock-desc">Stock ↓</option>
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
            <Filter className="size-3.5" /> {filtered.length} shown · {selected.size} selected
          </div>
          {selected.size ? (
            <div className="flex flex-wrap gap-2">
              <BulkButton disabled={working} onClick={() => void bulkStatus("Active")}>Activate</BulkButton>
              <BulkButton disabled={working} onClick={() => void bulkStatus("Draft")}>Move to draft</BulkButton>
              <BulkButton disabled={working} onClick={() => void bulkStatus("Archived")}><Archive className="size-3.5" /> Archive</BulkButton>
            </div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="size-6 animate-spin text-indigo-500" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm font-semibold text-rose-700">{error}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-[#fafbfe]">
                <tr className="border-y border-slate-100 text-[10px] uppercase tracking-[.1em] text-slate-400">
                  <th className="px-4 py-3"><input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} /></th>
                  <th className="px-3 py-3">Product</th><th className="px-3 py-3">SKU</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Variants</th><th className="px-3 py-3">Price</th><th className="px-3 py-3">Stock</th><th className="px-3 py-3">Status</th><th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-b border-slate-50 hover:bg-[#fafbff]">
                    <td className="px-4 py-3.5"><input type="checkbox" checked={selected.has(product.id)} onChange={() => setSelected((current) => { const next=new Set(current); next.has(product.id)?next.delete(product.id):next.add(product.id); return next; })} /></td>
                    <td className="px-3 py-3.5">
                      <button onClick={() => navigate(`/dashboard/products/${product.id}`)} className="flex max-w-[280px] items-center gap-3 text-left">
                        <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
                          {product.image ? <img src={product.image} alt="" className="size-full object-contain" /> : <Package className="size-4 text-slate-400" />}
                        </div>
                        <div className="min-w-0"><div className="truncate text-[12px] font-bold text-slate-700">{product.name}</div><div className="mt-0.5 truncate text-[10px] text-slate-400">{product.brand || "No brand"} · {product.handle}</div></div>
                      </button>
                    </td>
                    <td className="px-3 py-3.5 font-mono text-[10px] text-slate-500">{product.sku || "—"}</td>
                    <td className="px-3 py-3.5 text-[11px] text-slate-500">{product.category || "—"}</td>
                    <td className="px-3 py-3.5 text-[11px] font-bold text-slate-600">{product.variantCount}</td>
                    <td className="px-3 py-3.5 text-[11px] font-bold text-slate-700">{money(product.price)}</td>
                    <td className={`px-3 py-3.5 text-[11px] font-bold ${product.stock === 0 ? "text-rose-600" : product.stock < 10 ? "text-amber-600" : "text-slate-700"}`}>{product.stock}</td>
                    <td className="px-3 py-3.5"><StatusPill status={product.status} /></td>
                    <td className="px-4 py-3.5"><div className="flex justify-end gap-1"><button onClick={() => void duplicate(product)} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" title="Duplicate"><Copy className="size-3.5" /></button><button onClick={() => navigate(`/dashboard/products/${product.id}`)} className="grid size-8 place-items-center rounded-lg text-indigo-600 hover:bg-indigo-50" title="Edit"><Pencil className="size-3.5" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 md:hidden">
            <div className="flex items-center justify-between px-4 py-3 text-[10px] text-slate-400">
              <label className="flex items-center gap-2"><input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} /> Select visible</label>
              <span>{filtered.length} products</span>
            </div>
            {filtered.map((product) => (
              <div key={product.id} className="p-4">
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={selected.has(product.id)} onChange={() => setSelected((current) => { const next=new Set(current); next.has(product.id)?next.delete(product.id):next.add(product.id); return next; })} className="mt-4" />
                  <button onClick={() => navigate(`/dashboard/products/${product.id}`)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">{product.image ? <img src={product.image} alt="" className="size-full object-contain" /> : <Package className="size-5 text-slate-400" />}</div>
                    <div className="min-w-0 flex-1"><div className="truncate text-[12px] font-bold text-slate-700">{product.name}</div><div className="mt-1 truncate text-[10px] text-slate-400">{product.brand || "No brand"} · {product.category || "Uncategorized"}</div><div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]"><StatusPill status={product.status} /><span className="font-bold text-slate-700">{money(product.price)}</span><span className={product.stock < 10 ? "font-bold text-rose-600" : "text-slate-500"}>{product.stock} stock</span><span className="text-slate-400">{product.variantCount} variants</span></div></div>
                  </button>
                  <button onClick={() => void duplicate(product)} className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500"><Copy className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
          {!filtered.length ? <div className="p-10 text-center text-sm text-slate-400">No products match the current filters.</div> : null}
        </div>
      )}
    </div>
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 outline-none focus:border-indigo-400">{children}</select>;
}

function BulkButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 disabled:opacity-50">{children}</button>;
}
