import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Images,
  Loader2,
  RefreshCw,
  ShieldCheck,
  WandSparkles,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  downloadGlobalLegacyImage,
  loadGlobalLegacyImageAssets,
  replaceGlobalLegacyImageWithWebp,
  type GlobalImageSource,
  type GlobalLegacyImageAsset,
} from "@/dashboard/data/globalImageOptimizer";
import {
  IMAGE_COMPRESSION_PRESETS,
  PRODUCT_IMAGE_RESOLUTIONS,
  convertProductImageToWebp,
  formatImageBytes,
  getImageCompressionPreset,
  imageCompressionQuality,
  setImageCompressionPreset,
  type ImageCompressionPreset,
  type ProductImageConversionResult,
  type ProductImageResolution,
} from "@/dashboard/lib/imageProcessing";

type Row = {
  asset: GlobalLegacyImageAsset;
  conversion?: ProductImageConversionResult;
  error?: string;
  status: "analyzing" | "ready" | "done" | "failed";
};

const SOURCE_LABELS: Record<GlobalImageSource | "all", string> = {
  all: "All",
  product: "Products",
  brand: "Brands",
  category: "Categories",
  hero: "Hero",
  media: "Media library",
};

function formatMime(value: string) {
  if (!value) return "Unknown";
  return value.replace("image/", "").toUpperCase();
}

export default function GlobalLegacyImageOptimizer({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<GlobalLegacyImageAsset[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<GlobalImageSource | "all">("all");
  const [resolution, setResolution] = useState<ProductImageResolution>("1920");
  const [compression, setCompression] = useState<ImageCompressionPreset>(() =>
    getImageCompressionPreset(),
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const visibleAssets = useMemo(
    () => (filter === "all" ? assets : assets.filter((asset) => asset.source === filter)),
    [assets, filter],
  );
  const selectedAssets = useMemo(
    () => assets.filter((asset) => selected.has(asset.key)),
    [assets, selected],
  );

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: assets.length };
    for (const item of assets) counts[item.source] = (counts[item.source] ?? 0) + 1;
    return counts;
  }, [assets]);

  const totals = useMemo(() => {
    const conversions = rows.flatMap((row) => (row.conversion ? [row.conversion] : []));
    const before = conversions.reduce((sum, item) => sum + item.source.bytes, 0);
    const after = conversions.reduce((sum, item) => sum + item.output.bytes, 0);
    const reduction = before > 0 ? Math.round((1 - after / before) * 100) : 0;
    return { before, after, reduction, count: conversions.length };
  }, [rows]);

  const load = async () => {
    if (!enabled || loading || optimizing) return;
    setLoading(true);
    try {
      const next = await loadGlobalLegacyImageAssets();
      setAssets(next);
      setSelected(new Set(next.map((asset) => asset.key)));
      setRows([]);
      toast.success(`Found ${next.length} image reference${next.length === 1 ? "" : "s"} across the dashboard.`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Global image scan failed.");
    } finally {
      setLoading(false);
    }
  };

  const toggleVisible = (checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const item of visibleAssets) {
        if (checked) next.add(item.key);
        else next.delete(item.key);
      }
      return next;
    });
    setRows([]);
  };

  const analyze = async () => {
    if (!selectedAssets.length || analyzing || optimizing) return;
    setAnalyzing(true);
    const initial = selectedAssets.map<Row>((asset) => ({ asset, status: "analyzing" }));
    setRows(initial);

    const next: Row[] = [];
    for (const item of selectedAssets) {
      try {
        const file = await downloadGlobalLegacyImage(item);
        const conversion = await convertProductImageToWebp(file, resolution, compression);
        next.push({ asset: item, conversion, status: "ready" });
      } catch (cause) {
        next.push({
          asset: item,
          status: "failed",
          error: cause instanceof Error ? cause.message : "Unable to analyze this image.",
        });
      }
      setRows([...next]);
    }
    setAnalyzing(false);
  };

  const optimize = async () => {
    const ready = rows.filter((row) => row.status === "ready" && row.conversion);
    if (!ready.length || optimizing) return;
    const confirmed = window.confirm(
      `Convert ${ready.length} analyzed image reference${ready.length === 1 ? "" : "s"} to WebP and update their database references? Existing source files are kept for safety.`,
    );
    if (!confirmed) return;

    setOptimizing(true);
    const next = [...rows];
    const savedByKey = new Map<string, GlobalLegacyImageAsset>();

    for (let index = 0; index < next.length; index += 1) {
      const row = next[index];
      if (row.status !== "ready" || !row.conversion) continue;
      try {
        const saved = await replaceGlobalLegacyImageWithWebp(row.asset, row.conversion.file);
        savedByKey.set(saved.key, saved);
        next[index] = { ...row, asset: saved, status: "done" };
      } catch (cause) {
        next[index] = {
          ...row,
          status: "failed",
          error: cause instanceof Error ? cause.message : "Conversion failed.",
        };
      }
      setRows([...next]);
    }

    if (savedByKey.size) {
      setAssets((current) => current.map((item) => savedByKey.get(item.key) ?? item));
      toast.success(`${savedByKey.size} old image reference${savedByKey.size === 1 ? "" : "s"} optimized.`);
    }
    const failed = next.filter((row) => row.status === "failed").length;
    if (failed) toast.error(`${failed} image${failed === 1 ? "" : "s"} need manual review.`);
    setOptimizing(false);
  };

  if (!enabled) return null;

  const allVisibleSelected =
    visibleAssets.length > 0 && visibleAssets.every((asset) => selected.has(asset.key));

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-[0_10px_30px_rgba(33,47,82,.06)]">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open && !assets.length) void load();
        }}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <Images className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-black text-slate-800">Global old-image WebP optimizer</div>
            <div className="mt-0.5 text-[10px] leading-4 text-slate-500">
              Products, brands, categories, hero and media library in one scan.
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700 sm:inline-flex">
            Admin · safe migration
          </span>
          {open ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
        </div>
      </button>

      {open ? (
        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {(Object.keys(SOURCE_LABELS) as Array<GlobalImageSource | "all">).map((source) => (
              <button
                key={source}
                type="button"
                onClick={() => setFilter(source)}
                className={
                  "rounded-full px-3 py-1.5 text-[9px] font-black transition " +
                  (filter === source
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-500")
                }
              >
                {SOURCE_LABELS[source]} · {sourceCounts[source] ?? 0}
              </button>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
            <label className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
              <span className="block text-[8px] font-black uppercase tracking-[.12em] text-slate-400">Max resolution</span>
              <select
                value={resolution}
                onChange={(event) => {
                  setResolution(event.target.value as ProductImageResolution);
                  setRows([]);
                }}
                className="mt-1 w-full bg-transparent text-[11px] font-bold text-slate-700 outline-none"
              >
                {PRODUCT_IMAGE_RESOLUTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
              <span className="block text-[8px] font-black uppercase tracking-[.12em] text-slate-400">WebP quality</span>
              <select
                value={compression}
                onChange={(event) => {
                  const value = event.target.value as ImageCompressionPreset;
                  setCompression(value);
                  setImageCompressionPreset(value);
                  setRows([]);
                }}
                className="mt-1 w-full bg-transparent text-[11px] font-bold text-slate-700 outline-none"
              >
                {IMAGE_COMPRESSION_PRESETS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <span className="mt-1 block text-[8px] text-slate-400">
                Encoder quality {Math.round(imageCompressionQuality(compression) * 100)}%
              </span>
            </label>

            <div className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => void analyze()}
                disabled={!selectedAssets.length || analyzing || optimizing || loading}
                className="flex min-h-14 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-[10px] font-black text-indigo-700 disabled:opacity-50"
              >
                {analyzing ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
                Analyze selected
              </button>
              <button
                type="button"
                onClick={() => void optimize()}
                disabled={optimizing || !rows.some((row) => row.status === "ready")}
                className="flex min-h-14 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[10px] font-black text-white disabled:opacity-40"
              >
                {optimizing ? <Loader2 className="size-4 animate-spin" /> : <Images className="size-4" />}
                Convert all ready
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) => toggleVisible(event.target.checked)}
                  className="size-4 rounded border-slate-300"
                />
                Select visible ({visibleAssets.length})
              </label>
              <span className="text-[10px] text-slate-400">{selectedAssets.length} total selected</span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-slate-500">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              Database reference changes only after WebP upload succeeds
            </div>
          </div>

          {totals.count ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              {[
                ["Analyzed", String(totals.count)],
                ["Before", formatImageBytes(totals.before)],
                ["After", formatImageBytes(totals.after)],
                ["Estimated saving", `${totals.reduction}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-900 px-3 py-2.5 text-white">
                  <div className="text-[8px] font-black uppercase tracking-[.12em] text-slate-400">{label}</div>
                  <div className="mt-1 text-[12px] font-black">{value}</div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-3 max-h-[520px] overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="border-b border-slate-200 text-[8px] font-black uppercase tracking-[.1em] text-slate-400">
                  <th className="w-10 px-3 py-2.5">Use</th>
                  <th className="px-3 py-2.5">Source</th>
                  <th className="px-3 py-2.5">Image</th>
                  <th className="px-3 py-2.5">Current</th>
                  <th className="px-3 py-2.5">Current resolution</th>
                  <th className="px-3 py-2.5">After</th>
                  <th className="px-3 py-2.5">New resolution</th>
                  <th className="px-3 py-2.5">Change</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleAssets.map((item) => {
                  const row = rows.find((candidate) => candidate.asset.key === item.key);
                  const conversion = row?.conversion;
                  const saving =
                    conversion && conversion.source.bytes > 0
                      ? Math.round((1 - conversion.output.bytes / conversion.source.bytes) * 100)
                      : null;
                  return (
                    <tr key={item.key} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selected.has(item.key)}
                          disabled={analyzing || optimizing}
                          onChange={() => {
                            setSelected((current) => {
                              const next = new Set(current);
                              if (next.has(item.key)) next.delete(item.key);
                              else next.add(item.key);
                              return next;
                            });
                            setRows([]);
                          }}
                          className="size-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[8px] font-black uppercase text-slate-600">
                          {SOURCE_LABELS[item.source]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <img src={item.url} alt="" loading="lazy" className="size-10 rounded-lg bg-slate-50 object-contain" />
                          <div className="min-w-0">
                            <div className="max-w-[220px] truncate text-[10px] font-bold text-slate-700">{item.label}</div>
                            <div className="max-w-[220px] truncate text-[8px] text-slate-400">{item.fileName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-[10px] font-black text-slate-700">
                          {conversion ? formatMime(conversion.source.mimeType) : formatMime(item.mimeType)}
                        </div>
                        <div className="mt-0.5 text-[8px] text-slate-400">
                          {conversion ? formatImageBytes(conversion.source.bytes) : item.sizeBytes ? formatImageBytes(item.sizeBytes) : "Analyze for size"}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[10px] font-semibold text-slate-600">
                        {conversion ? `${conversion.source.width} × ${conversion.source.height}` : "Analyze to inspect"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-[10px] font-black text-emerald-700">{conversion ? "WEBP" : "—"}</div>
                        <div className="mt-0.5 text-[8px] text-slate-400">{conversion ? formatImageBytes(conversion.output.bytes) : "—"}</div>
                      </td>
                      <td className="px-3 py-2.5 text-[10px] font-semibold text-slate-600">
                        {conversion ? `${conversion.output.width} × ${conversion.output.height}` : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {saving !== null ? (
                          <span className={
                            "rounded-full px-2 py-1 text-[9px] font-black " +
                            (saving >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")
                          }>
                            {saving >= 0 ? `${saving}% smaller` : `${Math.abs(saving)}% larger`}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {row?.status === "analyzing" ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600"><Loader2 className="size-3 animate-spin" /> Analyzing</span>
                        ) : row?.status === "ready" ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700"><Check className="size-3" /> Ready</span>
                        ) : row?.status === "done" ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700"><CheckCircle2 className="size-3" /> Converted</span>
                        ) : row?.status === "failed" ? (
                          <span className="inline-flex max-w-[230px] items-center gap-1 text-[9px] font-bold text-rose-600" title={row.error}>
                            <XCircle className="size-3 shrink-0" /><span className="truncate">{row.error}</span>
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400">Not analyzed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] leading-4 text-slate-400">
            <span>
              JPG, PNG, AVIF and existing WebP are supported. GIF, SVG and HEIC/HEIF are skipped for manual review.
            </span>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading || analyzing || optimizing}
              className="inline-flex items-center gap-1.5 font-bold text-slate-500"
            >
              {loading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
              Rescan all sources
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
