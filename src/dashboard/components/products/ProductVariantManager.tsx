import { useLanguage } from "@/dashboard/i18n";
import {
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDashboardModal } from "@/dashboard/hooks/useDashboardModal";
import {
  buildVariantOptions,
  dedicatedVariantOptionText,
  variantOptionRows,
  type VariantOptionRow,
} from "@/dashboard/lib/variantOptions";
import { toast } from "sonner";
import DashboardConfirmDialog from "@/dashboard/components/DashboardConfirmDialog";
import ProductColorPicker from "@/dashboard/components/products/ProductColorPicker";
import ImageOptimizationPreview from "@/dashboard/components/ImageOptimizationPreview";
import { useSmartImageEditor } from "@/dashboard/components/SmartImageEditor";
import {
  getProductImageResolution,
  setProductImageResolution,
  type ProductImageResolution,
} from "@/dashboard/lib/imageProcessing";

import {
  clearDashboardVariantImage,
  createDashboardProductVariant,
  deleteDashboardProductVariant,
  loadDashboardProductVariants,
  reorderDashboardProductVariants,
  updateDashboardProductVariant,
  uploadDashboardVariantImage,
  type DashboardProductVariant,
  type DashboardProductVariantInput,
  type DashboardVariantOptionValue,
} from "@/dashboard/data/productManagement";

type VariantDraft = {
  title: string;
  color: string;
  storage: string;
  sku: string;
  barcode: string;
  price: string;
  compareAt: string;
  stock: string;
  trackInventory: boolean;
  allowBackorder: boolean;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  baseOptions: Record<string, DashboardVariantOptionValue>;
};

const EMPTY_DRAFT: VariantDraft = {
  title: "",
  color: "",
  storage: "",
  sku: "",
  barcode: "",
  price: "0",
  compareAt: "",
  stock: "0",
  trackInventory: true,
  allowBackorder: false,
  imageUrl: "",
  sortOrder: 0,
  isActive: true,
  baseOptions: {},
};

function optionText(options: Record<string, DashboardVariantOptionValue>, keys: string[]) {
  return dedicatedVariantOptionText(options, keys);
}

function draftFromVariant(variant: DashboardProductVariant): VariantDraft {
  return {
    title: variant.title,
    color: optionText(variant.options, ["color", "Color", "colour"]),
    storage: optionText(variant.options, ["storage", "Storage", "capacity", "Capacity"]),
    sku: variant.sku,
    barcode: variant.barcode,
    price: String(variant.price),
    compareAt: variant.compareAt == null ? "" : String(variant.compareAt),
    stock: String(variant.stock),
    trackInventory: variant.trackInventory,
    allowBackorder: variant.allowBackorder,
    imageUrl: variant.imageUrl,
    sortOrder: variant.sortOrder,
    isActive: variant.isActive,
    baseOptions: { ...variant.options },
  };
}

function buildInput(draft: VariantDraft): DashboardProductVariantInput {
  const options = { ...draft.baseOptions };
  for (const key of ["color", "Color", "colour"]) delete options[key];
  for (const key of ["storage", "Storage", "capacity", "Capacity"]) delete options[key];
  if (draft.color.trim()) options.color = draft.color.trim();
  if (draft.storage.trim()) options.storage = draft.storage.trim();

  const price = Number(draft.price);
  const compareAt = draft.compareAt.trim() ? Number(draft.compareAt) : null;
  const stock = Number(draft.stock);
  if (!Number.isFinite(price) || price < 0) throw new Error("Enter a valid variant price.");
  if (compareAt != null && (!Number.isFinite(compareAt) || compareAt < 0)) {
    throw new Error("Enter a valid compare-at price.");
  }
  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error("Stock must be a non-negative whole number.");
  }

  return {
    title:
      draft.title.trim() || [draft.color, draft.storage].filter(Boolean).join(" / ") || "Default",
    sku: draft.sku,
    barcode: draft.barcode,
    price,
    compareAt,
    stock,
    trackInventory: draft.trackInventory,
    allowBackorder: draft.allowBackorder,
    options,
    imageUrl: draft.imageUrl,
    sortOrder: draft.sortOrder,
    isActive: draft.isActive,
  };
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ProductVariantManager({
  productId,
  onCountChange,
  onSingleVariantChange,
}: {
  productId: string;
  onCountChange?: (count: number) => void;
  onSingleVariantChange?: (variant: DashboardProductVariant | null) => void;
}) {
  const { t } = useLanguage();
  const [variants, setVariants] = useState<DashboardProductVariant[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DashboardProductVariant | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imageResolution, setImageResolution] = useState<ProductImageResolution>(() =>
    getProductImageResolution(),
  );
  const [editing, setEditing] = useState<DashboardProductVariant | null>(null);
  const [draft, setDraft] = useState<VariantDraft>(EMPTY_DRAFT);
  const [open, setOpen] = useState(false);
  const [optionRows, setOptionRows] = useState<VariantOptionRow[]>([]);
  const [optionError, setOptionError] = useState("");
  const editorSessionRef = useRef(0);
  const closeEditor = () => {
    editorSessionRef.current += 1;
    setPendingImageFile(null);
    setOpen(false);
  };
  const variantTitleId = useId();
  const panelRef = useDashboardModal(() => {
    if (!saving && !uploading) closeEditor();
  }, open);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageEditor = useSmartImageEditor();
  const onCountChangeRef = useRef(onCountChange);
  const onSingleVariantChangeRef = useRef(onSingleVariantChange);

  useEffect(() => {
    onCountChangeRef.current = onCountChange;
    onSingleVariantChangeRef.current = onSingleVariantChange;
  }, [onCountChange, onSingleVariantChange]);

  const publishState = useCallback((next: DashboardProductVariant[]) => {
    setVariants(next);
    onCountChangeRef.current?.(next.length);
    onSingleVariantChangeRef.current?.(next.length === 1 ? next[0] : null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const workspace = await loadDashboardProductVariants(productId);
      publishState(workspace.variants);
      setCanDelete(workspace.role === "admin");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to load variants.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [productId, publishState]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    editorSessionRef.current += 1;
    setPendingImageFile(null);
    setEditing(null);
    setDraft({ ...EMPTY_DRAFT, sortOrder: variants.length * 10 });
    setOptionRows([]);
    setOptionError("");
    setOpen(true);
  };

  const openEdit = (variant: DashboardProductVariant) => {
    editorSessionRef.current += 1;
    setPendingImageFile(null);
    setEditing(variant);
    setDraft(draftFromVariant(variant));
    setOptionRows(variantOptionRows(variant.options));
    setOptionError("");
    setOpen(true);
  };

  const save = async () => {
    if (saving) return;
    let input: DashboardProductVariantInput;
    try {
      input = buildInput({ ...draft, baseOptions: buildVariantOptions(optionRows) });
      setOptionError("");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Invalid variant.";
      setOptionError(message);
      toast.error(t(message));
      return;
    }

    setSaving(true);
    try {
      const saved = editing
        ? await updateDashboardProductVariant(editing.id, input)
        : await createDashboardProductVariant(productId, input);
      const next = [...variants.filter((variant) => variant.id !== saved.id), saved].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt),
      );
      publishState(next);
      setEditing(saved);
      setDraft(draftFromVariant(saved));
      toast.success(editing ? "Variant updated." : "Variant created.");
      if (!editing) closeEditor();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Variant save failed.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget || deletingVariantId) return;
    if (!canDelete) {
      toast.error("Only admins can permanently delete variants.");
      setDeleteTarget(null);
      return;
    }

    setDeletingVariantId(deleteTarget.id);
    try {
      await deleteDashboardProductVariant(deleteTarget.id);
      const next = variants.filter((row) => row.id !== deleteTarget.id);
      publishState(next);
      setDeleteTarget(null);
      toast.success("Variant deleted.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Variant delete failed.");
    } finally {
      setDeletingVariantId(null);
    }
  };

  const move = async (variant: DashboardProductVariant, direction: -1 | 1) => {
    const index = variants.findIndex((row) => row.id === variant.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= variants.length) return;
    const next = [...variants];
    [next[index], next[target]] = [next[target], next[index]];
    const normalized = next.map((row, position) => ({ ...row, sortOrder: position * 10 }));
    publishState(normalized);
    try {
      await reorderDashboardProductVariants(
        normalized.map((row) => ({ id: row.id, sortOrder: row.sortOrder })),
      );
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Variant reorder failed.");
      void load();
    }
  };

  const upload = async (file?: File, successMessage?: string) => {
    if (!file || !editing || uploading) return;
    setUploading(true);
    try {
      const result = await uploadDashboardVariantImage(productId, editing.id, file);
      const next = variants.map((row) =>
        row.id === editing.id ? { ...row, imageUrl: result.url } : row,
      );
      publishState(next);
      const updated = next.find((row) => row.id === editing.id) ?? editing;
      setEditing(updated);
      setDraft((current) => ({ ...current, imageUrl: result.url }));
      toast.success(
        successMessage ??
          `Variant image optimized to ${result.conversion.output.width}×${result.conversion.output.height} WebP.`,
      );
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Variant image upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      setPendingImageFile(null);
    }
  };

  const clearImage = async () => {
    if (!editing) return;
    try {
      await clearDashboardVariantImage(productId, editing.id);
      const next = variants.map((row) => (row.id === editing.id ? { ...row, imageUrl: "" } : row));
      publishState(next);
      const updated = next.find((row) => row.id === editing.id) ?? editing;
      setEditing(updated);
      setDraft((current) => ({ ...current, imageUrl: "" }));
      toast.success("Variant image cleared.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to clear variant image.");
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-36 place-items-center" role="status" aria-live="polite">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <Loader2 className="size-5 animate-spin text-indigo-500" />
          {t("Loading variants…")}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="m-5 rounded-2xl border border-rose-100 bg-rose-50 p-4">
        <div className="text-[11px] font-bold text-rose-700">
          {t("Variants could not be loaded.")}
        </div>
        <div className="mt-1 break-words text-[10px] leading-5 text-rose-600">{loadError}</div>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 h-9 rounded-xl border border-rose-200 bg-white px-3 text-[10px] font-bold text-rose-700"
        >
          {t("Retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 py-5">
      {imageEditor.dialog}
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="text-[12px] font-bold text-slate-700">
            {variants.length} {t("variant")} {variants.length === 1 ? "" : "s"}
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            {t("Stock changes are recorded in inventory history automatically.")}
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex h-9 items-center justify-center gap-2 rounded-xl bg-indigo-50 px-3 text-[10px] font-bold text-indigo-700"
        >
          <Plus className="size-3.5" /> {t("Add variant")}
        </button>
      </div>

      <div className="space-y-2">
        {variants.map((variant, index) => {
          const color = optionText(variant.options, ["color", "Color", "colour"]);
          const storage = optionText(variant.options, [
            "storage",
            "Storage",
            "capacity",
            "Capacity",
          ]);
          return (
            <div
              key={variant.id}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="grid size-14 place-items-center overflow-hidden rounded-xl bg-slate-50">
                {variant.imageUrl ? (
                  <img src={variant.imageUrl} alt="" className="size-full object-contain" />
                ) : (
                  <ImageIcon className="size-5 text-slate-300" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-[12px] font-bold text-slate-700">
                    {variant.title}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      variant.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {variant.isActive ? t("Active") : t("Inactive")}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
                  {color ? (
                    <span>
                      {t("Color:")} {color}
                    </span>
                  ) : null}
                  {storage ? (
                    <span>
                      {t("Storage:")} {storage}
                    </span>
                  ) : null}
                  <span>
                    {t("SKU:")} {variant.sku || "—"}
                  </span>
                  <span>
                    {t("Stock:")} {variant.stock}
                  </span>
                  <span>{formatMoney(variant.price)}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => void move(variant, -1)}
                  disabled={index === 0}
                  className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 disabled:opacity-25"
                  aria-label={t("Move variant up")}
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void move(variant, 1)}
                  disabled={index === variants.length - 1}
                  className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 disabled:opacity-25"
                  aria-label={t("Move variant down")}
                >
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(variant)}
                  className="grid size-8 place-items-center rounded-lg text-indigo-600 hover:bg-indigo-50"
                  aria-label={`Edit ${variant.title}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(variant)}
                    disabled={deletingVariantId !== null}
                    className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Delete ${variant.title}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
        {!variants.length ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-[11px] text-slate-400">
            {t(
              "No variants yet. Add one or save the product pricing fields to create a default variant.",
            )}
          </div>
        ) : null}
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-slate-950/40 p-3 sm:p-6"
              dir={document.documentElement.dir === "rtl" ? "rtl" : "ltr"}
              onClick={(event) => {
                if (event.target === event.currentTarget && !saving && !uploading) closeEditor();
              }}
            >
              <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={variantTitleId}
                tabIndex={-1}
                className="dashboard-theme-scope dashboard-variant-dialog mx-auto w-full min-w-0 max-w-3xl rounded-xl bg-white p-4 shadow-2xl sm:p-5"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <div id={variantTitleId} className="text-lg font-bold text-slate-800">
                      {editing ? t("Edit variant") : t("Add variant")}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {t(
                        "Color, storage, identifiers, price, stock and image are stored on the real variant row.",
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeEditor}
                    disabled={saving || uploading}
                    aria-label={t("Close variant editor")}
                    className="grid size-11 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <fieldset disabled={saving || uploading} className="min-w-0">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label={t("Variant title")}
                      value={draft.title}
                      onChange={(value) => setDraft((current) => ({ ...current, title: value }))}
                    />
                    <div className="sm:col-span-2">
                      <ProductColorPicker
                        value={draft.color}
                        onChange={(value) => setDraft((current) => ({ ...current, color: value }))}
                      />
                    </div>
                    <Field
                      label={t("Storage / capacity")}
                      value={draft.storage}
                      onChange={(value) => setDraft((current) => ({ ...current, storage: value }))}
                      placeholder={t("e.g. 256GB")}
                    />
                    <Field
                      label={t("SKU")}
                      value={draft.sku}
                      onChange={(value) => setDraft((current) => ({ ...current, sku: value }))}
                    />
                    <Field
                      label={t("Barcode")}
                      value={draft.barcode}
                      onChange={(value) => setDraft((current) => ({ ...current, barcode: value }))}
                    />
                    <Field
                      label={t("Price")}
                      type="number"
                      value={draft.price}
                      onChange={(value) => setDraft((current) => ({ ...current, price: value }))}
                    />
                    <Field
                      label={t("Compare-at price")}
                      type="number"
                      value={draft.compareAt}
                      onChange={(value) =>
                        setDraft((current) => ({ ...current, compareAt: value }))
                      }
                    />
                    <Field
                      label={t("Stock")}
                      type="number"
                      integer
                      value={draft.stock}
                      onChange={(value) => setDraft((current) => ({ ...current, stock: value }))}
                    />
                  </div>

                  <section className="mt-4 min-w-0 space-y-3" aria-label={t("Additional options")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">{t("Additional options")}</h3>
                      <button
                        type="button"
                        className="dashboard-button min-h-11 px-3 text-xs"
                        onClick={() => setOptionRows((rows) => [...rows, { name: "", value: "" }])}
                      >
                        <Plus className="size-4" /> {t("Add option")}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Add RAM, size, material or another option. Each variant represents one combination.",
                      )}
                    </p>
                    {optionRows.map((row, index) => (
                      <div
                        key={index}
                        className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2"
                      >
                        <Field
                          label={`${t("Option name")} ${index + 1}`}
                          value={row.name}
                          onChange={(name) =>
                            setOptionRows((rows) =>
                              rows.map((item, i) => (i === index ? { ...item, name } : item)),
                            )
                          }
                        />
                        {typeof row.value === "boolean" ? (
                          <CheckField
                            label={`${t("Option value")} ${index + 1}`}
                            checked={row.value}
                            onChange={(value) =>
                              setOptionRows((rows) =>
                                rows.map((item, i) => (i === index ? { ...item, value } : item)),
                              )
                            }
                          />
                        ) : (
                          <Field
                            label={`${t("Option value")} ${index + 1}`}
                            value={String(row.value)}
                            type={row.kind === "number" ? "number" : "text"}
                            onChange={(value) =>
                              setOptionRows((rows) =>
                                rows.map((item, i) =>
                                  i === index
                                    ? {
                                        ...item,
                                        value,
                                      }
                                    : item,
                                ),
                              )
                            }
                          />
                        )}
                        <button
                          type="button"
                          aria-label={`${t("Remove option")} ${index + 1}`}
                          onClick={() =>
                            setOptionRows((rows) => rows.filter((_, i) => i !== index))
                          }
                          className="grid size-11 place-items-center rounded-lg border border-border text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </section>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <CheckField
                      label={t("Track inventory")}
                      checked={draft.trackInventory}
                      onChange={(checked) =>
                        setDraft((current) => ({ ...current, trackInventory: checked }))
                      }
                    />
                    <CheckField
                      label={t("Allow backorder")}
                      checked={draft.allowBackorder}
                      onChange={(checked) =>
                        setDraft((current) => ({ ...current, allowBackorder: checked }))
                      }
                    />
                    <CheckField
                      label={t("Active variant")}
                      checked={draft.isActive}
                      onChange={(checked) =>
                        setDraft((current) => ({ ...current, isActive: checked }))
                      }
                    />
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 text-[11px] font-bold text-slate-600">
                      {t("Variant image")}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="grid size-24 place-items-center overflow-hidden rounded-xl bg-slate-50">
                        {draft.imageUrl ? (
                          <img src={draft.imageUrl} alt="" className="size-full object-contain" />
                        ) : (
                          <ImageIcon className="size-6 text-slate-300" />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            event.currentTarget.value = "";
                            if (!file) return;
                            const session = editorSessionRef.current;
                            void imageEditor
                              .editFile(file, {
                                title: "Adjust variant image",
                                preset: "square",
                                transparent: true,
                                defaultFit: "contain",
                                previewContext: "product",
                              })
                              .then((edited) => {
                                if (edited && session === editorSessionRef.current)
                                  setPendingImageFile(edited);
                              });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled={!editing || uploading}
                          className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {uploading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <UploadCloud className="size-3.5" />
                          )}
                          {editing ? t("Upload / replace") : t("Save variant first")}
                        </button>
                        {editing && draft.imageUrl ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const session = editorSessionRef.current;
                                void imageEditor
                                  .editUrl(draft.imageUrl, {
                                    title: "Adjust existing variant image",
                                    preset: "square",
                                    transparent: true,
                                    defaultFit: "contain",
                                    previewContext: "product",
                                  })
                                  .then((edited) => {
                                    if (!edited || session !== editorSessionRef.current) return;
                                    void upload(
                                      edited,
                                      "Variant image adjustment saved. Storefront refresh requested.",
                                    );
                                  });
                              }}
                              disabled={uploading}
                              className="h-9 rounded-xl border border-indigo-200 px-3 text-[10px] font-bold text-indigo-600 disabled:opacity-50"
                            >
                              {t("Adjust")}
                            </button>
                            <button
                              type="button"
                              onClick={() => void clearImage()}
                              className="h-9 rounded-xl border border-rose-100 px-3 text-[10px] font-bold text-rose-600"
                            >
                              {t("Clear image")}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {pendingImageFile ? (
                      <div className="mt-3 space-y-2">
                        <ImageOptimizationPreview
                          files={[pendingImageFile]}
                          resolution={imageResolution}
                          onResolutionChange={(value) => {
                            setImageResolution(value);
                            setProductImageResolution(value);
                          }}
                          title={t("Variant image compression preview")}
                          compact
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setPendingImageFile(null)}
                            disabled={uploading}
                            className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-bold text-slate-600"
                          >
                            {t("Cancel")}
                          </button>
                          <button
                            type="button"
                            onClick={() => void upload(pendingImageFile)}
                            disabled={uploading}
                            className="h-8 rounded-lg bg-[#5968ea] px-2.5 text-[9px] font-bold text-white disabled:opacity-50"
                          >
                            {t("Confirm & upload")}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {optionError ? (
                    <p role="alert" className="mt-4 text-sm text-destructive">
                      {t(optionError)}
                    </p>
                  ) : null}
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeEditor}
                      className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-bold text-slate-600"
                    >
                      {t("Cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void save()}
                      disabled={saving}
                      className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="size-4 animate-spin" /> : null}{" "}
                      {t("Save variant")}
                    </button>
                  </div>
                </fieldset>
              </div>
            </div>,
            document.body,
          )
        : null}

      <DashboardConfirmDialog
        open={deleteTarget !== null}
        title={t("Delete this variant permanently?")}
        description={
          deleteTarget
            ? `"${deleteTarget.title}" will be permanently removed. The server will reject deletion when protected inventory or order history requires the variant to be preserved.`
            : ""
        }
        confirmLabel="Delete variant"
        pendingLabel="Deleting..."
        pending={deletingVariantId !== null}
        destructive
        onClose={() => {
          if (!deletingVariantId) setDeleteTarget(null);
        }}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  integer = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  integer?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{t(label)}</span>
      <input
        value={value}
        type={type}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        inputMode={type === "number" ? (integer ? "numeric" : "decimal") : undefined}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? (integer ? 1 : "any") : undefined}
        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-indigo-400"
      />
    </label>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { t } = useLanguage();
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-[11px] font-semibold text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {t(label)}
    </label>
  );
}
