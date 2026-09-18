import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import BrandMark from "@/dashboard/components/brands/BrandMark";
import type { CatalogBrand } from "@/dashboard/mock/brands";

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
  const [menuId, setMenuId] = useState<string | null>(null);

  return (
    <div className="space-y-1.5">
      {brands.map((brand, index) => {
        const selected = brand.id === selectedId;
        return (
          <div
            key={brand.id}
            className={
              "relative rounded-2xl border transition " +
              (selected
                ? "border-indigo-200 bg-indigo-50/65 shadow-[0_6px_20px_rgba(89,104,234,.08)]"
                : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50/70")
            }
          >
            <button
              type="button"
              onClick={() => onSelect(brand)}
              className="flex w-full items-center gap-3 p-3 pe-12 text-start"
            >
              <BrandMark brand={brand} className="size-10" />
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[11.5px] font-black text-slate-700">
                    {brand.name}
                  </span>
                  {brand.featured && (
                    <span className="shrink-0 rounded-full bg-violet-50 px-1.5 py-0.5 text-[7.5px] font-black uppercase tracking-wide text-violet-700">
                      Featured
                    </span>
                  )}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-400">
                  <span className="max-w-[140px] truncate">/{brand.slug}</span>
                  <span>•</span>
                  <span>{getProductCount(brand)} products</span>
                  <span
                    className={
                      "rounded-full px-1.5 py-0.5 font-bold " +
                      (brand.active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500")
                    }
                  >
                    {brand.active ? "Active" : "Hidden"}
                  </span>
                </span>
              </span>
            </button>

            <div className="absolute end-2 top-1/2 -translate-y-1/2">
              {reorderMode ? (
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => onMove(brand.id, -1)}
                    aria-label={"Move " + brand.name + " up"}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-35"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === brands.length - 1}
                    onClick={() => onMove(brand.id, 1)}
                    aria-label={"Move " + brand.name + " down"}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-35"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    aria-label={"Actions for " + brand.name}
                    onClick={() => setMenuId((current) => (current === brand.id ? null : brand.id))}
                    className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-600"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                  {menuId === brand.id && (
                    <>
                      <button
                        aria-label="Close brand actions"
                        className="fixed inset-0 z-40 cursor-default"
                        onClick={() => setMenuId(null)}
                      />
                      <div className="absolute end-0 top-9 z-50 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                        {[
                          { label: "Edit", icon: Pencil, action: () => onEdit(brand) },
                          {
                            label: "View Products",
                            icon: Eye,
                            action: () => onViewProducts(brand),
                          },
                          {
                            label: "Add Product",
                            icon: Plus,
                            action: () => onAddProduct(brand),
                          },
                          {
                            label: brand.featured ? "Unfeature" : "Feature",
                            icon: Sparkles,
                            action: () => onToggleFeatured(brand),
                          },
                          {
                            label: brand.active ? "Hide" : "Show",
                            icon: brand.active ? EyeOff : Eye,
                            action: () => onToggleActive(brand),
                          },
                          {
                            label: "Duplicate",
                            icon: Copy,
                            action: () => onDuplicate(brand),
                          },
                        ].map(({ label, icon: Icon, action }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              setMenuId(null);
                              action();
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            <Icon className="size-3.5 text-slate-400" />
                            {label}
                          </button>
                        ))}
                        <div className="my-1 border-t border-slate-100" />
                        <button
                          type="button"
                          onClick={() => {
                            setMenuId(null);
                            onDelete(brand);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-[10px] font-semibold text-rose-600 transition hover:bg-rose-50"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
