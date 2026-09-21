import { Image as ImageIcon, Loader2, UploadCloud, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ImageOptimizationPreview from "@/dashboard/components/ImageOptimizationPreview";
import { useSmartImageEditor } from "@/dashboard/components/SmartImageEditor";

import {
  loadDashboardMediaWorkspace,
  uploadDashboardMediaImage,
  type DashboardMediaAsset,
} from "@/dashboard/data/media";

export function DashboardMediaPicker({
  value,
  onChange,
  label = "Media",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<DashboardMediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageEditor = useSmartImageEditor();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    loadDashboardMediaWorkspace()
      .then(({ assets: rows }) => {
        if (!cancelled) setAssets(rows);
      })
      .catch((cause) => {
        if (!cancelled) {
          toast.error(cause instanceof Error ? cause.message : "Unable to load media.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const upload = async (file?: File) => {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const asset = await uploadDashboardMediaImage(file, label);
      setAssets((current) => [asset, ...current]);
      onChange(asset.url);
      setOpen(false);
      toast.success("Image uploaded to the CMS media library.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Image upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      setPendingFile(null);
    }
  };

  return (
    <div>
      {imageEditor.dialog}
      <div className="mb-1.5 text-[11px] font-bold text-slate-600">{label}</div>
      <div className="flex gap-3">
        <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {value ? (
            <img src={value} alt="Selected media" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="size-5 text-slate-300" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-600"
          >
            <ImageIcon className="size-3.5" /> Select from library
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              event.currentTarget.value = "";
              if (!file) return;
              void imageEditor.editFile(file, {
                title: `Adjust ${label.toLowerCase()}`,
                preset: "free",
                transparent: false,
                defaultFit: "contain",
              }).then((edited) => {
                if (edited) setPendingFile(edited);
              });
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-slate-200 px-2.5 text-[10px] font-bold text-slate-500 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />}
            Upload new
          </button>
          {value ? (
            <>
              <button
                type="button"
                onClick={() => {
                  void imageEditor.editUrl(value, {
                    title: `Adjust ${label.toLowerCase()}`,
                    preset: "free",
                    transparent: false,
                    defaultFit: "contain",
                  }).then(async (edited) => {
                    if (!edited) return;
                    try {
                      setUploading(true);
                      const asset = await uploadDashboardMediaImage(edited, label);
                      setAssets((current) => [asset, ...current]);
                      onChange(asset.url);
                      toast.success("Adjusted copy saved to the media library.");
                    } catch (cause) {
                      toast.error(cause instanceof Error ? cause.message : "Image adjustment failed.");
                    } finally {
                      setUploading(false);
                    }
                  });
                }}
                disabled={uploading}
                className="text-left text-[10px] font-semibold text-indigo-600 disabled:opacity-50"
              >
                Adjust image
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-left text-[10px] font-semibold text-rose-500"
              >
                Remove image
              </button>
            </>
          ) : null}
        </div>
      </div>

      {pendingFile ? (
        <div className="mt-3 space-y-2">
          <ImageOptimizationPreview
            files={[pendingFile]}
            resolution="1920"
            title="Upload compression preview"
            compact
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              disabled={uploading}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void upload(pendingFile)}
              disabled={uploading}
              className="h-8 rounded-lg bg-[#5968ea] px-2.5 text-[9px] font-bold text-white disabled:opacity-50"
            >
              Confirm & upload
            </button>
          </div>
        </div>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[82dvh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <div className="text-sm font-bold text-[#14203a]">CMS media library</div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Choose an uploaded Space Call asset.
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
            <div className="max-h-[68dvh] overflow-y-auto p-5">
              {loading ? (
                <div className="grid min-h-44 place-items-center">
                  <Loader2 className="size-5 animate-spin text-indigo-500" />
                </div>
              ) : assets.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {assets.map((asset) => (
                    <button
                      type="button"
                      key={asset.id}
                      onClick={() => {
                        onChange(asset.url);
                        setOpen(false);
                      }}
                      className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left hover:border-indigo-400"
                    >
                      <div className="aspect-square overflow-hidden bg-white">
                        <img
                          src={asset.url}
                          alt={asset.altText || asset.fileName}
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="truncate px-2 py-2 text-[10px] font-semibold text-slate-600">
                        {asset.fileName}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-slate-400">
                  No CMS media uploaded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
