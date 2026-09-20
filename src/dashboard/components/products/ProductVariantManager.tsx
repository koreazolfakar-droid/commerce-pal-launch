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
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ImageOptimizationPreview from "@/dashboard/components/ImageOptimizationPreview";
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

function optionText(
  options: Record<string, DashboardVariantOptionValue>,
  keys: string[],
) {
  for (const key of keys) {
    const value = options[key];
    if (typeof value === "string" || typeof value === "number") return String(value);
  }
  return "";
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
    title: draft.title.trim() || [draft.color, draft.storage].filter(Boolean).join(" / ") || "Default",
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
  const [variants, setVariants] = useState<DashboardProductVariant[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imageResolution, setImageResolution] = useState<ProductImageResolution>(() => getProductImageResolution());
  const [editing, setEditing] = useState<DashboardProductVariant | null>(null);
  const [draft, setDraft] = useState<VariantDraft>(EMPTY_DRAFT);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const publishState = useCallback(
    (next: DashboardProductVariant[]) => {
      setVariants(next);
      onCountChange?.(next.length);
      onSingleVariantChange?.(next.length === 1 ? next[0] : null);
    },
    [onCountChange, onSingleVariantChange],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const workspace = await loadDashboardProductVariants(productId);
      publishState(workspace.variants);
      setCanDelete(workspace.role === "admin");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to load variants.");
    } finally {
      setLoading(false);
    }
  }, [productId, publishState]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...EMPTY_DRAFT, sortOrder: variants.length * 10 });
    setOpen(true);
  };

  const openEdit = (variant: DashboardProductVariant) => {
    setEditing(variant);
    setDraft(draftFromVariant(variant));
    setOpen(true);
  };

  const save = async () => {
    if (saving) return;
    let input: DashboardProductVariantInput;
    try {
      input = buildInput(draft);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Invalid variant.");
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
      if (!editing) setOpen(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Variant save failed.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (variant: DashboardProductVariant) => {
    if (!canDelete) return toast.error("Only admins can permanently delete variants.");
    if (!window.confirm(`Permanently delete variant "${variant.title}"?`)) return;
    try {
      await deleteDashboardProductVariant(variant.id);
      const next = variants.filter((row) => row.id !== variant.id);
      publishState(next);
      toast.success("Variant deleted.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Variant delete failed.");
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

  const upload = async (file?: File) => {
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
      const next = variants.map((row) =>
        row.id === editing.id ? { ...row, imageUrl: "" } : row,
      );
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
      <div className="grid min-h-36 place-items-center">
        <Loader2 className="size-5 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="px-5 py-5">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="text-[12px] font-bold text-slate-700">
            {variants.length} variant{variants.length === 1 ? "" : "s"}
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            Stock changes are recorded in inventory history automatically.
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex h-9 items-center justify-center gap-2 rounded-xl bg-indigo-50 px-3 text-[10px] font-bold text-indigo-700"
        >
          <Plus className="size-3.5" /> Add variant
        </button>
      </div>

      <div className="space-y-2">
        {variants.map((variant, index) => {
          const color = optionText(variant.options, ["color", "Color", "colour"]);
          const storage = optionText(variant.options, ["storage", "Storage", "capacity", "Capacity"]);
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
                  <div className="truncate text-[12px] font-bold text-slate-700">{variant.title}</div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      variant.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {variant.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
                  {color ? <span>Color: {color}</span> : null}
                  {storage ? <span>Storage: {storage}</span> : null}
                  <span>SKU: {variant.sku || "—"}</span>
                  <span>Stock: {variant.stock}</span>
                  <span>{formatMoney(variant.price)}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => void move(variant, -1)}
                  disabled={index === 0}
                  className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 disabled:opacity-25"
                  aria-label="Move variant up"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void move(variant, 1)}
                  disabled={index === variants.length - 1}
                  className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 disabled:opacity-25"
                  aria-label="Move variant down"
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
                    onClick={() => void remove(variant)}
                    className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"
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
            No variants yet. Add one or save the product pricing fields to create a default variant.
          </div>
        ) : null}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/40 p-4 sm:p-8"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-slate-800">
                  {editing ? "Edit variant" : "Add variant"}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Color, storage, identifiers, price, stock and image are stored on the real variant row.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Variant title" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
              <Field label="Color" value={draft.color} onChange={(value) => setDraft((current) => ({ ...current, color: value }))} placeholder="e.g. Black" />
              <Field label="Storage / capacity" value={draft.storage} onChange={(value) => setDraft((current) => ({ ...current, storage: value }))} placeholder="e.g. 256GB" />
              <Field label="SKU" value={draft.sku} onChange={(value) => setDraft((current) => ({ ...current, sku: value }))} />
              <Field label="Barcode" value={draft.barcode} onChange={(value) => setDraft((current) => ({ ...current, barcode: value }))} />
              <Field label="Price" type="number" value={draft.price} onChange={(value) => setDraft((current) => ({ ...current, price: value }))} />
              <Field label="Compare-at price" type="number" value={draft.compareAt} onChange={(value) => setDraft((current) => ({ ...current, compareAt: value }))} />
              <Field label="Stock" type="number" value={draft.stock} onChange={(value) => setDraft((current) => ({ ...current, stock: value }))} />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <CheckField label="Track inventory" checked={draft.trackInventory} onChange={(checked) => setDraft((current) => ({ ...current, trackInventory: checked }))} />
              <CheckField label="Allow backorder" checked={draft.allowBackorder} onChange={(checked) => setDraft((current) => ({ ...current, allowBackorder: checked }))} />
              <CheckField label="Active variant" checked={draft.isActive} onChange={(checked) => setDraft((current) => ({ ...current, isActive: checked }))} />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 text-[11px] font-bold text-slate-600">Variant image</div>
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
                      setPendingImageFile(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={!editing || uploading}
                    className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />}
                    {editing ? "Upload / replace" : "Save variant first"}
                  </button>
                  {editing && draft.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => void clearImage()}
                      className="h-9 rounded-xl border border-rose-100 px-3 text-[10px] font-bold text-rose-600"
                    >
                      Clear image
                    </button>
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
                    title="Variant image compression preview"
                    compact
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingImageFile(null)}
                      disabled={uploading}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-bold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void upload(pendingImageFile)}
                      disabled={uploading}
                      className="h-8 rounded-lg bg-[#5968ea] px-2.5 text-[9px] font-bold text-white disabled:opacity-50"
                    >
                      Confirm & upload
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Save variant
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}</span>
      <input
        value={value}
        type={type}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400"
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
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-[11px] font-semibold text-slate-600">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}
