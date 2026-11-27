import DashboardLoadError from "@/dashboard/components/DashboardLoadError";
import { useDashboardFormGuard } from "@/dashboard/hooks/useDashboardFormGuard";
import { useDashboardModal } from "@/dashboard/hooks/useDashboardModal";
import { useDashboardUnsavedChanges } from "@/dashboard/hooks/useDashboardUnsavedChanges";
import { useDashboardQueryState } from "@/dashboard/hooks/useDashboardQueryState";
import { useLanguage } from "@/dashboard/i18n";
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
import { useSmartImageEditor } from "@/dashboard/components/SmartImageEditor";
import GlobalLegacyImageOptimizer from "@/dashboard/components/GlobalLegacyImageOptimizer";

import {
  deleteDashboardMediaAsset,
  getDashboardMediaUsage,
  loadDashboardMediaWorkspace,
  updateDashboardMediaAltText,
  uploadDashboardMediaImage,
  replaceDashboardMediaAssetWithWebp,
  type DashboardMediaAsset,
} from "@/dashboard/data/media";

function bytes(value: number | null) {
  if (!value) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export default function MediaLibraryPage() {
  const { t, lang } = useLanguage();
  const [assets, setAssets] = useState<DashboardMediaAsset[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingAlt, setSavingAlt] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useDashboardQueryState<string>("search", "");
  const [editing, setEditing] = useState<DashboardMediaAsset | null>(null);
  const [altText, setAltText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [preparingFile, setPreparingFile] = useState(false);
  const operationLock = useRef(false);
  const loadingRef = useRef(true);
  const loadRequest = useRef(0);
  const mounted = useRef(true);
  const busy = uploading || savingAlt || preparingFile || adjustingId !== null || deletingId !== null;
  const interactionsDisabled = loading || busy || Boolean(loadError);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageEditor = useSmartImageEditor();

  const formGuard = useDashboardFormGuard(Boolean(editing), altText, savingAlt, () =>
    setEditing(null),
  );
  const modalRef = useDashboardModal(formGuard.close, Boolean(editing));
  useDashboardUnsavedChanges(Boolean(pendingFile) || busy);

  const load = useCallback(async () => {
    if (operationLock.current) return;
    const request = ++loadRequest.current;
    loadingRef.current = true;
    setLoading(true);
    setLoadError("");
    try {
      const workspace = await loadDashboardMediaWorkspace();
      if (!mounted.current || request !== loadRequest.current) return;
      setAssets(workspace.assets);
      setCanDelete(workspace.role === "admin");
    } catch (cause) {
      if (mounted.current && request === loadRequest.current) {
        setLoadError(cause instanceof Error ? cause.message : "Media load failed.");
      }
    } finally {
      if (mounted.current && request === loadRequest.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      loadRequest.current += 1;
    };
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return !needle
      ? assets
      : assets.filter((asset) =>
          [asset.fileName, asset.altText, asset.objectPath]
            .join(" ")
            .toLowerCase()
            .includes(needle),
        );
  }, [assets, query]);

  const prepareFile = async (file?: File) => {
    if (!file || pendingFile || operationLock.current || loadingRef.current || loadError) return;
    operationLock.current = true;
    setPreparingFile(true);
    try {
      const edited = await imageEditor.editFile(file, {
        title: "Adjust media image",
        preset: "free",
        transparent: true,
        defaultFit: "contain",
      });
      if (edited && mounted.current) setPendingFile(edited);
    } catch (cause) {
      if (mounted.current) {
        toast.error(cause instanceof Error ? cause.message : t("Image adjustment failed."));
      }
    } finally {
      operationLock.current = false;
      if (mounted.current) setPreparingFile(false);
    }
  };

  const upload = async (file?: File) => {
    if (!file || operationLock.current || loadingRef.current || loadError) return;
    operationLock.current = true;
    setUploading(true);
    try {
      const asset = await uploadDashboardMediaImage(file);
      if (!mounted.current) return;
      setAssets((current) => [asset, ...current.filter((row) => row.id !== asset.id)]);
      setPendingFile(null);
      toast.success(t("Image uploaded and optimized to WebP."));
    } catch (cause) {
      if (mounted.current) {
        toast.error(cause instanceof Error ? cause.message : t("Media upload failed."));
      }
    } finally {
      operationLock.current = false;
      if (mounted.current) {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    }
  };

  const saveAlt = async () => {
    if (!editing || operationLock.current || loadingRef.current || loadError) return;
    operationLock.current = true;
    setSavingAlt(true);
    try {
      const saved = await updateDashboardMediaAltText(editing.id, altText);
      if (!mounted.current) return;
      setAssets((current) => current.map((asset) => (asset.id === saved.id ? saved : asset)));
      formGuard.markSaved();
      setEditing(null);
      toast.success(t("Alt text updated."));
    } catch (cause) {
      if (mounted.current) {
        toast.error(cause instanceof Error ? cause.message : t("Alt text update failed."));
      }
    } finally {
      operationLock.current = false;
      if (mounted.current) setSavingAlt(false);
    }
  };

  const adjustImage = async (asset: DashboardMediaAsset) => {
    if (!canDelete || operationLock.current || loadingRef.current || loadError) return;
    // Lock before opening the editor, rather than only when its output starts uploading.
    operationLock.current = true;
    setAdjustingId(asset.id);
    try {
      const edited = await imageEditor.editUrl(asset.url, {
        title: "Adjust media image",
        preset: "free",
        transparent: true,
        defaultFit: "contain",
        outputFormat: "webp",
      });
      if (!edited || !mounted.current) return;
      const next = await replaceDashboardMediaAssetWithWebp(asset, edited);
      if (!mounted.current) return;
      setAssets((current) => current.map((row) => (row.id === asset.id ? next : row)));
      toast.success(t("Image adjustment saved without changing its media URL."));
    } catch (cause) {
      if (mounted.current) {
        toast.error(cause instanceof Error ? cause.message : t("Image adjustment failed."));
      }
    } finally {
      operationLock.current = false;
      if (mounted.current) setAdjustingId(null);
    }
  };

  const remove = async (asset: DashboardMediaAsset) => {
    if (!canDelete) return toast.error(t("Only admins can delete media."));
    if (operationLock.current || loadingRef.current || loadError) return;
    operationLock.current = true;
    setDeletingId(asset.id);
    try {
      const usage = await getDashboardMediaUsage(asset.id);
      if (!mounted.current) return;
      if (usage.length) {
        toast.error(
          `Image is in use: ${usage.map((row) => `${row.source} (${row.record_id})`).join(", ")}`,
        );
        return;
      }
      if (
        !window.confirm(
          lang === "ar"
            ? `حذف "${asset.fileName}" نهائيًا؟ لم يتم العثور على استخدام للصورة في المحتوى الحالي.`
            : `Permanently delete "${asset.fileName}"? No current content references were found.`,
        )
      )
        return;
      await deleteDashboardMediaAsset(asset);
      if (!mounted.current) return;
      setAssets((current) => current.filter((row) => row.id !== asset.id));
      toast.success(t("Media removed."));
    } catch (cause) {
      if (mounted.current) {
        toast.error(cause instanceof Error ? cause.message : t("Media delete failed."));
      }
    } finally {
      operationLock.current = false;
      if (mounted.current) setDeletingId(null);
    }
  };

  const copyUrl = async (asset: DashboardMediaAsset) => {
    try {
      await navigator.clipboard.writeText(asset.url);
      if (mounted.current) toast.success(t("Media URL copied."));
    } catch {
      if (mounted.current) {
        toast.error(
          lang === "ar"
            ? "تعذّر نسخ الرابط. اسمح للمتصفح بالوصول إلى الحافظة وحاول مجددًا."
            : "Unable to copy the URL. Allow clipboard access in your browser and retry.",
        );
      }
    }
  };

  return (
    <div aria-busy={loading || busy}>
      {loadError && (
        <DashboardLoadError message={loadError} busy={loading} onRetry={() => void load()} />
      )}
      {imageEditor.dialog}
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-indigo-500">
            {lang === "ar" ? "الإدارة / الصور" : "Management / Media"}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("Media library")}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {lang === "ar"
              ? "ارفع صور المتجر، عدّل وصفها البديل وانسخ روابطها لاستخدامها في المحتوى."
              : "Upload store images, edit their alt text and copy links for your content."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || busy}
            className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-[11px] font-bold text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> {t("Refresh")}
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
              void prepareFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={interactionsDisabled || Boolean(pendingFile)}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white disabled:opacity-50"
          >
            {uploading || preparingFile ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UploadCloud className="size-4" />
            )}{" "}
            {t("Upload image")}
          </button>
        </div>
      </div>

      {!loading ? <GlobalLegacyImageOptimizer enabled={canDelete} /> : null}

      {pendingFile ? (
        <div className="mb-4 space-y-2">
          <ImageOptimizationPreview
            files={[pendingFile]}
            resolution="1920"
            title={t("Media compression preview")}
            compact
          />
          <p className="text-xs text-muted-foreground" role="status">
            {lang === "ar"
              ? "الصورة جاهزة للرفع. إذا فشل الرفع تبقى هنا لإعادة المحاولة."
              : "Image ready to upload. If the upload fails, it stays here so you can retry."}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              disabled={busy}
              className="h-9 rounded-xl border border-border bg-card px-3 text-[10px] font-bold text-foreground"
            >
              {t("Cancel")}
            </button>
            <button
              type="button"
              onClick={() => void upload(pendingFile)}
              disabled={interactionsDisabled}
              className="h-9 rounded-xl bg-[#5968ea] px-3 text-[10px] font-bold text-white disabled:opacity-50"
            >
              {t("Confirm & upload")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="relative min-w-[160px] flex-1">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search filename, alt text or path...")}
            aria-label={t("Search filename, alt text or path...")}
            className="h-10 w-full rounded-xl border border-border bg-background ps-9 pe-3 text-[12px] outline-none focus:border-indigo-400"
          />
        </div>
        <div className="shrink-0 text-xs font-semibold text-muted-foreground" role="status">
          {filtered.length} / {assets.length} {t("assets")}
        </div>
        {query.trim() ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="min-h-10 shrink-0 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-muted"
          >
            {lang === "ar" ? "مسح البحث" : "Clear search"}
          </button>
        ) : null}
      </div>

      {loading ? (
        <div role="status" aria-label={t("Loading media...")} className="grid min-h-72 place-items-center rounded-2xl border border-border bg-card">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : loadError && !assets.length ? null : filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((asset) => (
            <div
              key={asset.id}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_24px_rgba(33,47,82,.04)]"
            >
              <div className="aspect-[4/3] bg-muted">
                <img
                  src={asset.url}
                  alt={asset.altText || asset.fileName}
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="p-4">
                <div className="truncate text-[12px] font-bold text-foreground">
                  {asset.fileName}
                </div>
                <div className="mt-1 truncate text-[10px] text-muted-foreground">{asset.objectPath}</div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{asset.mimeType || t("image")}</span>
                  <span>{bytes(asset.sizeBytes)}</span>
                </div>
                <div className="mt-3 line-clamp-2 min-h-8 text-[10px] leading-4 text-muted-foreground">
                  {asset.altText || t("No alt text")}
                </div>
                <div className="mt-3 flex flex-wrap gap-1 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => void copyUrl(asset)}
                    aria-label={`${t("Copy URL")}: ${asset.fileName}`}
                    className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40"
                    title={t("Copy URL")}
                  >
                    <Copy className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={interactionsDisabled}
                    aria-label={`${t("Edit alt text")}: ${asset.fileName}`}
                    onClick={() => {
                      if (operationLock.current || loadingRef.current) return;
                      setEditing(asset);
                      setAltText(asset.altText);
                    }}
                    className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40"
                    title={t("Edit alt text")}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => void adjustImage(asset)}
                      disabled={interactionsDisabled}
                      aria-label={`${t("Adjust image")}: ${asset.fileName}`}
                      className="h-11 rounded-lg px-2 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 disabled:opacity-40"
                      title={t("Adjust image")}
                    >
                      {adjustingId === asset.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        t("Adjust")
                      )}
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => void remove(asset)}
                      disabled={interactionsDisabled}
                      aria-label={`${t("Delete")}: ${asset.fileName}`}
                      className="grid size-11 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-40"
                      title={t("Delete")}
                    >
                      {deletingId === asset.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-border bg-card text-center">
          <div>
            <ImageIcon className="mx-auto size-8 text-slate-300" />
            <div className="mt-3 text-sm font-bold text-foreground">{t("No media found")}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {query.trim()
                ? lang === "ar" ? "غيّر كلمات البحث أو امسح البحث لرؤية جميع الصور." : "Try another search or clear the filter to view all images."
                : t("Upload the first CMS image or clear the search filter.")}
            </div>
          </div>
        </div>
      )}

      {editing ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4"
          onClick={formGuard.close}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("Image accessibility")}
            tabIndex={-1}
            className="w-full max-w-lg rounded-2xl bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="text-lg font-bold text-foreground">{t("Image accessibility")}</div>
              <button
                type="button"
                onClick={formGuard.close}
                disabled={savingAlt}
                aria-label={t("Close")}
                className="grid size-11 place-items-center rounded-lg text-muted-foreground disabled:opacity-40"
              >
                <X className="size-4" />
              </button>
            </div>
            <img
              src={editing.url}
              alt=""
              className="mb-4 max-h-44 w-full rounded-xl bg-muted object-contain"
            />
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold text-foreground">
                {t("Alt text")}
              </span>
              <textarea
                value={altText}
                disabled={savingAlt}
                onChange={(e) => setAltText(e.target.value)}
                rows={3}
                placeholder={lang === "ar" ? "مثال: هاتف iPhone 16 أزرق من الأمام" : "Example: Blue iPhone 16 viewed from the front"}
                className="w-full rounded-xl border border-border bg-background p-3 text-[12px] outline-none focus:border-indigo-400"
              />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              {lang === "ar"
                ? "صِف الصورة باختصار لمستخدمي قارئات الشاشة. لا حاجة لاسم الملف."
                : "Briefly describe the image for screen reader users; the filename is not needed."}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void saveAlt()}
                disabled={savingAlt || !formGuard.dirty}
                className="h-10 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white disabled:opacity-50"
              >
                {savingAlt ? <Loader2 className="me-2 inline size-3.5 animate-spin" /> : null}
                {t("Save alt text")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
