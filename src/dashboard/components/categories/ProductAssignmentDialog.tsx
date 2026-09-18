import { Check, ChevronDown, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { productBelongsToCategory, type CatalogCategory } from "@/dashboard/data/categories";
import type { DashboardProduct } from "@/dashboard/data/catalog";

export default function ProductAssignmentDialog({
  category,
  products,
  onClose,
  onAssign,
}: {
  category: CatalogCategory;
  products: DashboardProduct[];
  onClose: () => void;
  onAssign: (productIds: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const brands = useMemo(
    () => Array.from(new Set(products.map((product) => product.brand))).sort(),
    [products],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !needle ||
        (product.name + " " + product.sku + " " + product.brand).toLowerCase().includes(needle);
      const matchesBrand = brand === "all" || product.brand === brand;
      return matchesSearch && matchesBrand;
    });
  }, [products, query, brand]);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = () => {
    if (!selected.size) {
      toast.error("Select at least one product to assign.");
      return;
    }
    onAssign(Array.from(selected));
  };

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-end bg-slate-950/45 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6a70e7]">
              Product assignment
            </div>
            <h2 className="mt-1 text-[19px] font-black tracking-[-.03em] text-[#14203a]">
              Assign Products
            </h2>
            <p className="mt-1 text-[10px] text-slate-400">
              Selected products will move to <b>{category.name}</b> by updating their Supabase category assignment.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assignment dialog"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-[1fr_180px] sm:px-6 sm:py-4">
          <label className="relative">
            <span className="sr-only">Search products</span>
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product name or SKU"
              className="h-10 w-full rounded-xl border border-slate-200 ps-9 pe-3 text-[11px] outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="relative">
            <span className="sr-only">Filter by brand</span>
            <select
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white ps-3 pe-8 text-[10px] font-semibold text-slate-600 outline-none"
            >
              <option value="all">All Brands</option>
              {brands.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:px-6">
          {filtered.length ? (
            <div className="space-y-2">
              {filtered.map((product) => {
                const alreadyAssigned = productBelongsToCategory(product, category);
                const checked = selected.has(product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggle(product.id)}
                    className={
                      "flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition " +
                      (checked
                        ? "border-indigo-300 bg-indigo-50/70"
                        : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50")
                    }
                  >
                    <span
                      className={
                        "grid size-5 shrink-0 place-items-center rounded-md border " +
                        (checked
                          ? "border-[#5968ea] bg-[#5968ea] text-white"
                          : "border-slate-300 bg-white text-transparent")
                      }
                    >
                      <Check className="size-3" />
                    </span>
                    <img
                      src={product.image}
                      alt=""
                      className="size-11 shrink-0 rounded-xl bg-slate-100 object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-bold text-slate-700">
                        {product.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[9px] text-slate-400">
                        {product.brand} · {product.sku}
                      </span>
                    </span>
                    <span className="shrink-0 text-end">
                      {alreadyAssigned && (
                        <span className="block rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-700">
                          Current
                        </span>
                      )}
                      <span className="mt-1 block text-[8px] text-slate-400">
                        {product.category}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <div>
                <div className="text-[12px] font-bold text-slate-600">
                  {products.length
                    ? "No products match these filters"
                    : "No products available to assign"}
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  {products.length
                    ? "Try another product name, SKU, or brand."
                    : "Create a product first, then return here to assign it."}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="text-[10px] text-slate-400">
            <b className="text-slate-600">{selected.size}</b> selected
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              className="h-10 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(89,104,234,.22)]"
            >
              Assign Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
