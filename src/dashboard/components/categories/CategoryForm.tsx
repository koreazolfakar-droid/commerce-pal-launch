import { Check, Loader2, Trash2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CategoryGlyph } from "@/components/CategoryGlyph";
import ImageOptimizationPreview from "@/dashboard/components/ImageOptimizationPreview";
import { normalizeCategorySlug, type CatalogCategory } from "@/dashboard/data/categories";
import { CategoryIcon } from "@/dashboard/components/categories/CategoryIcon";
import { categoryIconOptions } from "@/dashboard/components/categories/category-icons";
import {
  inspectProductImageSource,
  type ProductImageSourceInfo,
} from "@/dashboard/lib/imageProcessing";

export type CategoryImageChange = {
  file?: File;
  remove?: boolean;
};

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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
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
  onSave: (category: CatalogCategory, imageChange: CategoryImageChange) => Promise<void>;
}) {
  const [draft, setDraft] = useState<CatalogCategory>({ ...category });
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [sourceInfo, setSourceInfo] = useState<ProductImageSourceInfo | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pendingImage) {
      setPreviewUrl("");
      return;
    }
    const next = URL.createObjectURL(pendingImage);
    setPreviewUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [pendingImage]);

  const patch = (next: Partial<CatalogCategory>) => {
    setDraft((current) => ({ ...current, ...next }));
  };

  const selectImage = async (file?: File) => {
    if (!file) return;
    try {
      const info = await inspectProductImageSource(file);
      setPendingImage(file);
      setSourceInfo(info);
      setRemoveImage(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to read image.");
    }
  };

  const clearImage = () => {
    setPendingImage(null);
    setSourceInfo(null);
    setRemoveImage(true);
    patch({ image: undefined });
  };

  const submit = async () => {
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
    setSaving(true);
    try {
      await onSave(
        {
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
        },
        {
          ...(pendingImage ? { file: pendingImage } : {}),
          ...(removeImage ? { remove: true } : {}),
        },
      );
    } catch {
      // The parent shows the actionable Supabase/Storage error.
    } finally {
      setSaving(false);
    }
  };

  const activePreview = previewUrl || (!removeImage ? draft.image || "" : "");

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-end bg-slate-950/45 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[28px]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-100 bg-white text-indigo-600 shadow-sm">
              {activePreview ? (
                <img src={activePreview} alt="" className="size-full object-contain p-1" />
              ) : (
                <CategoryGlyph slug={draft.slug || draft.name || "category"} className="size-10" />
              )}
            </span>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6a70e7]">
                {mode === "create" ? "New category" : "Edit category"}
              </div>
              <h2 className="mt-1 truncate text-[19px] font-black tracking-[-.03em] text-[#14203a]">
                {mode === "create" ? "Create Category" : draft.name || "Category"}
              </h2>
              <p className="mt-1 truncate text-[10px] text-slate-400">
                Configure browsing, storefront visibility, identity, order, and SEO.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close category form"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 disabled:opacity-50"
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

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <div className="grid gap-4 p-4 sm:grid-cols-[150px_1fr]">
                <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {activePreview ? (
                    <img
                      src={activePreview}
                      alt=""
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <div className="relative grid size-full place-items-center">
                      <CategoryGlyph
                        slug={draft.slug || draft.name || "category"}
                        className="h-[8.25rem] w-[8.25rem]"
                      />
                      <span className="absolute inset-x-2 bottom-2 rounded-lg bg-slate-900/75 px-2 py-1 text-center text-[8px] font-bold text-white">
                        Storefront default
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-black text-slate-700">Storefront category image</div>
                  <p className="mt-1 text-[10px] leading-4 text-slate-400">
                    The preview now matches the storefront. Upload a custom image to replace the
                    built-in category artwork. Removing the custom image restores the default.
                    Uploads are converted to WebP with a maximum 1080 px edge.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#5968ea] px-3.5 text-[10px] font-bold text-white shadow-sm">
                      <Upload className="size-4" />
                      {activePreview ? "Replace image" : "Use custom image"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="sr-only"
                        disabled={saving}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          void selectImage(file);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {activePreview ? (
                      <button
                        type="button"
                        onClick={clearImage}
                        disabled={saving}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 text-[10px] font-bold text-rose-600 disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                        Restore default
                      </button>
                    ) : null}
                  </div>

                  {sourceInfo ? (
                    <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-[9px] leading-4 text-indigo-700">
                      <div className="font-bold">Ready for WebP conversion</div>
                      <div>
                        Source: {sourceInfo.width}×{sourceInfo.height} · {formatBytes(sourceInfo.bytes)}
                      </div>
                    </div>
                  ) : null}

                  {pendingImage ? (
                    <div className="mt-3">
                      <ImageOptimizationPreview
                        files={[pendingImage]}
                        resolution="1080"
                        title="Category compression preview"
                        compact
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="border-t border-slate-200 bg-white p-3.5">
                <TextField
                  label="Image URL (advanced)"
                  value={removeImage ? "" : draft.image || ""}
                  onChange={(value) => {
                    setPendingImage(null);
                    setSourceInfo(null);
                    setRemoveImage(false);
                    patch({ image: value });
                  }}
                  placeholder="https://..."
                />
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

        <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:flex sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600 disabled:opacity-50 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="flex h-10 w-full min-w-32 items-center justify-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(89,104,234,.22)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {saving
              ? pendingImage
                ? "Optimizing & saving..."
                : "Saving..."
              : mode === "create"
                ? "Create Category"
                : "Save Category"}
          </button>
        </div>
      </div>
    </div>
  );
}
