import { Check, Image as ImageIcon, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { normalizeCategorySlug, type CatalogCategory } from "@/dashboard/data/categories";
import { CategoryIcon } from "@/dashboard/components/categories/CategoryIcon";
import { categoryIconOptions } from "@/dashboard/components/categories/category-icons";

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}</span>
      <input
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#6974eb] focus:ring-4 focus:ring-[#6974eb]/10"
      />
    </label>
  );
}

function ToggleRow({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-start transition hover:border-indigo-200"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-bold text-slate-700">{title}</span>
        <span className="mt-0.5 block text-[10px] leading-4 text-slate-400">{description}</span>
      </span>
      <span
        className={
          "relative h-6 w-11 shrink-0 rounded-full transition " +
          (checked ? "bg-[#5968ea]" : "bg-slate-200")
        }
        aria-hidden="true"
      >
        <span
          className={
            "absolute top-1 size-4 rounded-full bg-white shadow-sm transition-all " +
            (checked ? "end-1" : "start-1")
          }
        />
      </span>
    </button>
  );
}

export default function CategoryForm({
  category,
  categories,
  mode,
  onClose,
  onSave,
}: {
  category: CatalogCategory;
  categories: CatalogCategory[];
  mode: "create" | "edit";
  onClose: () => void;
  onSave: (category: CatalogCategory) => void;
}) {
  const [draft, setDraft] = useState<CatalogCategory>({ ...category });

  const patch = (next: Partial<CatalogCategory>) => {
    setDraft((current) => ({ ...current, ...next }));
  };

  const submit = () => {
    const name = draft.name.trim();
    if (!name) {
      toast.error("Category name is required.");
      return;
    }

    const slug = normalizeCategorySlug(draft.slug || name);
    if (!slug) {
      toast.error("Enter a valid category slug.");
      return;
    }

    const duplicateSlug = categories.some(
      (item) => item.id !== draft.id && item.slug.trim().toLowerCase() === slug.toLowerCase(),
    );
    if (duplicateSlug) {
      toast.error("That category slug is already in use.");
      return;
    }

    const order = Number(draft.order);
    if (!Number.isFinite(order) || order < 1) {
      toast.error("Sort order must be a positive number.");
      return;
    }

    const now = new Date().toISOString();
    onSave({
      ...draft,
      name,
      slug,
      description: draft.description.trim(),
      icon: draft.icon || "LayoutGrid",
      order: Math.floor(order),
      featured: Boolean(draft.featured),
      active: Boolean(draft.active),
      image: draft.image?.trim() || undefined,
      seoTitle: draft.seoTitle?.trim() || undefined,
      seoDescription: draft.seoDescription?.trim() || undefined,
      createdAt: draft.createdAt || now,
      updatedAt: now,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-end bg-slate-950/45 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[28px]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6a70e7]">
              {mode === "create" ? "New category" : "Edit category"}
            </div>
            <h2 className="mt-1 text-[19px] font-black tracking-[-.03em] text-[#14203a]">
              {mode === "create" ? "Create Category" : draft.name || "Category"}
            </h2>
            <p className="mt-1 text-[10px] text-slate-400">
              Configure browsing, storefront visibility, identity, order, and SEO.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close category form"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-6 px-5 py-5 sm:px-6">
          <section>
            <div className="mb-3 text-[10px] font-black uppercase tracking-[.14em] text-slate-400">
              Basic information
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Category Name"
                value={draft.name}
                onChange={(value) => {
                  const shouldGenerateSlug = !draft.slug.trim();
                  patch({
                    name: value,
                    ...(shouldGenerateSlug ? { slug: normalizeCategorySlug(value) } : {}),
                  });
                }}
                placeholder="e.g. Smartphones"
              />
              <TextField
                label="Slug"
                value={draft.slug}
                onChange={(value) => patch({ slug: normalizeCategorySlug(value) })}
                placeholder="smartphones"
              />
            </div>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Description</span>
              <textarea
                value={draft.description}
                onChange={(event) => patch({ description: event.target.value })}
                rows={4}
                placeholder="Explain what customers will find in this category."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-[12px] leading-5 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#6974eb] focus:ring-4 focus:ring-[#6974eb]/10"
              />
            </label>
          </section>

          <section>
            <div className="mb-3 text-[10px] font-black uppercase tracking-[.14em] text-slate-400">
              Visual identity
            </div>
            <div className="rounded-2xl border border-slate-200 p-3.5">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <CategoryIcon name={draft.icon} className="size-5" />
                </span>
                <div>
                  <div className="text-[11px] font-bold text-slate-700">
                    {draft.icon || "LayoutGrid"}
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Choose an icon suited to electronics retail.
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                {categoryIconOptions.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    title={icon}
                    aria-label={"Use " + icon + " icon"}
                    onClick={() => patch({ icon })}
                    className={
                      "grid aspect-square min-h-10 place-items-center rounded-xl border transition " +
                      (draft.icon === icon
                        ? "border-indigo-400 bg-indigo-50 text-indigo-600 ring-2 ring-indigo-100"
                        : "border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-500")
                    }
                  >
                    <CategoryIcon name={icon} className="size-4.5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <TextField
                label="Image URL / Cover Image"
                value={draft.image || ""}
                onChange={(value) => patch({ image: value })}
                placeholder="https://..."
              />
              <div className="flex h-11 min-w-28 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 text-[10px] font-semibold text-slate-400">
                <ImageIcon className="size-4" />
                Optional
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 text-[10px] font-black uppercase tracking-[.14em] text-slate-400">
              Visibility
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleRow
                checked={draft.active}
                onChange={(active) => patch({ active })}
                title="Active"
                description="Visible in the storefront"
              />
              <ToggleRow
                checked={draft.featured}
                onChange={(featured) => patch({ featured })}
                title="Featured on Homepage"
                description="Show this category in homepage sections"
              />
            </div>
            {!draft.active && draft.featured && (
              <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-700">
                Featured is preserved, but Hidden status takes precedence until the category is
                active again.
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 text-[10px] font-black uppercase tracking-[.14em] text-slate-400">
              Order
            </div>
            <div className="max-w-[220px]">
              <TextField
                label="Sort Order"
                type="number"
                min={1}
                value={String(draft.order)}
                onChange={(value) => patch({ order: Number(value) || 0 })}
              />
            </div>
          </section>

          <section>
            <div className="mb-3 text-[10px] font-black uppercase tracking-[.14em] text-slate-400">
              SEO
            </div>
            <div className="space-y-4">
              <TextField
                label="SEO Title"
                value={draft.seoTitle || ""}
                onChange={(value) => patch({ seoTitle: value })}
                placeholder={draft.name ? draft.name + " | Space Call" : "Category | Space Call"}
              />
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                  Meta Description
                </span>
                <textarea
                  value={draft.seoDescription || ""}
                  onChange={(event) => patch({ seoDescription: event.target.value })}
                  rows={3}
                  placeholder="Short search description for this category."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-[12px] leading-5 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#6974eb] focus:ring-4 focus:ring-[#6974eb]/10"
                />
              </label>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(89,104,234,.22)]"
          >
            <Check className="size-4" />
            {mode === "create" ? "Create Category" : "Save Category"}
          </button>
        </div>
      </div>
    </div>
  );
}
