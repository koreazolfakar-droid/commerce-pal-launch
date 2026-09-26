import { Check, Image as ImageIcon, Loader2, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import AiAssistPanel from "@/dashboard/components/ai/AiAssistPanel";
import ImageOptimizationPreview from "@/dashboard/components/ImageOptimizationPreview";
import { useSmartImageEditor } from "@/dashboard/components/SmartImageEditor";
import type { ImageBackgroundRemovalOptions } from "@/dashboard/lib/imageProcessing";
import BrandMark from "@/dashboard/components/brands/BrandMark";
import { normalizeBrandSlug, type CatalogBrand } from "@/dashboard/data/brands";

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

export type BrandImageChange = {
  logoFile?: File;
  coverFile?: File;
  removeLogo?: boolean;
  removeCover?: boolean;
  logoBackgroundRemoval?: ImageBackgroundRemovalOptions;
};

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
  onSave: (brand: CatalogBrand, imageChange: BrandImageChange) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<CatalogBrand>({ ...brand });
  const [saving, setSaving] = useState(false);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [pendingCover, setPendingCover] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  const [removeLogoBackground, setRemoveLogoBackground] = useState(true);
  const [logoBackgroundTolerance, setLogoBackgroundTolerance] = useState(18);
  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const imageEditor = useSmartImageEditor();
  const patch = (next: Partial<CatalogBrand>) => setDraft((current) => ({ ...current, ...next }));

  const applyAiPatch = (values: Record<string, string>) => {
    let safeWebsite: string | undefined;
    if (values.website !== undefined) {
      try {
        const parsed = new URL(values.website.trim());
        if (parsed.protocol === "https:" || parsed.protocol === "http:") {
          safeWebsite = parsed.toString();
        }
      } catch {
        // Keep the current website when AI returns an invalid URL.
      }
      if (!safeWebsite) {
        toast.info("AI website suggestion was not a valid HTTP(S) URL, so it was not applied.");
      }
    }

    patch({
      ...(values.name !== undefined ? { name: values.name } : {}),
      ...(values.slug !== undefined ? { slug: normalizeBrandSlug(values.slug) } : {}),
      ...(values.description !== undefined ? { description: values.description } : {}),
      ...(safeWebsite !== undefined ? { website: safeWebsite } : {}),
      ...(values.seoTitle !== undefined ? { seoTitle: values.seoTitle } : {}),
      ...(values.seoDescription !== undefined ? { seoDescription: values.seoDescription } : {}),
    });
  };

  const submit = async () => {
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
    setSaving(true);
    const saved = await onSave({
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
    }, {
      ...(pendingLogo ? { logoFile: pendingLogo } : {}),
      ...(pendingCover ? { coverFile: pendingCover } : {}),
      ...(removeLogo ? { removeLogo: true } : {}),
      ...(removeCover ? { removeCover: true } : {}),
      ...(pendingLogo
        ? {
            logoBackgroundRemoval: {
              enabled: removeLogoBackground,
              tolerance: logoBackgroundTolerance,
            },
          }
        : {}),
    });
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-end bg-slate-950/45 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      {imageEditor.dialog}
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">
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
          <div className="flex shrink-0 items-center gap-2">
            <AiAssistPanel
              entity="brand"
              query={draft.name}
              currentData={{
                name: draft.name,
                slug: draft.slug,
                description: draft.description,
                website: draft.website || "",
                seoTitle: draft.seoTitle || "",
                seoDescription: draft.seoDescription || "",
              }}
              fields={[
                {
                  key: "name",
                  label: "Brand name",
                  description: "Official customer-facing brand name.",
                  maxLength: 120,
                },
                {
                  key: "slug",
                  label: "Slug",
                  description: "Short stable lowercase URL slug.",
                  maxLength: 120,
                },
                {
                  key: "description",
                  label: "Description",
                  description: "Original factual brand description relevant to the catalog.",
                  maxLength: 3000,
                },
                {
                  key: "website",
                  label: "Official website",
                  description: "Official brand or manufacturer website only.",
                  review: true,
                  maxLength: 500,
                },
                {
                  key: "seoTitle",
                  label: "SEO title",
                  description: "Natural brand search title for Space Call.",
                  maxLength: 70,
                },
                {
                  key: "seoDescription",
                  label: "Meta description",
                  description: "Natural useful brand search description.",
                  maxLength: 180,
                },
              ]}
              context={{
                market: "Lebanon",
                store: "Space Call",
                entityId: draft.id,
                officialDomains: draft.website ? [draft.website] : [],
                existingBrands: brands.map((item) => ({ name: item.name, slug: item.slug })),
              }}
              onApply={applyAiPatch}
              compact
            />
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close brand form"
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
          </div>
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
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-2 text-[11px] font-bold text-slate-600">Logo</div>
                <div className="flex items-center gap-3">
                  <BrandMark brand={draft} className="size-16" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      ref={logoInput}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        event.currentTarget.value = "";
                        if (!file) return;
                        void imageEditor.editFile(file, {
                          title: "Adjust brand logo",
                          preset: "logo",
                          transparent: true,
                          defaultFit: "contain",
                        }).then((edited) => {
                          if (!edited) return;
                          setPendingLogo(edited);
                          setRemoveLogo(false);
                        });
                      }}
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => logoInput.current?.click()}
                      className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 transition hover:border-indigo-200 disabled:opacity-50"
                    >
                      <UploadCloud className="size-3.5" />
                      {pendingLogo ? "Change selection" : draft.logo && !removeLogo ? "Replace logo" : "Upload logo"}
                    </button>
                    {(draft.logo || pendingLogo) && !removeLogo && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const source = pendingLogo ?? draft.logo;
                            if (!source) return;
                            const editPromise =
                              source instanceof File
                                ? imageEditor.editFile(source, {
                                    title: "Adjust brand logo",
                                    preset: "logo",
                                    transparent: true,
                                    defaultFit: "contain",
                                  })
                                : imageEditor.editUrl(source, {
                                    title: "Adjust brand logo",
                                    preset: "logo",
                                    transparent: true,
                                    defaultFit: "contain",
                                  });
                            void editPromise.then((edited) => {
                              if (!edited) return;
                              setPendingLogo(edited);
                              setRemoveLogo(false);
                            });
                          }}
                          className="text-[9px] font-bold text-indigo-600"
                        >
                          Adjust
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingLogo(null);
                            setRemoveLogo(true);
                            patch({ logo: undefined });
                          }}
                          className="text-[9px] font-bold text-rose-600"
                        >
                          Remove logo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-2 text-[11px] font-bold text-slate-600">Cover image</div>
                <div className="relative grid h-16 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {draft.coverImage ? (
                    <img src={draft.coverImage} alt="Brand cover preview" className="size-full object-cover" />
                  ) : (
                    <ImageIcon className="size-5 text-slate-300" />
                  )}
                </div>
                <input
                  ref={coverInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    event.currentTarget.value = "";
                    if (!file) return;
                    void imageEditor.editFile(file, {
                      title: "Adjust brand cover",
                      preset: "cover",
                      transparent: true,
                      defaultFit: "cover",
                    }).then((edited) => {
                      if (!edited) return;
                      setPendingCover(edited);
                      setRemoveCover(false);
                    });
                  }}
                />
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => coverInput.current?.click()}
                    className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 transition hover:border-indigo-200 disabled:opacity-50"
                  >
                    <UploadCloud className="size-3.5" />
                    {pendingCover ? "Change selection" : draft.coverImage && !removeCover ? "Replace" : "Upload cover"}
                  </button>
                  {(draft.coverImage || pendingCover) && !removeCover && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const source = pendingCover ?? draft.coverImage;
                          if (!source) return;
                          const editPromise =
                            source instanceof File
                              ? imageEditor.editFile(source, {
                                  title: "Adjust brand cover",
                                  preset: "cover",
                                  transparent: true,
                                  defaultFit: "cover",
                                })
                              : imageEditor.editUrl(source, {
                                  title: "Adjust brand cover",
                                  preset: "cover",
                                  transparent: true,
                                  defaultFit: "cover",
                                });
                          void editPromise.then((edited) => {
                            if (!edited) return;
                            setPendingCover(edited);
                            setRemoveCover(false);
                          });
                        }}
                        className="text-[9px] font-bold text-indigo-600"
                      >
                        Adjust
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingCover(null);
                          setRemoveCover(true);
                          patch({ coverImage: undefined });
                        }}
                        className="text-[9px] font-bold text-rose-600"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {pendingLogo ? (
                <div className="sm:col-span-2 space-y-3">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/45 p-3">
                    <Toggle
                      title="Remove white background"
                      description="Keeps only white/off-white pixels connected to the image edges, so interior white logo details stay protected."
                      checked={removeLogoBackground}
                      onChange={setRemoveLogoBackground}
                    />
                    {removeLogoBackground ? (
                      <label className="mt-3 block rounded-xl border border-emerald-100 bg-white px-3 py-2.5">
                        <span className="flex items-center justify-between gap-3 text-[10px] font-bold text-slate-600">
                          <span>Background tolerance</span>
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">
                            {logoBackgroundTolerance}
                          </span>
                        </span>
                        <input
                          type="range"
                          min={4}
                          max={60}
                          step={1}
                          value={logoBackgroundTolerance}
                          onChange={(event) => setLogoBackgroundTolerance(Number(event.target.value))}
                          className="mt-2 w-full accent-emerald-600"
                          aria-label="Logo background removal tolerance"
                        />
                        <span className="mt-1 block text-[8px] leading-3 text-slate-400">
                          Lower is safer. Raise it only when the uploaded background is gray/off-white.
                        </span>
                      </label>
                    ) : null}
                  </div>
                  <ImageOptimizationPreview
                    files={[pendingLogo]}
                    resolution="1080"
                    title="Logo compression preview"
                    compact
                    backgroundRemoval={{
                      enabled: removeLogoBackground,
                      tolerance: logoBackgroundTolerance,
                    }}
                  />
                </div>
              ) : null}
              {pendingCover ? (
                <div className="sm:col-span-2">
                  <ImageOptimizationPreview
                    files={[pendingCover]}
                    resolution="1920"
                    title="Cover compression preview"
                    compact
                  />
                </div>
              ) : null}
              <details className="sm:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <summary className="cursor-pointer text-[10px] font-bold text-slate-500">Use image URLs instead</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Logo URL"
                    value={draft.logo || ""}
                    onChange={(value) => {
                      setPendingLogo(null);
                      setRemoveLogo(false);
                      patch({ logo: value });
                    }}
                    placeholder="https://..."
                  />
                  <Field
                    label="Cover Image URL"
                    value={draft.coverImage || ""}
                    onChange={(value) => {
                      setPendingCover(null);
                      setRemoveCover(false);
                      patch({ coverImage: value });
                    }}
                    placeholder="https://..."
                  />
                </div>
              </details>
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
              JPG, PNG, WebP and AVIF are optimized automatically. Brand logos can also remove edge-connected white backgrounds and save as transparent WebP.
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
            {saving ? "Saving…" : mode === "create" ? "Create Brand" : "Save Brand"}
          </button>
        </div>
      </div>
    </div>
  );
}
