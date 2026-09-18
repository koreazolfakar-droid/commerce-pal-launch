import { Check, Image as ImageIcon, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import BrandMark from "@/dashboard/components/brands/BrandMark";
import { normalizeBrandSlug, type CatalogBrand } from "@/dashboard/mock/brands";

function Field({
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

function Toggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
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

export default function BrandForm({
  brand,
  brands,
  mode,
  onClose,
  onSave,
}: {
  brand: CatalogBrand;
  brands: CatalogBrand[];
  mode: "create" | "edit";
  onClose: () => void;
  onSave: (brand: CatalogBrand) => void;
}) {
  const [draft, setDraft] = useState<CatalogBrand>({ ...brand });
  const patch = (next: Partial<CatalogBrand>) => setDraft((current) => ({ ...current, ...next }));

  const submit = () => {
    const name = draft.name.trim();
    if (!name) {
      toast.error("Brand name is required.");
      return;
    }

    const slug = normalizeBrandSlug(draft.slug || name);
    if (!slug) {
      toast.error("Enter a valid brand slug.");
      return;
    }

    const duplicate = brands.some(
      (item) => item.id !== draft.id && item.slug.toLowerCase() === slug.toLowerCase(),
    );
    if (duplicate) {
      toast.error("That brand slug is already in use.");
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
      active: Boolean(draft.active),
      featured: Boolean(draft.featured),
      order: Math.floor(order),
      logo: draft.logo?.trim() || undefined,
      coverImage: draft.coverImage?.trim() || undefined,
      website: draft.website?.trim() || undefined,
      seoTitle: draft.seoTitle?.trim() || undefined,
      seoDescription: draft.seoDescription?.trim() || undefined,
      createdAt: draft.createdAt || now,
      updatedAt: now,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-end bg-slate-950/45 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[28px]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark brand={draft} className="size-11" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6a70e7]">
                {mode === "create" ? "New brand" : "Edit brand"}
              </div>
              <h2 className="mt-1 truncate text-[19px] font-black tracking-[-.03em] text-[#14203a]">
                {mode === "create" ? "Create Brand" : draft.name || "Brand"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close brand form"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-400"
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
              <Field
                label="Brand Name"
                value={draft.name}
                onChange={(value) => {
                  const shouldGenerate = !draft.slug.trim();
                  patch({
                    name: value,
                    ...(shouldGenerate ? { slug: normalizeBrandSlug(value) } : {}),
                  });
                }}
                placeholder="e.g. Apple"
              />
              <Field
                label="Slug"
                value={draft.slug}
                onChange={(value) => patch({ slug: normalizeBrandSlug(value) })}
                placeholder="apple"
              />
            </div>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Description</span>
              <textarea
                value={draft.description}
                onChange={(event) => patch({ description: event.target.value })}
                rows={4}
                placeholder="Describe this brand and the products Space Call carries."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-[12px] leading-5 text-slate-700 outline-none focus:border-[#6974eb] focus:ring-4 focus:ring-[#6974eb]/10"
              />
            </label>
          </section>

          <section>
            <div className="mb-3 text-[10px] font-black uppercase tracking-[.14em] text-slate-400">
              Brand identity
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Logo URL"
                value={draft.logo || ""}
                onChange={(value) => patch({ logo: value })}
                placeholder="https://..."
              />
              <Field
                label="Cover Image URL"
                value={draft.coverImage || ""}
                onChange={(value) => patch({ coverImage: value })}
                placeholder="https://..."
              />
              <div className="sm:col-span-2">
                <Field
                  label="Website"
                  value={draft.website || ""}
                  onChange={(value) => patch({ website: value })}
                  placeholder="https://www.example.com"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-[10px] text-slate-400">
              <ImageIcon className="size-4 shrink-0" />
              URLs are stored locally for the training dashboard. No media service or production
              storage is connected.
            </div>
          </section>

          <section>
            <div className="mb-3 text-[10px] font-black uppercase tracking-[.14em] text-slate-400">
              Visibility
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                title="Active"
                description="Available for storefront brand browsing"
                checked={draft.active}
                onChange={(active) => patch({ active })}
              />
              <Toggle
                title="Featured on Homepage"
                description="Show this brand in homepage sections"
                checked={draft.featured}
                onChange={(featured) => patch({ featured })}
              />
            </div>
            {!draft.active && draft.featured && (
              <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-700">
                Featured remains saved, but Hidden status takes precedence until the brand is active
                again.
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 text-[10px] font-black uppercase tracking-[.14em] text-slate-400">
              Order
            </div>
            <div className="max-w-[220px]">
              <Field
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
              <Field
                label="SEO Title"
                value={draft.seoTitle || ""}
                onChange={(value) => patch({ seoTitle: value })}
                placeholder={draft.name ? draft.name + " | Space Call" : "Brand | Space Call"}
              />
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                  Meta Description
                </span>
                <textarea
                  value={draft.seoDescription || ""}
                  onChange={(event) => patch({ seoDescription: event.target.value })}
                  rows={3}
                  placeholder="Short search description for this brand."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-[12px] leading-5 text-slate-700 outline-none focus:border-[#6974eb] focus:ring-4 focus:ring-[#6974eb]/10"
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
            {mode === "create" ? "Create Brand" : "Save Brand"}
          </button>
        </div>
      </div>
    </div>
  );
}
