import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Sparkles,
} from "lucide-react";
import CatalogRowActions from "@/dashboard/components/CatalogRowActions";
import BrandMark from "@/dashboard/components/brands/BrandMark";
import type { CatalogBrand } from "@/dashboard/data/brands";

export default function BrandList({
  brands,
  selectedId,
  getProductCount,
  reorderMode,
  onSelect,
  onEdit,
  onViewProducts,
  onAddProduct,
  onToggleFeatured,
  onToggleActive,
  onDuplicate,
  onDelete,
  onMove,
}: {
  brands: CatalogBrand[];
  selectedId: string;
  getProductCount: (brand: CatalogBrand) => number;
  reorderMode: boolean;
  onSelect: (brand: CatalogBrand) => void;
  onEdit: (brand: CatalogBrand) => void;
  onViewProducts: (brand: CatalogBrand) => void;
  onAddProduct: (brand: CatalogBrand) => void;
  onToggleFeatured: (brand: CatalogBrand) => void;
  onToggleActive: (brand: CatalogBrand) => void;
  onDuplicate: (brand: CatalogBrand) => void;
  onDelete: (brand: CatalogBrand) => void;
  onMove: (brandId: string, direction: -1 | 1) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {brands.map((brand, index) => {
        const selected = brand.id === selectedId;
        return (
          <div
            key={brand.id}
            className={
              "relative min-w-0 rounded-2xl border transition " +
              (selected
                ? "border-indigo-200 bg-indigo-50/65 shadow-[0_6px_20px_rgba(89,104,234,.08)]"
                : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50/70")
            }
          >
            <button
              type="button"
              onClick={() => onSelect(brand)}
              aria-pressed={selected}
              className={`flex min-h-[112px] w-full flex-col items-start justify-between gap-3 px-3 py-3 text-start transition active:scale-[.99] ${reorderMode ? "pb-14" : "pe-12"}`}
            >
              <span className="flex w-full min-w-0 items-center gap-2.5">
                <BrandMark brand={brand} className="size-10 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[11.5px] font-black text-slate-700">
                      {brand.name}
                    </span>
                    {brand.featured && (
                      <span className="shrink-0 rounded-full bg-violet-50 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide text-violet-700">
                        Featured
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-[8.5px] text-slate-400">/{brand.slug}</span>
                </span>
              </span>

              <span className="flex w-full flex-wrap items-center gap-1.5 text-[9px] text-slate-400">
                <span className="rounded-full bg-slate-50 px-2 py-1 font-semibold text-slate-500">
                  {getProductCount(brand)} products
                </span>
                <span
                  className={
                    "rounded-full px-2 py-1 font-bold " +
                    (brand.active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500")
                  }
                >
                  {brand.active ? "Active" : "Hidden"}
                </span>
              </span>
            </button>

            <div className={reorderMode ? "absolute inset-x-2 bottom-2" : "absolute end-2 top-2"}>
              {reorderMode ? (
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => onMove(brand.id, -1)}
                    aria-label={"Move " + brand.name + " up"}
                    className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-35"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === brands.length - 1}
                    onClick={() => onMove(brand.id, 1)}
                    aria-label={"Move " + brand.name + " down"}
                    className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-35"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
              ) : (
                <CatalogRowActions
                  entityName={brand.name}
                  entityType="Brand"
                  actions={[
                    { label: "Edit", icon: Pencil, onClick: () => onEdit(brand) },
                    { label: "View Products", icon: Eye, onClick: () => onViewProducts(brand) },
                    { label: "Assign Products", icon: Plus, onClick: () => onAddProduct(brand) },
                    {
                      label: brand.featured ? "Unfeature" : "Feature",
                      icon: Sparkles,
                      onClick: () => onToggleFeatured(brand),
                    },
                    {
                      label: brand.active ? "Hide" : "Show",
                      icon: brand.active ? EyeOff : Eye,
                      onClick: () => onToggleActive(brand),
                    },
                    { label: "Duplicate", icon: Copy, onClick: () => onDuplicate(brand) },
                  ]}
                  onDelete={() => onDelete(brand)}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
