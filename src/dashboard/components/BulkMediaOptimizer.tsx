import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ImageDown,
  Loader2,
  RefreshCw,
  ShieldCheck,
  WandSparkles,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  downloadDashboardMediaAsset,
  replaceDashboardMediaAssetWithWebp,
  type DashboardMediaAsset,
} from "@/dashboard/data/media";
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

type AnalysisRow = {
  asset: DashboardMediaAsset;
  conversion?: ProductImageConversionResult;
  error?: string;
  status: "ready" | "analyzing" | "done" | "failed";
};

type Props = {
  assets: DashboardMediaAsset[];
  canOptimize: boolean;
  onAssetsChanged: (assets: DashboardMediaAsset[]) => void;
};

function formatMime(value: string) {
  if (!value) return "Unknown";
  return value.replace("image/", "").toUpperCase();
}

export default function BulkMediaOptimizer({
  assets,
  canOptimize,
  onAssetsChanged,
}: Props) {
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState<ProductImageResolution>("1920");
  const [compression, setCompression] = useState<ImageCompressionPreset>(() =>
    getImageCompressionPreset(),
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(assets.map((asset) => asset.id)),
  );
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const selectedAssets = useMemo(
    () => assets.filter((asset) => selected.has(asset.id)),
    [assets, selected],
  );

  const totals = useMemo(() => {
    const conversions = rows.flatMap((row) => (row.conversion ? [row.conversion] : []));
    const before = conversions.reduce((sum, item) => sum + item.source.bytes, 0);
    const after = conversions.reduce((sum, item) => sum + item.output.bytes, 0);
    const reduction = before > 0 ? Math.round((1 - after / before) * 100) : 0;
    return { before, after, reduction, count: conversions.length };
  }, [rows]);

  const setAll = (checked: boolean) => {
    setSelected(checked ? new Set(assets.map((asset) => asset.id)) : new Set());
    setRows([]);
  };

  const toggleOne = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setRows([]);
  };

  const analyze = async () => {
    if (!selectedAssets.length || analyzing || optimizing) return;
    setAnalyzing(true);
    setRows(
      selectedAssets.map((asset) => ({
        asset,
        status: "analyzing",
      })),
    );

    const next: AnalysisRow[] = [];
    for (const asset of selectedAssets) {
      try {
        const source = await downloadDashboardMediaAsset(asset);
        const conversion = await convertProductImageToWebp(source, resolution, compression);
        next.push({ asset, conversion, status: "ready" });
      } catch (cause) {
        next.push({
          asset,
          error: cause instanceof Error ? cause.message : "Unable to analyze image.",
          status: "failed",
        });
      }
      setRows([...next]);
    }
    setAnalyzing(false);
  };

  const optimize = async () => {
    if (!canOptimize) {
      toast.error("Only admins can bulk-optimize media.");
      return;
    }
    const ready = rows.filter((row) => row.status === "ready" && row.conversion);
    if (!ready.length || optimizing) return;

    const confirmed = window.confirm(
      `Convert ${ready.length} selected image${ready.length === 1 ? "" : "s"} to WebP? Existing media URLs will be preserved.`,
    );
    if (!confirmed) return;

    setOptimizing(true);
    const updated = new Map<string, DashboardMediaAsset>();
    const next = [...rows];

    for (let index = 0; index < next.length; index += 1) {
      const row = next[index];
      if (row.status !== "ready" || !row.conversion) continue;

      try {
        const saved = await replaceDashboardMediaAssetWithWebp(row.asset, row.conversion.file);
        updated.set(saved.id, saved);
        next[index] = { ...row, asset: saved, status: "done" };
      } catch (cause) {
        next[index] = {
          ...row,
          status: "failed",
          error: cause instanceof Error ? cause.message : "Optimization failed.",
        };
      }
      setRows([...next]);
    }

    if (updated.size) {
      onAssetsChanged(
        assets.map((asset) => updated.get(asset.id) ?? asset),
      );
      toast.success(`${updated.size} image${updated.size === 1 ? "" : "s"} converted to WebP.`);
    }
    const failures = next.filter((row) => row.status === "failed").length;
    if (failures) toast.error(`${failures} image${failures === 1 ? "" : "s"} could not be converted.`);
    setOptimizing(false);
  };

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <ImageDown className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-black text-slate-800">Bulk WebP optimizer</div>
            <div className="mt-0.5 text-[10px] leading-4 text-slate-500">
              Analyze, compare and convert library images without changing their public URLs.
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700 sm:inline-flex">
            Safe in-place conversion
          </span>
          {open ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
        </div>
      </button>

      {open ? (
        <div className="border-t border-slate-100 p-4">
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
                Encoder quality: {Math.round(imageCompressionQuality(compression) * 100)}%
              </span>
            </label>

            <div className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => void analyze()}
                disabled={!selectedAssets.length || analyzing || optimizing}
                className="flex min-h-14 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-[10px] font-black text-indigo-700 disabled:opacity-50"
              >
                {analyzing ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
                Analyze selected
              </button>
              <button
                type="button"
                onClick={() => void optimize()}
                disabled={!canOptimize || optimizing || !rows.some((row) => row.status === "ready")}
                className="flex min-h-14 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[10px] font-black text-white disabled:opacity-40"
                title={canOptimize ? "Convert analyzed images" : "Admin permission required"}
              >
                {optimizing ? <Loader2 className="size-4 animate-spin" /> : <ImageDown className="size-4" />}
                Convert to WebP
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={assets.length > 0 && selected.size === assets.length}
                  onChange={(event) => setAll(event.target.checked)}
                  className="size-4 rounded border-slate-300"
                />
                Select all ({assets.length})
              </label>
              <span className="text-[10px] text-slate-400">{selectedAssets.length} selected</span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-slate-500">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              Same storage path · metadata updated · automatic rollback on metadata failure
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

          <div className="mt-3 max-h-[460px] overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[920px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="border-b border-slate-200 text-[8px] font-black uppercase tracking-[.1em] text-slate-400">
                  <th className="w-10 px-3 py-2.5">Use</th>
                  <th className="px-3 py-2.5">Image</th>
                  <th className="px-3 py-2.5">Current</th>
                  <th className="px-3 py-2.5">Dimensions</th>
                  <th className="px-3 py-2.5">After</th>
                  <th className="px-3 py-2.5">New dimensions</th>
                  <th className="px-3 py-2.5">Size change</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  const row = rows.find((item) => item.asset.id === asset.id);
                  const conversion = row?.conversion;
                  const saving = conversion && conversion.source.bytes > 0
                    ? Math.round((1 - conversion.output.bytes / conversion.source.bytes) * 100)
                    : null;
                  return (
                    <tr key={asset.id} className="border-b border-slate-100 align-middle last:border-0">
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selected.has(asset.id)}
                          onChange={() => toggleOne(asset.id)}
                          disabled={analyzing || optimizing}
                          className="size-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <img src={asset.url} alt="" loading="lazy" className="size-10 rounded-lg bg-slate-50 object-contain" />
                          <div className="min-w-0">
                            <div className="max-w-[220px] truncate text-[10px] font-bold text-slate-700">{asset.fileName}</div>
                            <div className="max-w-[220px] truncate text-[8px] text-slate-400">{asset.objectPath}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-[10px] font-black text-slate-700">{conversion ? formatMime(conversion.source.mimeType) : formatMime(asset.mimeType)}</div>
                        <div className="mt-0.5 text-[8px] text-slate-400">{formatImageBytes(conversion?.source.bytes ?? asset.sizeBytes ?? 0)}</div>
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
                          <span className={`rounded-full px-2 py-1 text-[9px] font-black ${saving >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
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
                          <span className="inline-flex max-w-[220px] items-center gap-1 text-[9px] font-bold text-rose-600" title={row.error}><XCircle className="size-3 shrink-0" /> <span className="truncate">{row.error}</span></span>
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
              Existing WebP files can also be recompressed or resized. Images are never upscaled beyond their original dimensions.
            </span>
            <button
              type="button"
              onClick={() => {
                setRows([]);
                setSelected(new Set(assets.map((asset) => asset.id)));
              }}
              disabled={analyzing || optimizing}
              className="inline-flex items-center gap-1.5 font-bold text-slate-500"
            >
              <RefreshCw className="size-3" /> Reset analysis
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
