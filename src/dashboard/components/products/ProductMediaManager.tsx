import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteDashboardProductImage,
  listDashboardProductImages,
  reorderDashboardProductImages,
  replaceDashboardProductImage,
  setDashboardPrimaryProductImage,
  uploadDashboardProductImage,
  type DashboardProductImage,
} from "@/dashboard/data/catalog";
import {
  PRODUCT_IMAGE_RESOLUTIONS,
  getProductImageResolution,
  inspectProductImageSource,
  setProductImageResolution,
  type ProductImageConversionResult,
  type ProductImageResolution,
  type ProductImageSourceInfo,
} from "@/dashboard/lib/imageProcessing";

export default function ProductMediaManager({
  productId,
  productTitle,
  onPrimaryChange,
}: {
  productId: string;
  productTitle: string;
  onPrimaryChange: (url: string) => void;
}) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<DashboardProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<DashboardProductImage | null>(null);
  const [resolution, setResolution] = useState<ProductImageResolution>(() =>
    getProductImageResolution(),
  );
  const [pendingInfo, setPendingInfo] = useState<ProductImageSourceInfo[]>([]);
  const [lastConversions, setLastConversions] = useState<ProductImageConversionResult[]>([]);
  const [storedMeta, setStoredMeta] = useState<Record<string, { width: number; height: number; bytes?: number }>>({});

  const sync = (rows: DashboardProductImage[]) => {
    setImages(rows);
    const primary = rows.find((image) => image.isPrimary) ?? rows[0];
    onPrimaryChange(primary?.url ?? "");
  };

  const load = async () => {
    setLoading(true);
    try {
      sync(await listDashboardProductImages(productId));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to load product images.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const upload = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    setLastConversions([]);
    try {
      const inspected = await Promise.all(files.map((file) => inspectProductImageSource(file)));
      setPendingInfo(inspected);

      let rows = images;
      const conversions: ProductImageConversionResult[] = [];
      for (const file of files) {
        const result = await uploadDashboardProductImage(productId, file, resolution, productTitle);
        rows = result.images;
        conversions.push(result.conversion);
        setLastConversions([...conversions]);
      }
      sync(rows);
      toast.success(files.length === 1 ? "Image uploaded." : `${files.length} images uploaded.`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Product image upload failed.");
      await load();
    } finally {
      setUploading(false);
      setPendingInfo([]);
    }
  };

  const replace = async (file: File) => {
    if (!replaceTarget) return;
    setBusyId(replaceTarget.id);
    setLastConversions([]);
    try {
      setPendingInfo([await inspectProductImageSource(file)]);
      const result = await replaceDashboardProductImage(replaceTarget, file, resolution);
      sync(result.images);
      setLastConversions([result.conversion]);
      toast.success("Image replaced.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Image replacement failed.");
    } finally {
      setPendingInfo([]);
      setReplaceTarget(null);
      setBusyId(null);
    }
  };

  const remove = async (image: DashboardProductImage) => {
    if (!window.confirm("Delete this image from the product?")) return;
    setBusyId(image.id);
    try {
      sync(await deleteDashboardProductImage(image));
      toast.success("Image deleted.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Image deletion failed.");
    } finally {
      setBusyId(null);
    }
  };

  const makePrimary = async (image: DashboardProductImage) => {
    if (image.isPrimary) return;
    setBusyId(image.id);
    try {
      sync(await setDashboardPrimaryProductImage(productId, image.id));
      toast.success("Primary image updated.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Primary image update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;

    const reordered = [...images];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setImages(reordered);
    setBusyId(images[index].id);

    try {
      sync(await reorderDashboardProductImages(productId, reordered.map((image) => image.id)));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Image order update failed.");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (bytes == null || !Number.isFinite(bytes)) return "Size unavailable";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      images.map(async (image) => {
        try {
          const response = await fetch(image.url, { method: "HEAD" });
          const value = response.headers.get("content-length");
          return [image.id, value ? Number(value) : undefined] as const;
        } catch {
          return [image.id, undefined] as const;
        }
      }),
    ).then((rows) => {
      if (cancelled) return;
      setStoredMeta((current) => {
        const next = { ...current };
        for (const [id, bytes] of rows) {
          const existing = next[id] ?? { width: 0, height: 0 };
          next[id] = { ...existing, ...(bytes ? { bytes } : {}) };
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [images]);

  return (
    <div className="space-y-4 p-5">
      <input
        ref={uploadRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void upload(files);
        }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void replace(file);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-bold text-slate-700">Product gallery</div>
          <div className="mt-1 text-[10px] text-slate-400">
            Uploads are converted to WebP automatically.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5">
            <span className="text-[9px] font-bold text-slate-400">Resolution</span>
            <select
              value={resolution}
              onChange={(event) => {
                const value = event.target.value as ProductImageResolution;
                setResolution(value);
                setProductImageResolution(value);
              }}
              className="bg-transparent text-[10px] font-bold text-slate-600 outline-none"
            >
              {PRODUCT_IMAGE_RESOLUTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            disabled={uploading}
            className="flex h-9 items-center gap-2 rounded-xl bg-[#5968ea] px-3 text-[10px] font-bold text-white disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UploadCloud className="size-3.5" />
            )}
            {uploading ? "Uploading…" : "Upload images"}
          </button>
        </div>
      </div>

      {(pendingInfo.length > 0 || lastConversions.length > 0) && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">
            Real image size
          </div>
          <div className="space-y-2">
            {(lastConversions.length ? lastConversions : pendingInfo.map((source) => ({ source, output: null, file: null }))).map((item, index) => {
              const source = "source" in item ? item.source : item;
              const output = "output" in item ? item.output : null;
              const reduction = output && source.bytes > 0
                ? Math.max(0, Math.round((1 - output.bytes / source.bytes) * 100))
                : null;
              return (
                <div key={`${source.name}-${index}`} className="grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400">Before upload</div>
                    <div className="mt-1 text-[11px] font-bold text-slate-700">
                      {source.width} × {source.height}px
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {formatBytes(source.bytes)} · {source.mimeType.replace("image/", "").toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[.12em] text-[#5968ea]">After upload</div>
                    {output ? (
                      <>
                        <div className="mt-1 text-[11px] font-bold text-slate-700">
                          {output.width} × {output.height}px
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-500">
                          {formatBytes(output.bytes)} · WebP{reduction != null ? ` · ${reduction}% smaller` : ""}
                        </div>
                      </>
                    ) : (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                        <Loader2 className="size-3 animate-spin" /> Converting & uploading…
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid min-h-40 place-items-center rounded-2xl border border-slate-200 bg-slate-50">
          <Loader2 className="size-5 animate-spin text-[#5968ea]" />
        </div>
      ) : images.length ? (
        <div className="grid grid-cols-2 gap-3">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={`overflow-hidden rounded-2xl border bg-white ${
                image.isPrimary
                  ? "border-[#5968ea] ring-4 ring-indigo-50"
                  : "border-slate-200"
              }`}
            >
              <div className="relative aspect-square overflow-hidden bg-white">
                <img
                  src={image.url}
                  alt={image.altText || productTitle}
                  className="h-full w-full object-contain p-3"
                  onLoad={(event) => {
                    const element = event.currentTarget;
                    setStoredMeta((current) => ({
                      ...current,
                      [image.id]: {
                        ...current[image.id],
                        width: element.naturalWidth,
                        height: element.naturalHeight,
                      },
                    }));
                  }}
                />
                {image.isPrimary && (
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-[#5968ea] px-2 py-1 text-[9px] font-bold text-white">
                    <Star className="size-3 fill-current" /> Primary
                  </span>
                )}
                {busyId === image.id && (
                  <span className="absolute inset-0 grid place-items-center bg-white/70">
                    <Loader2 className="size-5 animate-spin text-[#5968ea]" />
                  </span>
                )}
              </div>

              <div className="space-y-2 border-t border-slate-100 p-2.5">
                <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-[9px] font-semibold text-slate-500">
                  Actual: {storedMeta[image.id]?.width ? `${storedMeta[image.id].width} × ${storedMeta[image.id].height}px` : "Reading dimensions…"}
                  {storedMeta[image.id]?.bytes ? ` · ${formatBytes(storedMeta[image.id].bytes)}` : ""}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => void makePrimary(image)}
                    disabled={image.isPrimary || busyId === image.id}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2 text-[9px] font-bold text-slate-600 disabled:opacity-40"
                  >
                    <Star className="size-3" /> Primary
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplaceTarget(image);
                      requestAnimationFrame(() => replaceRef.current?.click());
                    }}
                    disabled={busyId === image.id}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2 text-[9px] font-bold text-slate-600 disabled:opacity-40"
                  >
                    <RefreshCw className="size-3" /> Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(image)}
                    disabled={busyId === image.id}
                    className="grid size-8 place-items-center rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50 disabled:opacity-40"
                    aria-label="Delete image"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-[9px] text-slate-400">Position {index + 1}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => void move(index, -1)}
                      disabled={index === 0 || busyId === image.id}
                      className="grid size-7 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
                      aria-label="Move image left"
                    >
                      <ArrowLeft className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(index, 1)}
                      disabled={index === images.length - 1 || busyId === image.id}
                      className="grid size-7 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
                      aria-label="Move image right"
                    >
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => uploadRef.current?.click()}
          className="grid min-h-44 w-full place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-[#fafbfe] text-center hover:border-indigo-300"
        >
          <span>
            <span className="mx-auto mb-2 grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-500">
              <ImageIcon className="size-5" />
            </span>
            <span className="block text-[11px] font-bold text-slate-600">Upload product images</span>
            <span className="mt-1 block text-[9px] text-slate-400">JPG, PNG, WebP or AVIF</span>
          </span>
        </button>
      )}
    </div>
  );
}
