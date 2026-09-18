import { EyeOff, Sparkles } from "lucide-react";
import { CategoryIcon } from "@/dashboard/components/categories/CategoryIcon";
import type { CatalogCategory } from "@/dashboard/data/categories";
import type { DashboardProduct } from "@/dashboard/data/catalog";

export default function CategoryPreview({
  category,
  products,
}: {
  category: CatalogCategory;
  products: DashboardProduct[];
}) {
  const effectiveFeatured = category.active && category.featured;

  return (
    <section
      id="category-homepage-preview"
      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(33,47,82,.04)] sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[12px] font-black text-[#14203a]">Category Preview on Homepage</div>
          <div className="mt-1 text-[10px] text-slate-400">
            Visual preview only — it reuses the current category and product data.
          </div>
        </div>
        <span
          className={
            "rounded-full px-2.5 py-1 text-[9px] font-bold " +
            (effectiveFeatured ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-500")
          }
        >
          {effectiveFeatured ? "Featured" : "Not visible"}
        </span>
      </div>

      {effectiveFeatured ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#fafbfe]">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-[#5968ea] shadow-sm">
              {category.image ? (
                <img src={category.image} alt="" className="size-full rounded-2xl object-cover" />
              ) : (
                <CategoryIcon name={category.icon} className="size-6" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-[15px] font-black tracking-[-.03em] text-[#14203a]">
                  {category.name}
                </h3>
                <Sparkles className="size-3.5 shrink-0 text-violet-500" />
              </div>
              <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">
                {category.description || "Explore the latest products in this Space Call category."}
              </p>
            </div>
            <div className="flex shrink-0 -space-x-2 rtl:space-x-reverse">
              {products.slice(0, 4).map((product) => (
                <img
                  key={product.id}
                  src={product.image}
                  alt={product.name}
                  title={product.name}
                  className="size-10 rounded-xl border-2 border-white bg-white object-cover shadow-sm"
                />
              ))}
              {!products.length && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-[9px] text-slate-400">
                  No products yet
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-slate-400">
            <EyeOff className="size-4" />
          </span>
          <div>
            <div className="text-[11px] font-bold text-slate-600">
              This category is currently hidden from homepage sections.
            </div>
            <div className="mt-1 text-[9px] leading-4 text-slate-400">
              {category.active
                ? "Enable Featured to include it in homepage category sections."
                : "Hidden storefront status takes precedence even if Featured is enabled."}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
