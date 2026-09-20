import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  IMAGE_COMPRESSION_CHANGE_EVENT,
  IMAGE_COMPRESSION_PRESETS,
  PRODUCT_IMAGE_RESOLUTIONS,
  convertProductImageToWebp,
  formatImageBytes,
  getImageCompressionPreset,
  setImageCompressionPreset,
  type ImageBackgroundRemovalOptions,
  type ImageCompressionPreset,
  type ProductImageConversionResult,
  type ProductImageResolution,
} from "@/dashboard/lib/imageProcessing";

type Props = {
  files: File[];
  resolution: ProductImageResolution;
  onResolutionChange?: (value: ProductImageResolution) => void;
  title?: string;
  compact?: boolean;
  backgroundRemoval?: ImageBackgroundRemovalOptions;
};

export default function ImageOptimizationPreview({
  files,
  resolution,
  onResolutionChange,
  title = "Image optimization preview",
  compact = false,
  backgroundRemoval,
}: Props) {
  const [compression, setCompression] = useState<ImageCompressionPreset>(() =>
    getImageCompressionPreset(),
  );
  const [results, setResults] = useState<ProductImageConversionResult[]>([]);
  const [error, setError] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [outputPreviewUrls, setOutputPreviewUrls] = useState<string[]>([]);
  const backgroundRemovalEnabled = Boolean(backgroundRemoval?.enabled);
  const backgroundRemovalTolerance = backgroundRemoval?.tolerance ?? 18;

  useEffect(() => {
    const syncCompression = (event: Event) => {
      const value = (event as CustomEvent<ImageCompressionPreset>).detail;
      if (IMAGE_COMPRESSION_PRESETS.some((option) => option.value === value)) {
        setCompression(value);
      }
    };
    window.addEventListener(IMAGE_COMPRESSION_CHANGE_EVENT, syncCompression);
    return () => window.removeEventListener(IMAGE_COMPRESSION_CHANGE_EVENT, syncCompression);
  }, []);

  useEffect(() => {
    if (!files.length) {
      setResults([]);
      setError("");
      return;
    }

    let cancelled = false;
    setPreviewing(true);
    setError("");

    void (async () => {
      try {
        const next: ProductImageConversionResult[] = [];
        for (const file of files) {
          next.push(
            await convertProductImageToWebp(
              file,
              resolution,
              compression,
              backgroundRemovalEnabled
                ? { enabled: true, tolerance: backgroundRemovalTolerance }
                : undefined,
            ),
          );
        }
        if (!cancelled) setResults(next);
      } catch (cause) {
        if (!cancelled) {
          setResults([]);
          setError(cause instanceof Error ? cause.message : "Unable to preview optimization.");
        }
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    files,
    resolution,
    compression,
    backgroundRemovalEnabled,
    backgroundRemovalTolerance,
  ]);

  useEffect(() => {
    const urls = results.map((item) => URL.createObjectURL(item.file));
    setOutputPreviewUrls(urls);
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [results]);

  const totals = useMemo(() => {
    const source = results.reduce((sum, item) => sum + item.source.bytes, 0);
    const output = results.reduce((sum, item) => sum + item.output.bytes, 0);
    const reduction = source > 0 ? Math.max(0, Math.round((1 - output / source) * 100)) : 0;
    return { source, output, reduction };
  }, [results]);

  if (!files.length) return null;

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/45 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.12em] text-indigo-700">
            {title}
          </div>
          <div className="mt-1 text-[9px] leading-4 text-slate-500">
            Preview is generated locally before upload. Nothing is sent to Storage until you save or confirm.
          </div>
        </div>
        {previewing ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[9px] font-bold text-indigo-600">
            <Loader2 className="size-3 animate-spin" /> Calculating…
          </span>
        ) : null}
      </div>

      <div className={"mt-3 grid gap-2 " + (compact ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
        <label className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="block text-[8px] font-black uppercase tracking-[.11em] text-slate-400">
            Compression
          </span>
          <select
            value={compression}
            onChange={(event) => {
              const value = event.target.value as ImageCompressionPreset;
              setCompression(value);
              setImageCompressionPreset(value);
            }}
            className="mt-1 w-full bg-transparent text-[10px] font-bold text-slate-700 outline-none"
          >
            {IMAGE_COMPRESSION_PRESETS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[8px] leading-3 text-slate-400">
            {IMAGE_COMPRESSION_PRESETS.find((option) => option.value === compression)?.description}
          </span>
        </label>

        {onResolutionChange ? (
          <label className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <span className="block text-[8px] font-black uppercase tracking-[.11em] text-slate-400">
              Max resolution
            </span>
            <select
              value={resolution}
              onChange={(event) =>
                onResolutionChange(event.target.value as ProductImageResolution)
              }
              className="mt-1 w-full bg-transparent text-[10px] font-bold text-slate-700 outline-none"
            >
              {PRODUCT_IMAGE_RESOLUTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <span className="block text-[8px] font-black uppercase tracking-[.11em] text-slate-400">
              Max resolution
            </span>
            <span className="mt-1 block text-[10px] font-bold text-slate-700">
              {resolution === "original" ? "Original dimensions" : `${resolution} px`}
            </span>
          </div>
        )}

        {!compact ? (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <span className="block text-[8px] font-black uppercase tracking-[.11em] text-slate-400">
              Selected
            </span>
            <span className="mt-1 block text-[10px] font-bold text-slate-700">
              {files.length} {files.length === 1 ? "image" : "images"}
            </span>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[9px] font-semibold text-rose-700">
          {error}
        </div>
      ) : results.length ? (
        <div className="mt-3 space-y-2">
          {results.map((item, index) => {
            const reduction =
              item.source.bytes > 0
                ? Math.max(0, Math.round((1 - item.output.bytes / item.source.bytes) * 100))
                : 0;
            return (
              <div
                key={`${item.source.name}-${index}`}
                className="grid gap-2 rounded-xl border border-white bg-white/90 p-3 sm:grid-cols-[1fr_auto]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {backgroundRemovalEnabled && outputPreviewUrls[index] ? (
                    <div
                      className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200"
                      style={{
                        backgroundImage:
                          "linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)",
                        backgroundPosition: "0 0,0 6px,6px -6px,-6px 0px",
                        backgroundSize: "12px 12px",
                      }}
                    >
                      <img
                        src={outputPreviewUrls[index]}
                        alt="Transparent output preview"
                        className="size-full object-contain p-1"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <div className="truncate text-[10px] font-bold text-slate-700">
                      {item.source.name}
                    </div>
                    <div className="mt-1 text-[9px] text-slate-500">
                      {item.source.width}×{item.source.height}px · {formatImageBytes(item.source.bytes)}
                      {" → "}
                      {item.output.width}×{item.output.height}px · {formatImageBytes(item.output.bytes)}
                    </div>
                    {backgroundRemovalEnabled ? (
                      <div className="mt-1 text-[8px] font-bold text-emerald-700">
                        Transparent background preview · tolerance {backgroundRemovalTolerance}
                      </div>
                    ) : null}
                  </div>
                </div>
                <span className="self-center rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">
                  {reduction}% smaller
                </span>
              </div>
            );
          })}

          {results.length > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900 px-3 py-2 text-white">
              <span className="text-[9px] font-bold">Total after optimization</span>
              <span className="text-[9px]">
                {formatImageBytes(totals.source)} → {formatImageBytes(totals.output)} · {totals.reduction}% smaller
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
