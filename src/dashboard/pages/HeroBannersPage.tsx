import { HeroVisualEditor } from "@/dashboard/components/HeroVisualEditor";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  Save,
  Smartphone,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import ImageOptimizationPreview from "@/dashboard/components/ImageOptimizationPreview";
import { useSmartImageEditor } from "@/dashboard/components/SmartImageEditor";
import {
  createDashboardHeroSlide,
  DashboardHeroVerificationRequiredError,
  DEFAULT_HERO_VISUAL_CONFIG,
  deleteDashboardHeroSlide,
  ensureDashboardHeroSessionReady,
  getHeroScheduleState,
  listDashboardHeroLinkOptions,
  listDashboardHeroMedia,
  listDashboardHeroSlides,
  reorderDashboardHeroSlides,
  updateDashboardHeroSlide,
  uploadDashboardHeroImage,
  type DashboardHeroImageOptimization,
  type DashboardHeroInput,
  type DashboardHeroLinkOption,
  type DashboardHeroMediaAsset,
  type DashboardHeroSlide,
  type HeroAlignment,
  type HeroButtonStyle,
  type HeroContentTheme,
  type HeroImageTarget,
  type HeroTargetType,
  type HeroVisualConfig,
} from "@/dashboard/data/hero";

const EMPTY_FORM: DashboardHeroInput = {
  titleEn: "",
  titleAr: "",
  subtitleEn: "",
  subtitleAr: "",
  eyebrowEn: "",
  eyebrowAr: "",
  imageUrl: "",
  mobileImageUrl: "",
  imageAltEn: "",
  imageAltAr: "",
  mobileImageAltEn: "",
  mobileImageAltAr: "",
  buttonLabelEn: "",
  buttonLabelAr: "",
  targetType: "none",
  targetValue: "",
  secondaryButtonLabelEn: "",
  secondaryButtonLabelAr: "",
  secondaryTargetType: "none",
  secondaryTargetValue: "",
  isPublished: false,
  startsAt: "",
  endsAt: "",
  contentAlignment: "start",
  overlayOpacity: 20,
  buttonStyle: "primary",
  secondaryButtonStyle: "secondary",
  contentTheme: "light",
  openInNewTab: false,
  secondaryOpenInNewTab: false,
  visualConfig: { ...DEFAULT_HERO_VISUAL_CONFIG },
};

function toLocalInputValue(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromSlide(slide: DashboardHeroSlide): DashboardHeroInput {
  return {
    titleEn: slide.titleEn,
    titleAr: slide.titleAr,
    subtitleEn: slide.subtitleEn,
    subtitleAr: slide.subtitleAr,
    eyebrowEn: slide.eyebrowEn,
    eyebrowAr: slide.eyebrowAr,
    imageUrl: slide.imageUrl,
    mobileImageUrl: slide.mobileImageUrl,
    imageAltEn: slide.imageAltEn,
    imageAltAr: slide.imageAltAr,
    mobileImageAltEn: slide.mobileImageAltEn,
    mobileImageAltAr: slide.mobileImageAltAr,
    buttonLabelEn: slide.buttonLabelEn,
    buttonLabelAr: slide.buttonLabelAr,
    targetType: slide.targetType,
    targetValue: slide.targetValue,
    secondaryButtonLabelEn: slide.secondaryButtonLabelEn,
    secondaryButtonLabelAr: slide.secondaryButtonLabelAr,
    secondaryTargetType: slide.secondaryTargetType,
    secondaryTargetValue: slide.secondaryTargetValue,
    isPublished: slide.isPublished,
    startsAt: toLocalInputValue(slide.startsAt),
    endsAt: toLocalInputValue(slide.endsAt),
    contentAlignment: slide.contentAlignment,
    overlayOpacity: slide.overlayOpacity,
    buttonStyle: slide.buttonStyle,
    secondaryButtonStyle: slide.secondaryButtonStyle,
    contentTheme: slide.contentTheme,
    openInNewTab: slide.openInNewTab,
    secondaryOpenInNewTab: slide.secondaryOpenInNewTab,
    visualConfig: { ...slide.visualConfig },
  };
}

function statusBadge(slide: DashboardHeroSlide) {
  const state = getHeroScheduleState(slide);
  if (state === "live") return { label: "Live", className: "bg-emerald-50 text-emerald-700" };
  if (state === "scheduled") return { label: "Scheduled", className: "bg-blue-50 text-blue-700" };
  if (state === "expired") return { label: "Expired", className: "bg-amber-50 text-amber-700" };
  return { label: "Draft", className: "bg-slate-100 text-slate-600" };
}

function targetHref(form: DashboardHeroInput) {
  if (form.targetType === "product" && form.targetValue) return `/product/${form.targetValue}`;
  if (form.targetType === "collection" && form.targetValue) return `/collections/${form.targetValue}`;
  if (form.targetType === "url" && form.targetValue) return form.targetValue;
  return "";
}

function secondaryTargetHref(form: DashboardHeroInput) {
  if (form.secondaryTargetType === "product" && form.secondaryTargetValue) return `/product/${form.secondaryTargetValue}`;
  if (form.secondaryTargetType === "collection" && form.secondaryTargetValue) return `/collections/${form.secondaryTargetValue}`;
  if (form.secondaryTargetType === "url" && form.secondaryTargetValue) return form.secondaryTargetValue;
  return "";
}

function isSafeHeroCustomUrl(value: string) {
  const trimmed = value.trim();
  return /^\/(?!\/)/.test(trimmed) || /^https?:\/\//i.test(trimmed);
}

const HERO_PRESETS: Array<{
  id: string;
  label: string;
  description: string;
  patch: Pick<DashboardHeroInput, "contentTheme" | "overlayOpacity" | "contentAlignment" | "visualConfig">;
}> = [
  {
    id: "minimal",
    label: "Minimal",
    description: "Clean bottom layout",
    patch: {
      contentTheme: "light",
      overlayOpacity: 15,
      contentAlignment: "start",
      visualConfig: { vertical: "bottom", titleSize: "standard", contentWidth: "narrow", buttonRadius: "pill" },
    },
  },
  {
    id: "center",
    label: "Centered",
    description: "Campaign focus",
    patch: {
      contentTheme: "light",
      overlayOpacity: 30,
      contentAlignment: "center",
      visualConfig: { vertical: "center", titleSize: "large", contentWidth: "standard", buttonRadius: "rounded" },
    },
  },
  {
    id: "glass",
    label: "Glass",
    description: "Premium glass panel",
    patch: {
      contentTheme: "glass",
      overlayOpacity: 10,
      contentAlignment: "start",
      visualConfig: { vertical: "bottom", titleSize: "standard", contentWidth: "standard", buttonRadius: "rounded" },
    },
  },
];


function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatImageDimensions(info: DashboardHeroImageOptimization["source"]) {
  return info.width && info.height ? `${info.width} × ${info.height}px` : "Dimensions preserved";
}

function imageFormatLabel(mimeType: string) {
  return mimeType.replace("image/", "").replace("svg+xml", "SVG").toUpperCase();
}

function MediaLibraryModal({
  assets,
  onSelect,
  onClose,
}: {
  assets: DashboardHeroMediaAsset[];
  onSelect: (asset: DashboardHeroMediaAsset) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.16em] text-indigo-500">Supabase Storage</div>
            <div className="mt-1 text-lg font-bold text-[#14203a]">Hero media library</div>
          </div>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-500">
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-5">
          {assets.length ? (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => onSelect(asset)}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:border-indigo-400 hover:shadow-md"
                >
                  <div className="aspect-[4/3] bg-slate-50">
                    <img src={asset.url} alt={asset.altText || asset.fileName} className="size-full object-cover" />
                  </div>
                  <div className="p-3">
                    <div className="truncate text-[10px] font-bold text-slate-700">{asset.fileName}</div>
                    <div className="mt-1 text-[9px] text-slate-400">
                      {asset.sizeBytes ? `${(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB` : "Stored media"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-slate-400">No hero images uploaded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HeroBannersPage() {
  const [slides, setSlides] = useState<DashboardHeroSlide[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<DashboardHeroInput>(EMPTY_FORM);
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [products, setProducts] = useState<DashboardHeroLinkOption[]>([]);
  const [collections, setCollections] = useState<DashboardHeroLinkOption[]>([]);
  const [media, setMedia] = useState<DashboardHeroMediaAsset[]>([]);
  const [mediaTarget, setMediaTarget] = useState<"desktop" | "mobile" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<HeroImageTarget | null>(null);
  const [pendingHeroImages, setPendingHeroImages] = useState<Partial<Record<HeroImageTarget, File>>>({});
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<Partial<Record<HeroImageTarget, string>>>({});
  const [lastOptimizations, setLastOptimizations] = useState<
    Partial<Record<HeroImageTarget, DashboardHeroImageOptimization>>
  >({});
  const desktopFileRef = useRef<HTMLInputElement>(null);
  const mobileFileRef = useRef<HTMLInputElement>(null);
  const imageEditor = useSmartImageEditor();

  const clearPendingHeroImages = useCallback((target?: HeroImageTarget) => {
    setPendingHeroImages((current) => {
      if (!target) return {};
      if (!current[target]) return current;
      const next = { ...current };
      delete next[target];
      return next;
    });
  }, []);

  const handleHeroActionError = useCallback((cause: unknown, fallback: string) => {
    if (cause instanceof DashboardHeroVerificationRequiredError) {
      toast.error(cause.message);
      window.location.assign("/dashboard/login?mode=mfa");
      return;
    }
    toast.error(cause instanceof Error ? cause.message : fallback);
  }, []);

  const selected = useMemo(
    () => slides.find((slide) => slide.id === selectedId) ?? null,
    [selectedId, slides],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await ensureDashboardHeroSessionReady();
      const [nextSlides, links, nextMedia] = await Promise.all([
        listDashboardHeroSlides(),
        listDashboardHeroLinkOptions(),
        listDashboardHeroMedia(),
      ]);
      setSlides(nextSlides);
      setProducts(links.products);
      setCollections(links.collections);
      setMedia(nextMedia);
      setSelectedId((current) => {
        if (current && nextSlides.some((slide) => slide.id === current)) return current;
        return nextSlides[0]?.id ?? null;
      });
      if (!nextSlides.length) setForm(EMPTY_FORM);
    } catch (cause) {
      handleHeroActionError(cause, "Unable to load Hero CMS.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selected) setForm(fromSlide(selected));
  }, [selected]);

  useEffect(() => {
    setLastOptimizations({});
  }, [selectedId]);

  useEffect(() => {
    const next: Partial<Record<HeroImageTarget, string>> = {};
    for (const target of ["desktop", "mobile"] as const) {
      const file = pendingHeroImages[target];
      if (file) next[target] = URL.createObjectURL(file);
    }
    setPendingPreviewUrls(next);
    return () => {
      for (const url of Object.values(next)) URL.revokeObjectURL(url);
    };
  }, [pendingHeroImages]);

  const formDirty = useMemo(() => {
    if (!selected) return JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
    return JSON.stringify(form) !== JSON.stringify(fromSlide(selected));
  }, [form, selected]);
  const hasPendingHeroImages = Boolean(pendingHeroImages.desktop || pendingHeroImages.mobile);
  const dirty = formDirty || hasPendingHeroImages;
  const busy = saving || uploading !== null || imageEditor.isEditing;

  const previewForm = useMemo<DashboardHeroInput>(() => ({
    ...form,
    imageUrl: pendingPreviewUrls.desktop || form.imageUrl,
    mobileImageUrl: pendingPreviewUrls.mobile || form.mobileImageUrl,
  }), [form, pendingPreviewUrls.desktop, pendingPreviewUrls.mobile]);

  const handleVisualEditorChange = useCallback((next: DashboardHeroInput) => {
    setForm((current) => ({
      ...next,
      imageUrl: current.imageUrl,
      mobileImageUrl: current.mobileImageUrl,
    }));
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);

  const newSlide = () => {
    if (busy) {
      toast.info("Wait for the current Hero action to finish first.");
      return;
    }
    if (dirty && !window.confirm("Discard unsaved Hero changes?")) return;
    clearPendingHeroImages();
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setLastOptimizations({});
    setLanguage("en");
  };

  const refresh = async () => {
    if (busy) {
      toast.info("Wait for the current Hero action to finish first.");
      return;
    }
    if (dirty && !window.confirm("Refresh and discard unsaved Hero changes?")) return;
    clearPendingHeroImages();
    setLastOptimizations({});
    await load();
  };

  const save = async () => {
    if (uploading !== null) {
      toast.info("Wait for the image upload to finish before saving.");
      return;
    }
    if (hasPendingHeroImages) {
      toast.error("Upload or cancel the pending Hero image before saving the slide.");
      return;
    }
    if (form.isPublished && !form.imageUrl.trim()) {
      toast.error("Upload a desktop image before publishing.");
      return;
    }
    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) {
      toast.error("End time must be after start time.");
      return;
    }

    const primaryLabel = form.buttonLabelEn.trim() || form.buttonLabelAr.trim();
    if (form.targetType !== "none" && !form.targetValue.trim()) {
      toast.error("Choose a destination for the primary button.");
      return;
    }
    if (form.targetType === "url" && form.targetValue.trim() && !isSafeHeroCustomUrl(form.targetValue)) {
      toast.error("Primary custom URL must be an internal /path or an HTTP(S) URL.");
      return;
    }
    if (form.isPublished && primaryLabel && form.targetType === "none") {
      toast.error("Choose a destination before publishing the primary button.");
      return;
    }
    if (form.isPublished && form.targetType !== "none" && !primaryLabel) {
      toast.error("Add a primary button label before publishing.");
      return;
    }

    const secondaryLabel = form.secondaryButtonLabelEn.trim() || form.secondaryButtonLabelAr.trim();
    if (form.secondaryTargetType !== "none" && !form.secondaryTargetValue.trim()) {
      toast.error("Choose a destination for the secondary button.");
      return;
    }
    if (
      form.secondaryTargetType === "url" &&
      form.secondaryTargetValue.trim() &&
      !isSafeHeroCustomUrl(form.secondaryTargetValue)
    ) {
      toast.error("Secondary custom URL must be an internal /path or an HTTP(S) URL.");
      return;
    }
    if (form.isPublished && secondaryLabel && form.secondaryTargetType === "none") {
      toast.error("Choose a destination before publishing the secondary button.");
      return;
    }
    if (form.isPublished && form.secondaryTargetType !== "none" && !secondaryLabel) {
      toast.error("Add a secondary button label before publishing.");
      return;
    }

    setSaving(true);
    try {
      const saved = selectedId
        ? await updateDashboardHeroSlide(selectedId, form)
        : await createDashboardHeroSlide(form);
      if (!saved) throw new Error("Hero save returned no record.");
      toast.success(selectedId ? "Hero slide saved." : "Hero slide created.");
      await load();
      setSelectedId(saved.id);
      setForm(fromSlide(saved));
    } catch (cause) {
      handleHeroActionError(cause, "Hero save failed.");
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async () => {
    if (!selected) return;
    if (busy) {
      toast.info("Wait for the current Hero action to finish first.");
      return;
    }
    if (dirty) {
      toast.info("Save or discard unsaved Hero changes before duplicating.");
      return;
    }
    setSaving(true);
    try {
      const copy = await createDashboardHeroSlide({
        ...fromSlide(selected),
        titleEn: selected.titleEn ? `${selected.titleEn} Copy` : "Hero Copy",
        isPublished: false,
        startsAt: "",
        endsAt: "",
      });
      if (!copy) throw new Error("Hero duplicate returned no record.");
      await load();
      clearPendingHeroImages();
      setSelectedId(copy.id);
      setForm(fromSlide(copy));
      toast.success("Hero duplicated as draft.");
    } catch (cause) {
      handleHeroActionError(cause, "Duplicate failed.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    if (busy) {
      toast.info("Wait for the current Hero action to finish first.");
      return;
    }
    const message = dirty
      ? "Delete this Hero slide? Unsaved changes will be discarded. Uploaded media stays in Media Library."
      : "Delete this Hero slide? Uploaded media stays in Media Library.";
    if (!window.confirm(message)) return;
    try {
      await deleteDashboardHeroSlide(selected.id);
      clearPendingHeroImages();
      setLastOptimizations({});
      toast.success("Hero slide deleted.");
      await load();
    } catch (cause) {
      handleHeroActionError(cause, "Delete failed.");
    }
  };

  const move = async (direction: -1 | 1) => {
    if (!selected) return;
    if (busy) {
      toast.info("Wait for the current Hero action to finish first.");
      return;
    }
    if (dirty) {
      toast.info("Save or discard unsaved Hero changes before reordering slides.");
      return;
    }
    const ordered = [...slides].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex((slide) => slide.id === selected.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const next = ordered.map((slide, sortOrder) => ({ ...slide, sortOrder }));
    setSlides(next);
    try {
      await reorderDashboardHeroSlides(next.map((slide) => ({ id: slide.id, sortOrder: slide.sortOrder })));
      toast.success("Hero order saved.");
    } catch (cause) {
      handleHeroActionError(cause, "Reorder failed.");
      void load();
    }
  };

  const upload = async (file: File | undefined, target: HeroImageTarget) => {
    if (!file || uploading !== null) return;
    let completed = false;
    setUploading(target);
    try {
      const alt = target === "desktop"
        ? (language === "ar" ? form.imageAltAr : form.imageAltEn)
        : (language === "ar" ? form.mobileImageAltAr : form.mobileImageAltEn);
      const result = await uploadDashboardHeroImage(file, alt, target);
      const { asset, optimization } = result;
      setMedia((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
      setLastOptimizations((current) => ({ ...current, [target]: optimization }));
      setForm((current) =>
        target === "desktop"
          ? { ...current, imageUrl: asset.url }
          : { ...current, mobileImageUrl: asset.url },
      );

      completed = true;
      if (optimization.mode === "webp") {
        toast.success(
          `${target === "desktop" ? "Desktop" : "Mobile"} hero optimized to WebP · ${formatBytes(optimization.source.bytes)} → ${formatBytes(optimization.output.bytes)}.`,
        );
      } else {
        toast.success(
          `${target === "desktop" ? "Desktop" : "Mobile"} hero uploaded in its original format. ${optimization.note}`,
        );
      }
    } catch (cause) {
      handleHeroActionError(cause, "Image upload failed.");
    } finally {
      setUploading(null);
      if (desktopFileRef.current) desktopFileRef.current.value = "";
      if (mobileFileRef.current) mobileFileRef.current.value = "";
      if (completed) clearPendingHeroImages(target);
    }
  };

  const chooseMedia = (asset: DashboardHeroMediaAsset) => {
    if (!mediaTarget || uploading !== null) return;
    const target = mediaTarget;
    clearPendingHeroImages(target);
    setForm((current) =>
      target === "desktop"
        ? { ...current, imageUrl: asset.url }
        : { ...current, mobileImageUrl: asset.url },
    );
    setLastOptimizations((current) => ({ ...current, [target]: undefined }));
    setMediaTarget(null);
  };

  const linkOptions = form.targetType === "product" ? products : form.targetType === "collection" ? collections : [];
  const secondaryLinkOptions = form.secondaryTargetType === "product" ? products : form.secondaryTargetType === "collection" ? collections : [];


  const liveCount = slides.filter((slide) => getHeroScheduleState(slide) === "live").length;
  const scheduledCount = slides.filter((slide) => getHeroScheduleState(slide) === "scheduled").length;

  if (loading && !slides.length) {
    return <div className="grid min-h-[480px] place-items-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="size-6 animate-spin text-[#5968ea]" /></div>;
  }

  return (
    <div>
      {imageEditor.dialog}
      <div className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">Store content / CMS</div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">Hero banners</h1>
          <p className="mt-1.5 text-sm text-slate-500">Control the storefront hero, scheduling, links, responsive images and bilingual content from Supabase.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => window.open("/", "_blank", "noopener,noreferrer")} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600">
            <ExternalLink className="size-3.5" /> View storefront
          </button>
          <button onClick={() => void refresh()} disabled={busy} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600 disabled:opacity-50">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={newSlide} disabled={busy} className="flex h-10 items-center gap-2 rounded-xl bg-[#14203a] px-4 text-[11px] font-bold text-white disabled:opacity-50">
            <Plus className="size-4" /> New slide
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {[
          ["Total slides", slides.length],
          ["Live", liveCount],
          ["Scheduled", scheduledCount],
          ["Media assets", media.length],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-[10px] text-slate-400">{label}</div>
            <div className="mt-1 text-xl font-bold text-[#14203a]">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="text-[12px] font-bold text-[#14203a]">Slides</div>
            <button onClick={newSlide} className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><Plus className="size-4" /></button>
          </div>
          <div className="max-h-[760px] divide-y divide-slate-100 overflow-y-auto">
            {slides.map((slide, index) => {
              const badge = statusBadge(slide);
              return (
                <button
                  key={slide.id}
                  onClick={() => {
                    if (busy) {
                      toast.info("Wait for the current Hero action to finish first.");
                      return;
                    }
                    if (dirty && !window.confirm("Discard unsaved Hero changes?")) return;
                    clearPendingHeroImages();
                    setLastOptimizations({});
                    setSelectedId(slide.id);
                  }}
                  className={`grid w-full grid-cols-[64px_1fr] gap-3 p-3 text-left transition ${selectedId === slide.id ? "bg-indigo-50/70" : "hover:bg-slate-50"}`}
                >
                  <div className="grid h-14 w-16 place-items-center overflow-hidden rounded-xl bg-slate-100">
                    {slide.imageUrl ? <img src={slide.imageUrl} alt="" className="size-full object-cover" /> : <ImageIcon className="size-5 text-slate-300" />}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-bold text-slate-700">{slide.titleEn || slide.titleAr || `Slide ${index + 1}`}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${badge.className}`}>{badge.label}</span>
                      <span className="text-[9px] text-slate-400">#{index + 1}</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {!slides.length ? <div className="px-5 py-12 text-center text-[11px] text-slate-400">No hero slides yet.</div> : null}
          </div>
        </aside>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 text-[13px] font-bold text-[#14203a]">Design & live preview</div>
            <details className="mb-4 rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-xs font-semibold">Advanced appearance / إعدادات المظهر</summary>
            <div className="mb-4 mt-3 grid gap-2 sm:grid-cols-3">
              {HERO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, ...preset.patch, visualConfig: { ...preset.patch.visualConfig } }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-start transition hover:border-indigo-300 hover:bg-indigo-50/50"
                >
                  <span className="block text-[11px] font-bold text-slate-700">{preset.label}</span>
                  <span className="mt-0.5 block text-[9px] text-slate-400">{preset.description}</span>
                </button>
              ))}
            </div>
            <div className="mb-4 grid gap-4 lg:grid-cols-3">
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Content alignment</span>
                <select value={form.contentAlignment} onChange={(e) => setForm((current) => ({ ...current, contentAlignment: e.target.value as HeroAlignment }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px]">
                  <option value="start">Start</option>
                  <option value="center">Center</option>
                  <option value="end">End</option>
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Content theme</span>
                <select value={form.contentTheme} onChange={(e) => setForm((current) => ({ ...current, contentTheme: e.target.value as HeroContentTheme }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px]">
                  <option value="light">Light text</option>
                  <option value="dark">Dark text</option>
                  <option value="glass">Glass panel</option>
                </select>
              </label>
              <label>
                <span className="mb-1.5 flex justify-between text-[11px] font-bold text-slate-600"><span>Overlay opacity</span><span>{form.overlayOpacity}%</span></span>
                <input type="range" min="0" max="90" step="5" value={form.overlayOpacity} onChange={(e) => setForm((current) => ({ ...current, overlayOpacity: Number(e.target.value) }))} className="w-full" />
              </label>
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Vertical position</span>
                <select value={form.visualConfig.vertical} onChange={(e) => setForm((current) => ({ ...current, visualConfig: { ...current.visualConfig, vertical: e.target.value as HeroVisualConfig["vertical"] } }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px]">
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Title size</span>
                <select value={form.visualConfig.titleSize} onChange={(e) => setForm((current) => ({ ...current, visualConfig: { ...current.visualConfig, titleSize: e.target.value as HeroVisualConfig["titleSize"] } }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px]">
                  <option value="compact">Compact</option>
                  <option value="standard">Standard</option>
                  <option value="large">Large</option>
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Content width</span>
                <select value={form.visualConfig.contentWidth} onChange={(e) => setForm((current) => ({ ...current, visualConfig: { ...current.visualConfig, contentWidth: e.target.value as HeroVisualConfig["contentWidth"] } }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px]">
                  <option value="narrow">Narrow</option>
                  <option value="standard">Standard</option>
                  <option value="wide">Wide</option>
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Button shape</span>
                <select value={form.visualConfig.buttonRadius} onChange={(e) => setForm((current) => ({ ...current, visualConfig: { ...current.visualConfig, buttonRadius: e.target.value as HeroVisualConfig["buttonRadius"] } }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px]">
                  <option value="soft">Soft</option>
                  <option value="rounded">Rounded</option>
                  <option value="pill">Pill</option>
                </select>
              </label>
            </div>

            </details>
            <div className="mb-3 flex justify-between gap-2">
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button onClick={() => setPreviewMode("desktop")} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold ${previewMode === "desktop" ? "bg-white shadow-sm" : "text-slate-500"}`}><Monitor className="size-3.5" /> Desktop</button>
                <button onClick={() => setPreviewMode("mobile")} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold ${previewMode === "mobile" ? "bg-white shadow-sm" : "text-slate-500"}`}><Smartphone className="size-3.5" /> Mobile</button>
              </div>
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button onClick={() => setLanguage("en")} className={`rounded-lg px-3 py-2 text-[10px] font-bold ${language === "en" ? "bg-white shadow-sm" : "text-slate-500"}`}>EN</button>
                <button onClick={() => setLanguage("ar")} className={`rounded-lg px-3 py-2 text-[10px] font-bold ${language === "ar" ? "bg-white shadow-sm" : "text-slate-500"}`}>AR</button>
              </div>
            </div>

            <HeroVisualEditor
              key={selectedId ?? "new"}
              form={previewForm}
              onChange={handleVisualEditorChange}
              mode={previewMode}
              language={language}
            />

          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-bold text-[#14203a]">{selected ? "Edit slide" : "Create slide"}</div>
                <div className="mt-0.5 text-[10px] text-slate-400">{selected ? `Last updated ${new Date(selected.updatedAt).toLocaleString()}` : "New draft hero slide"}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selected ? (
                  <>
                    <button aria-label="Move slide up" onClick={() => void move(-1)} disabled={busy || dirty} className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 disabled:opacity-40"><ArrowUp className="size-4" /></button>
                    <button aria-label="Move slide down" onClick={() => void move(1)} disabled={busy || dirty} className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 disabled:opacity-40"><ArrowDown className="size-4" /></button>
                    <button onClick={() => void duplicate()} disabled={busy || dirty} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-600 disabled:opacity-40"><Copy className="size-3.5" /> Duplicate</button>
                    <button onClick={() => void remove()} disabled={busy} className="flex h-9 items-center gap-2 rounded-xl border border-rose-200 px-3 text-[10px] font-bold text-rose-600 disabled:opacity-40"><Trash2 className="size-3.5" /> Delete</button>
                  </>
                ) : null}
                <button onClick={() => void save()} disabled={busy || hasPendingHeroImages || (!formDirty && Boolean(selected))} className="flex h-9 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[10px] font-bold text-white disabled:opacity-40">
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  {selected ? "Save changes" : "Create slide"}
                </button>
              </div>
            </div>

            <div className="mb-5 flex gap-2 rounded-xl bg-slate-100 p-1">
              <button onClick={() => setLanguage("en")} className={`flex-1 rounded-lg px-3 py-2 text-[10px] font-bold ${language === "en" ? "bg-white text-[#14203a] shadow-sm" : "text-slate-500"}`}>English</button>
              <button onClick={() => setLanguage("ar")} className={`flex-1 rounded-lg px-3 py-2 text-[10px] font-bold ${language === "ar" ? "bg-white text-[#14203a] shadow-sm" : "text-slate-500"}`}>العربية</button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Eyebrow text</span>
                <input
                  dir={language === "ar" ? "rtl" : "ltr"}
                  value={language === "ar" ? form.eyebrowAr : form.eyebrowEn}
                  onChange={(e) => setForm((current) => language === "ar" ? { ...current, eyebrowAr: e.target.value } : { ...current, eyebrowEn: e.target.value })}
                  placeholder={language === "ar" ? "مثال: وصل حديثاً" : "e.g. New arrival"}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Title</span>
                <input
                  dir={language === "ar" ? "rtl" : "ltr"}
                  value={language === "ar" ? form.titleAr : form.titleEn}
                  onChange={(e) => setForm((current) => language === "ar" ? { ...current, titleAr: e.target.value } : { ...current, titleEn: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400"
                />
              </label>
              <label className="block lg:col-span-2">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Subtitle</span>
                <textarea
                  dir={language === "ar" ? "rtl" : "ltr"}
                  value={language === "ar" ? form.subtitleAr : form.subtitleEn}
                  onChange={(e) => setForm((current) => language === "ar" ? { ...current, subtitleAr: e.target.value } : { ...current, subtitleEn: e.target.value })}
                  className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-[12px] outline-none focus:border-indigo-400"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Primary button label</span>
                <input
                  dir={language === "ar" ? "rtl" : "ltr"}
                  value={language === "ar" ? form.buttonLabelAr : form.buttonLabelEn}
                  onChange={(e) => setForm((current) => language === "ar" ? { ...current, buttonLabelAr: e.target.value } : { ...current, buttonLabelEn: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Secondary button label</span>
                <input
                  dir={language === "ar" ? "rtl" : "ltr"}
                  value={language === "ar" ? form.secondaryButtonLabelAr : form.secondaryButtonLabelEn}
                  onChange={(e) => setForm((current) => language === "ar" ? { ...current, secondaryButtonLabelAr: e.target.value } : { ...current, secondaryButtonLabelEn: e.target.value })}
                  placeholder={language === "ar" ? "اختياري" : "Optional"}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400"
                />
              </label>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            {(["desktop", "mobile"] as const).map((target) => {
              const isDesktop = target === "desktop";
              const url = isDesktop ? form.imageUrl : form.mobileImageUrl;
              const pendingPreviewUrl = pendingPreviewUrls[target];
              const displayUrl = pendingPreviewUrl || url;
              const alt = isDesktop
                ? (language === "ar" ? form.imageAltAr : form.imageAltEn)
                : (language === "ar" ? form.mobileImageAltAr : form.mobileImageAltEn);
              const optimization = lastOptimizations[target];
              return (
                <div key={target} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[12px] font-bold text-[#14203a]">{isDesktop ? <Monitor className="size-4" /> : <Smartphone className="size-4" />} {isDesktop ? "Desktop image" : "Mobile image"}</div>
                      <div className="mt-1 text-[10px] text-slate-400">{isDesktop ? "Required when published" : "Optional mobile-specific crop"}</div>
                      <div className="mt-1 text-[9px] font-semibold text-emerald-600">
                        JPG / PNG / WebP / AVIF → WebP · max {isDesktop ? "1920" : "1080"}px
                      </div>
                    </div>
                  </div>
                  <div className={`relative mb-3 grid overflow-hidden rounded-xl bg-slate-100 ${isDesktop ? "aspect-[16/9]" : "aspect-[9/16] max-h-72"}`}>
                    {displayUrl ? <img src={displayUrl} alt={alt} className="size-full object-cover" /> : <div className="grid place-items-center"><ImageIcon className="size-7 text-slate-300" /></div>}
                    {pendingPreviewUrl ? (
                      <div className="absolute bottom-2 left-2 rounded-full bg-slate-950/75 px-2.5 py-1 text-[9px] font-bold text-white backdrop-blur">
                        Ready to upload
                      </div>
                    ) : null}
                  </div>
                  <input
                    ref={isDesktop ? desktopFileRef : mobileFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml,image/heic,image/heif"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.currentTarget.value = "";
                      if (!file) return;
                      if (["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
                        void imageEditor.editFile(file, {
                          title: isDesktop ? "Adjust desktop hero" : "Adjust mobile hero",
                          preset: isDesktop ? "hero-desktop" : "hero-mobile",
                          transparent: true,
                          defaultFit: "cover",
                        }).then((edited) => {
                          if (!edited) return;
                          setPendingHeroImages((current) => ({ ...current, [target]: edited }));
                        });
                      } else {
                        void upload(file, target);
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => (isDesktop ? desktopFileRef.current : mobileFileRef.current)?.click()} disabled={uploading !== null} className="flex h-9 items-center gap-2 rounded-xl bg-indigo-50 px-3 text-[10px] font-bold text-indigo-700 disabled:opacity-50">
                      {uploading === target ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />} Upload
                    </button>
                    <button onClick={() => setMediaTarget(target)} disabled={uploading !== null} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-600 disabled:opacity-50">
                      <ImageIcon className="size-3.5" /> Library
                    </button>
                    {url ? (
                      <button
                        type="button"
                        onClick={() => {
                          void imageEditor.editUrl(url, {
                            title: isDesktop ? "Adjust existing desktop hero" : "Adjust existing mobile hero",
                            preset: isDesktop ? "hero-desktop" : "hero-mobile",
                            transparent: true,
                            defaultFit: "cover",
                          }).then((edited) => {
                            if (!edited) return;
                            setPendingHeroImages((current) => ({ ...current, [target]: edited }));
                          });
                        }}
                        disabled={uploading !== null}
                        className="h-9 rounded-xl border border-indigo-200 px-3 text-[10px] font-bold text-indigo-600 disabled:opacity-50"
                      >
                        Adjust
                      </button>
                    ) : null}
                    {url ? (
                      <button
                        type="button"
                        disabled={uploading !== null}
                        onClick={() => {
                          setForm((current) => isDesktop ? { ...current, imageUrl: "" } : { ...current, mobileImageUrl: "" });
                          setLastOptimizations((current) => ({ ...current, [target]: undefined }));
                          setPendingHeroImages((current) => {
                            const next = { ...current };
                            delete next[target];
                            return next;
                          });
                        }}
                        className="h-9 rounded-xl border border-rose-100 px-3 text-[10px] font-bold text-rose-500 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  {pendingHeroImages[target] ? (
                    <div className="mt-3 space-y-2">
                      <ImageOptimizationPreview
                        files={[pendingHeroImages[target]!]}
                        resolution={isDesktop ? "1920" : "1080"}
                        title={isDesktop ? "Desktop hero compression preview" : "Mobile hero compression preview"}
                        compact
                        busy={uploading === target}
                        confirmLabel={isDesktop ? "Upload desktop hero" : "Upload mobile hero"}
                        onConfirm={() => void upload(pendingHeroImages[target], target)}
                        onCancel={() => clearPendingHeroImages(target)}
                      />
                    </div>
                  ) : null}

                  {optimization ? (
                    <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-emerald-700">
                          {optimization.mode === "webp" ? "Real WebP optimization complete" : "Original format preserved"}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold text-slate-500">
                          {imageFormatLabel(optimization.output.mimeType)}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-2 text-[9px] text-slate-600 sm:grid-cols-2">
                        <div className="rounded-lg bg-white/80 p-2">
                          <span className="block font-bold text-slate-400">Before</span>
                          <span className="mt-0.5 block font-semibold">
                            {formatImageDimensions(optimization.source)} · {formatBytes(optimization.source.bytes)} · {imageFormatLabel(optimization.source.mimeType)}
                          </span>
                        </div>
                        <div className="rounded-lg bg-white/80 p-2">
                          <span className="block font-bold text-slate-400">After</span>
                          <span className="mt-0.5 block font-semibold">
                            {formatImageDimensions(optimization.output)} · {formatBytes(optimization.output.bytes)} · {imageFormatLabel(optimization.output.mimeType)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-[9px] font-medium text-emerald-700">{optimization.note}</div>
                    </div>
                  ) : null}
                  <label className="mt-3 block">
                    <span className="mb-1.5 block text-[10px] font-bold text-slate-500">Alt text ({language.toUpperCase()})</span>
                    <input
                      value={alt}
                      disabled={uploading === target}
                      onChange={(e) => setForm((current) => {
                        if (isDesktop) return language === "ar" ? { ...current, imageAltAr: e.target.value } : { ...current, imageAltEn: e.target.value };
                        return language === "ar" ? { ...current, mobileImageAltAr: e.target.value } : { ...current, mobileImageAltEn: e.target.value };
                      })}
                      className="h-9 w-full rounded-xl border border-slate-200 px-3 text-[11px] disabled:bg-slate-50 disabled:opacity-60"
                    />
                  </label>
                </div>
              );
            })}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 text-[13px] font-bold text-[#14203a]">Link & CTA</div>
            <div className="grid gap-4 lg:grid-cols-3">
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Target type</span>
                <select value={form.targetType} onChange={(e) => setForm((current) => ({ ...current, targetType: e.target.value as HeroTargetType, targetValue: "" }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px]">
                  <option value="none">No link</option>
                  <option value="product">Product</option>
                  <option value="collection">Collection</option>
                  <option value="url">Custom URL</option>
                </select>
              </label>
              <label className="lg:col-span-2">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Destination</span>
                {form.targetType === "product" || form.targetType === "collection" ? (
                  <select value={form.targetValue} onChange={(e) => setForm((current) => ({ ...current, targetValue: e.target.value }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px]">
                    <option value="">Choose {form.targetType}</option>
                    {linkOptions.map((option) => <option key={option.id} value={option.value} disabled={option.status !== "active"}>{option.label} · {option.status}</option>)}
                  </select>
                ) : (
                  <input value={form.targetValue} onChange={(e) => setForm((current) => ({ ...current, targetValue: e.target.value }))} disabled={form.targetType === "none"} placeholder="/shop or https://..." className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[11px] disabled:bg-slate-50" />
                )}
              </label>
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Button style</span>
                <select value={form.buttonStyle} onChange={(e) => setForm((current) => ({ ...current, buttonStyle: e.target.value as HeroButtonStyle }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px]">
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              <label className="flex items-center gap-2 self-end rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-[11px] font-semibold text-slate-600">
                <input type="checkbox" checked={form.openInNewTab} onChange={(e) => setForm((current) => ({ ...current, openInNewTab: e.target.checked }))} />
                Open in new tab
              </label>
              <div className="self-end rounded-xl bg-slate-50 px-3 py-3 text-[10px] text-slate-500">Resolved path: {targetHref(form) || "No destination"}</div>
            </div>

            <div className="my-5 border-t border-slate-100" />
            <div className="mb-3 text-[11px] font-bold text-slate-500">Secondary CTA (optional)</div>
            <div className="grid gap-4 lg:grid-cols-3">
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Target type</span>
                <select value={form.secondaryTargetType} onChange={(e) => setForm((current) => ({ ...current, secondaryTargetType: e.target.value as HeroTargetType, secondaryTargetValue: "" }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px]">
                  <option value="none">No second button</option>
                  <option value="product">Product</option>
                  <option value="collection">Collection</option>
                  <option value="url">Custom URL</option>
                </select>
              </label>
              <label className="lg:col-span-2">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Destination</span>
                {form.secondaryTargetType === "product" || form.secondaryTargetType === "collection" ? (
                  <select value={form.secondaryTargetValue} onChange={(e) => setForm((current) => ({ ...current, secondaryTargetValue: e.target.value }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px]">
                    <option value="">Choose {form.secondaryTargetType}</option>
                    {secondaryLinkOptions.map((option) => <option key={option.id} value={option.value} disabled={option.status !== "active"}>{option.label} · {option.status}</option>)}
                  </select>
                ) : (
                  <input value={form.secondaryTargetValue} onChange={(e) => setForm((current) => ({ ...current, secondaryTargetValue: e.target.value }))} disabled={form.secondaryTargetType === "none"} placeholder="/shop or https://..." className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[11px] disabled:bg-slate-50" />
                )}
              </label>
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Button style</span>
                <select value={form.secondaryButtonStyle} onChange={(e) => setForm((current) => ({ ...current, secondaryButtonStyle: e.target.value as HeroButtonStyle }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px]">
                  <option value="secondary">Secondary</option>
                  <option value="primary">Primary</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              <label className="flex items-center gap-2 self-end rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-[11px] font-semibold text-slate-600">
                <input type="checkbox" checked={form.secondaryOpenInNewTab} onChange={(e) => setForm((current) => ({ ...current, secondaryOpenInNewTab: e.target.checked }))} />
                Open in new tab
              </label>
              <div className="self-end rounded-xl bg-slate-50 px-3 py-3 text-[10px] text-slate-500">Resolved path: {secondaryTargetHref(form) || "No destination"}</div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 text-[13px] font-bold text-[#14203a]">Publishing & schedule</div>
            <div className="grid gap-4 lg:grid-cols-3">
              <label className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((current) => ({ ...current, isPublished: e.target.checked }))} />
                <span><span className="block text-[11px] font-bold text-slate-700">Published</span><span className="text-[9px] text-slate-400">Subject to schedule dates</span></span>
              </label>
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Starts at</span>
                <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((current) => ({ ...current, startsAt: e.target.value }))} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[11px]" />
              </label>
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Ends at</span>
                <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm((current) => ({ ...current, endsAt: e.target.value }))} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[11px]" />
              </label>
            </div>
          </section>


        </div>
      </div>

      {dirty ? (
        <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-1/2 z-50 flex w-[calc(100%-24px)] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl lg:bottom-5 lg:w-auto lg:max-w-none">
          <span className="text-[11px] font-semibold text-slate-600">
            {hasPendingHeroImages ? "Hero image ready to upload" : "Unsaved Hero changes"}
          </span>
          <button onClick={() => void save()} disabled={busy || hasPendingHeroImages} className="rounded-lg bg-[#5968ea] px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">Save</button>
        </div>
      ) : null}

      {mediaTarget ? <MediaLibraryModal assets={media} onSelect={chooseMedia} onClose={() => setMediaTarget(null)} /> : null}
    </div>
  );
}

