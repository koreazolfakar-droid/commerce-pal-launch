import {
  Copy,
  Image as ImageIcon,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import ImageOptimizationPreview from "@/dashboard/components/ImageOptimizationPreview";

import {
  deleteDashboardMediaAsset,
  loadDashboardMediaWorkspace,
  updateDashboardMediaAltText,
  uploadDashboardMediaImage,
  type DashboardMediaAsset,
} from "@/dashboard/data/media";

function bytes(value: number | null) {
  if (!value) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<DashboardMediaAsset[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<DashboardMediaAsset | null>(null);
  const [altText, setAltText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const workspace = await loadDashboardMediaWorkspace();
      setAssets(workspace.assets);
      setCanDelete(workspace.role === "admin");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Media load failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return !needle ? assets : assets.filter((asset) =>
      [asset.fileName, asset.altText, asset.objectPath].join(" ").toLowerCase().includes(needle),
    );
  }, [assets, query]);

  const upload = async (file?: File) => {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const asset = await uploadDashboardMediaImage(file);
      setAssets((current) => [asset, ...current]);
      toast.success("Image uploaded and optimized to WebP.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Media upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      setPendingFile(null);
    }
  };

  const saveAlt = async () => {
    if (!editing) return;
    try {
      const saved = await updateDashboardMediaAltText(editing.id, altText);
      setAssets((current) => current.map((asset) => asset.id === saved.id ? saved : asset));
      setEditing(null);
      toast.success("Alt text updated.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Alt text update failed.");
    }
  };

  const remove = async (asset: DashboardMediaAsset) => {
    if (!canDelete) return toast.error("Only admins can delete media.");
    if (!window.confirm(`Permanently delete "${asset.fileName}"?`)) return;
    try {
      await deleteDashboardMediaAsset(asset);
      setAssets((current) => current.filter((row) => row.id !== asset.id));
      toast.success("Media removed.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Media delete failed.");
    }
  };

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-indigo-500">Management / Supabase Storage</div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">Media library</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">Shared CMS images for Homepage, Hero, SEO, logos and future content surfaces.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600"><RefreshCw className="size-3.5" /> Refresh</button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(event) => {
              setPendingFile(event.target.files?.[0] ?? null);
              event.currentTarget.value = "";
            }}
          />
          <button onClick={()=>fileRef.current?.click()} disabled={uploading} className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white disabled:opacity-50">{uploading?<Loader2 className="size-4 animate-spin" />:<UploadCloud className="size-4" />} Upload image</button>
        </div>
      </div>

      {pendingFile ? (
        <div className="mb-4 space-y-2">
          <ImageOptimizationPreview
            files={[pendingFile]}
            resolution="1920"
            title="Media compression preview"
            compact
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              disabled={uploading}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void upload(pendingFile)}
              disabled={uploading}
              className="h-9 rounded-xl bg-[#5968ea] px-3 text-[10px] font-bold text-white disabled:opacity-50"
            >
              Confirm & upload
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search filename, alt text or path..." className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-[12px] outline-none focus:border-indigo-400" /></div>
        <div className="hidden text-[11px] font-semibold text-slate-400 sm:block">{assets.length} assets</div>
      </div>

      {loading ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="size-6 animate-spin text-indigo-500" /></div>
      ) : filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((asset)=>(
            <div key={asset.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
              <div className="aspect-[4/3] bg-slate-50"><img src={asset.url} alt={asset.altText || asset.fileName} loading="lazy" className="h-full w-full object-contain" /></div>
              <div className="p-4">
                <div className="truncate text-[12px] font-bold text-slate-700">{asset.fileName}</div>
                <div className="mt-1 truncate text-[10px] text-slate-400">{asset.objectPath}</div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400"><span>{asset.mimeType || "image"}</span><span>{bytes(asset.sizeBytes)}</span></div>
                <div className="mt-3 line-clamp-2 min-h-8 text-[10px] leading-4 text-slate-500">{asset.altText || "No alt text"}</div>
                <div className="mt-3 flex gap-1 border-t border-slate-100 pt-3">
                  <button onClick={()=>{void navigator.clipboard.writeText(asset.url);toast.success("Media URL copied.");}} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-50" title="Copy URL"><Copy className="size-3.5" /></button>
                  <button onClick={()=>{setEditing(asset);setAltText(asset.altText);}} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-50" title="Edit alt text"><Pencil className="size-3.5" /></button>
                  {canDelete?<button onClick={()=>void remove(asset)} className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" title="Delete"><Trash2 className="size-3.5" /></button>:null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white text-center"><div><ImageIcon className="mx-auto size-8 text-slate-300" /><div className="mt-3 text-sm font-bold text-slate-600">No media found</div><div className="mt-1 text-xs text-slate-400">Upload the first CMS image or clear the search filter.</div></div></div>
      )}

      {editing ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4" onClick={()=>setEditing(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onClick={(e)=>e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><div className="text-lg font-bold text-slate-800">Image accessibility</div><button onClick={()=>setEditing(null)} className="grid size-8 place-items-center rounded-lg text-slate-400"><X className="size-4" /></button></div>
            <img src={editing.url} alt="" className="mb-4 max-h-44 w-full rounded-xl bg-slate-50 object-contain" />
            <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Alt text</span><textarea value={altText} onChange={(e)=>setAltText(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-[12px] outline-none focus:border-indigo-400" /></label>
            <div className="mt-4 flex justify-end"><button onClick={()=>void saveAlt()} className="h-10 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white">Save alt text</button></div>
          </div>
        </div>
      ):null}
    </div>
  );
}
