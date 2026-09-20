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
import { CategoryGlyph } from "@/components/CategoryGlyph";
import CatalogRowActions from "@/dashboard/components/CatalogRowActions";
import type { CatalogCategory } from "@/dashboard/data/categories";

type CategoryActionProps = {
  category: CatalogCategory;
  selected: boolean;
  productCount: number;
  reorderMode: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onViewProducts: () => void;
  onAddProduct: () => void;
  onToggleFeatured: () => void;
  onToggleActive: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function CategoryRow({
  category,
  selected,
  productCount,
  reorderMode,
  canMoveUp,
  canMoveDown,
  onSelect,
  onEdit,
  onViewProducts,
  onAddProduct,
  onToggleFeatured,
  onToggleActive,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: CategoryActionProps) {
  return (
    <div
      className={
        "relative rounded-2xl border transition " +
        (selected
          ? "border-indigo-200 bg-indigo-50/65 shadow-[0_6px_20px_rgba(89,104,234,.08)]"
          : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50/70")
      }
    >
      <button
        type="button"
        onClick={onSelect}
        className={`flex min-h-[72px] w-full items-center gap-3 px-3 py-2.5 text-start sm:min-h-[68px] ${reorderMode ? "pe-24 sm:pe-20" : "pe-14"}`}
      >
        <span
          className={
            "grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl sm:size-10 " +
            (selected ? "bg-white text-indigo-600 shadow-sm" : "bg-slate-100 text-slate-500")
          }
        >
          {category.image ? (
            <img src={category.image} alt="" className="size-full object-contain p-1" />
          ) : (
            <CategoryGlyph slug={category.slug} className="size-10 sm:size-9" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[13px] font-black text-slate-700 sm:text-[11.5px]">
              {category.name}
            </span>
            {category.featured && (
              <span
                title={
                  category.active
                    ? "Featured on homepage"
                    : "Featured is saved, but Hidden status takes precedence"
                }
                className="shrink-0 rounded-full bg-violet-50 px-1.5 py-0.5 text-[7.5px] font-black uppercase tracking-wide text-violet-700"
              >
                Featured
              </span>
            )}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-400 sm:text-[9px]">
            <span className="max-w-[150px] truncate">/{category.slug}</span>
            <span>•</span>
            <span>{productCount} products</span>
            <span
              className={
                "rounded-full px-2 py-0.5 font-bold " +
                (category.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")
              }
            >
              {category.active ? "Active" : "Hidden"}
            </span>
          </span>
        </span>
      </button>

      <div className="absolute end-2 top-1/2 -translate-y-1/2">
        {reorderMode ? (
          <div className="flex gap-1">
            <button
              type="button"
              disabled={!canMoveUp}
              onClick={(event) => {
                event.stopPropagation();
                onMoveUp();
              }}
              aria-label={"Move " + category.name + " up"}
              className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronUp className="size-3.5" />
            </button>
            <button
              type="button"
              disabled={!canMoveDown}
              onClick={(event) => {
                event.stopPropagation();
                onMoveDown();
              }}
              aria-label={"Move " + category.name + " down"}
              className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </div>
        ) : (
          <CatalogRowActions
            entityName={category.name}
            entityType="Category"
            actions={[
              { label: "Edit", icon: Pencil, onClick: onEdit },
              { label: "View Products", icon: Eye, onClick: onViewProducts },
              { label: "Add Product", icon: Plus, onClick: onAddProduct },
              {
                label: category.featured ? "Unfeature" : "Feature",
                icon: Sparkles,
                onClick: onToggleFeatured,
              },
              {
                label: category.active ? "Hide" : "Show",
                icon: category.active ? EyeOff : Eye,
                onClick: onToggleActive,
              },
              { label: "Duplicate", icon: Copy, onClick: onDuplicate },
            ]}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  );
}

export default function CategoryList({
  categories,
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
  categories: CatalogCategory[];
  selectedId: string;
  getProductCount: (category: CatalogCategory) => number;
  reorderMode: boolean;
  onSelect: (category: CatalogCategory) => void;
  onEdit: (category: CatalogCategory) => void;
  onViewProducts: (category: CatalogCategory) => void;
  onAddProduct: (category: CatalogCategory) => void;
  onToggleFeatured: (category: CatalogCategory) => void;
  onToggleActive: (category: CatalogCategory) => void;
  onDuplicate: (category: CatalogCategory) => void;
  onDelete: (category: CatalogCategory) => void;
  onMove: (categoryId: string, direction: -1 | 1) => void;
}) {
  if (!categories.length) return null;

  return (
    <div className="space-y-1.5">
      {categories.map((category, index) => (
        <CategoryRow
          key={category.id}
          category={category}
          selected={category.id === selectedId}
          productCount={getProductCount(category)}
          reorderMode={reorderMode}
          canMoveUp={index > 0}
          canMoveDown={index < categories.length - 1}
          onSelect={() => onSelect(category)}
          onEdit={() => onEdit(category)}
          onViewProducts={() => onViewProducts(category)}
          onAddProduct={() => onAddProduct(category)}
          onToggleFeatured={() => onToggleFeatured(category)}
          onToggleActive={() => onToggleActive(category)}
          onDuplicate={() => onDuplicate(category)}
          onDelete={() => onDelete(category)}
          onMoveUp={() => onMove(category.id, -1)}
          onMoveDown={() => onMove(category.id, 1)}
        />
      ))}
    </div>
  );
}
