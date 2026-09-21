import { Check, Focus, Loader2, Maximize2, RotateCcw, X } from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type SmartImagePreset =
  | "logo"
  | "square"
  | "cover"
  | "hero-desktop"
  | "hero-mobile"
  | "free";

type EditorOptions = {
  title?: string;
  preset?: SmartImagePreset;
  transparent?: boolean;
  defaultFit?: "contain" | "cover";
};

type EditorRequest = {
  source: File | string;
  options: EditorOptions;
  resolve: (file: File | null) => void;
};

type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type LoadedImage = {
  element: HTMLImageElement;
  width: number;
  height: number;
  bounds: Bounds;
  sourceName: string;
  previewUrl: string;
};

const PRESET_SIZE: Record<Exclude<SmartImagePreset, "free">, [number, number]> = {
  logo: [1200, 1200],
  square: [1400, 1400],
  cover: [1920, 1080],
  "hero-desktop": [1920, 1080],
  "hero-mobile": [1080, 1920],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function canvasBlob(canvas: HTMLCanvasElement, type = "image/webp", quality = 0.94) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create the edited image."))),
      type,
      quality,
    );
  });
}

function sourceName(source: File | string) {
  if (source instanceof File) return source.name || "image";
  try {
    const pathname = new URL(source).pathname;
    return pathname.split("/").pop() || "image";
  } catch {
    return "image";
  }
}

function outputName(source: File | string) {
  const base = sourceName(source).replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9._-]+/gi, "-");
  return `${base || "image"}-adjusted.webp`;
}

async function imageFromSource(source: File | string) {
  let blob: Blob;

  if (source instanceof File) {
    blob = source;
  } else {
    const response = await fetch(source, { mode: "cors", credentials: "omit", cache: "no-store" });
    if (!response.ok) throw new Error("Could not load this image for editing.");
    blob = await response.blob();
  }

  const previewUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = "async";
  image.src = previewUrl;
  try {
    await image.decode();
    return { image, previewUrl };
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    throw error;
  }
}

function detectContentBounds(image: HTMLImageElement): Bounds {
  const maxSide = 420;
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { left: 0, top: 0, right: image.naturalWidth, bottom: image.naturalHeight };

  context.drawImage(image, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  const cornerPoints = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  const corners = cornerPoints.map(([x, y]) => {
    const index = (y * width + x) * 4;
    return [data[index], data[index + 1], data[index + 2], data[index + 3]];
  });
  const bg = corners.reduce(
    (acc, pixel) => acc.map((value, index) => value + pixel[index] / corners.length),
    [0, 0, 0, 0],
  );
  const transparentBackground = bg[3] < 96;

  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  let foreground = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];
      if (alpha < 18) continue;
      const distance = Math.hypot(
        data[index] - bg[0],
        data[index + 1] - bg[1],
        data[index + 2] - bg[2],
      );
      const alphaDistance = Math.abs(alpha - bg[3]);
      const isForeground = transparentBackground
        ? alpha > 28
        : distance > 34 || alphaDistance > 50;

      if (!isForeground) continue;
      foreground += 1;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (foreground < Math.max(20, width * height * 0.002) || right < left || bottom < top) {
    return { left: 0, top: 0, right: image.naturalWidth, bottom: image.naturalHeight };
  }

  const scaleBack = 1 / ratio;
  const pad = 2 * scaleBack;
  return {
    left: clamp((left * scaleBack) - pad, 0, image.naturalWidth),
    top: clamp((top * scaleBack) - pad, 0, image.naturalHeight),
    right: clamp(((right + 1) * scaleBack) + pad, 0, image.naturalWidth),
    bottom: clamp(((bottom + 1) * scaleBack) + pad, 0, image.naturalHeight),
  };
}

function targetSize(preset: SmartImagePreset, image: LoadedImage) {
  if (preset !== "free") return PRESET_SIZE[preset];
  const longest = Math.max(image.width, image.height);
  const scale = Math.min(1, 1920 / longest);
  return [
    Math.max(1, Math.round(image.width * scale)),
    Math.max(1, Math.round(image.height * scale)),
  ] as const;
}

function smartTransform(
  image: LoadedImage,
  width: number,
  height: number,
  fit: "contain" | "cover",
  padding: number,
) {
  const innerW = width * (1 - (padding / 100) * 2);
  const innerH = height * (1 - (padding / 100) * 2);
  const baseScale =
    fit === "cover"
      ? Math.max(innerW / image.width, innerH / image.height)
      : Math.min(innerW / image.width, innerH / image.height);
  const subjectW = Math.max(1, image.bounds.right - image.bounds.left);
  const subjectH = Math.max(1, image.bounds.bottom - image.bounds.top);
  const subjectScale =
    fit === "cover"
      ? Math.max(innerW / subjectW, innerH / subjectH)
      : Math.min(innerW / subjectW, innerH / subjectH);
  const zoom = clamp(subjectScale / baseScale, 0.55, 3);
  const scale = baseScale * zoom;
  const subjectCx = (image.bounds.left + image.bounds.right) / 2;
  const subjectCy = (image.bounds.top + image.bounds.bottom) / 2;
  const x = clamp((-(subjectCx - image.width / 2) * scale * 100) / width, -45, 45);
  const y = clamp((-(subjectCy - image.height / 2) * scale * 100) / height, -45, 45);
  return { zoom, x, y };
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block rounded-2xl border border-slate-200 p-3">
      <span className="flex items-center justify-between text-[10px] font-bold text-slate-600">
        <span>{label}</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-600">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-indigo-600"
      />
    </label>
  );
}

function SmartImageEditorDialog({
  request,
  onDone,
}: {
  request: EditorRequest;
  onDone: (file: File | null) => void;
}) {
  const preset = request.options.preset ?? "square";
  const transparent = request.options.transparent ?? preset === "logo";
  const initialFit: "contain" | "cover" =
    request.options.defaultFit ?? (preset === "cover" || preset.startsWith("hero-") ? "cover" : "contain");
  const initialPadding = preset === "logo" ? 10 : preset === "square" ? 5 : 0;
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fit, setFit] = useState<"contain" | "cover">(initialFit);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [padding, setPadding] = useState(initialPadding);
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    let activePreviewUrl = "";
    imageFromSource(request.source)
      .then(({ image: element, previewUrl }) => {
        activePreviewUrl = previewUrl;
        if (cancelled) {
          URL.revokeObjectURL(previewUrl);
          return;
        }
        const next: LoadedImage = {
          element,
          width: element.naturalWidth,
          height: element.naturalHeight,
          bounds: detectContentBounds(element),
          sourceName: sourceName(request.source),
          previewUrl,
        };
        setLoaded(next);
        const [width, height] = targetSize(preset, next);
        const smart = smartTransform(next, width, height, initialFit, initialPadding);
        setZoom(smart.zoom);
        setX(smart.x);
        setY(smart.y);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not open this image.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (activePreviewUrl) URL.revokeObjectURL(activePreviewUrl);
    };
  }, [initialFit, initialPadding, preset, request.source]);

  const dimensions = useMemo(() => {
    if (!loaded) return [1, 1] as const;
    return targetSize(preset, loaded);
  }, [loaded, preset]);

  const autoCenter = useCallback(() => {
    if (!loaded) return;
    const smart = smartTransform(loaded, dimensions[0], dimensions[1], fit, padding);
    setZoom(smart.zoom);
    setX(smart.x);
    setY(smart.y);
  }, [dimensions, fit, loaded, padding]);

  const reset = () => {
    setZoom(1);
    setX(0);
    setY(0);
    setPadding(initialPadding);
    setFit(initialFit);
  };

  const save = async () => {
    if (!loaded || saving) return;
    setSaving(true);
    setError("");
    try {
      const [width, height] = dimensions;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image canvas is unavailable.");

      if (!transparent) {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
      }

      const innerW = width * (1 - (padding / 100) * 2);
      const innerH = height * (1 - (padding / 100) * 2);
      const baseScale =
        fit === "cover"
          ? Math.max(innerW / loaded.width, innerH / loaded.height)
          : Math.min(innerW / loaded.width, innerH / loaded.height);
      const scale = baseScale * zoom;
      const drawW = loaded.width * scale;
      const drawH = loaded.height * scale;
      const drawX = (width - drawW) / 2 + (x / 100) * width;
      const drawY = (height - drawH) / 2 + (y / 100) * height;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(loaded.element, drawX, drawY, drawW, drawH);

      const blob = await canvasBlob(canvas);
      onDone(new File([blob], outputName(request.source), { type: "image/webp" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the edited image.");
    } finally {
      setSaving(false);
    }
  };

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!loaded) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, startX: x, startY: y };
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setX(clamp(drag.startX + ((event.clientX - drag.x) / rect.width) * 100, -45, 45));
    setY(clamp(drag.startY + ((event.clientY - drag.y) / rect.height) * 100, -45, 45));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const previewSize = useMemo(() => {
    if (!loaded) return { width: 0, height: 0 };
    const [frameWidth, frameHeight] = dimensions;
    const innerW = frameWidth * (1 - (padding / 100) * 2);
    const innerH = frameHeight * (1 - (padding / 100) * 2);
    const baseScale =
      fit === "cover"
        ? Math.max(innerW / loaded.width, innerH / loaded.height)
        : Math.min(innerW / loaded.width, innerH / loaded.height);
    const scale = baseScale * zoom;
    return {
      width: (loaded.width * scale * 100) / frameWidth,
      height: (loaded.height * scale * 100) / frameHeight,
    };
  }, [dimensions, fit, loaded, padding, zoom]);

  return (
    <div className="fixed inset-0 z-[140] grid place-items-end bg-slate-950/65 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <div className="max-h-[96vh] w-full overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:max-w-3xl sm:rounded-[28px]">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-indigo-500">Smart image editor</div>
            <h2 className="mt-1 text-[18px] font-black tracking-[-.03em] text-slate-900">
              {request.options.title ?? "Adjust image"}
            </h2>
          </div>
          <button type="button" onClick={() => onDone(null)} disabled={saving} className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 disabled:opacity-50" aria-label="Close image editor">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-3">
            <div
              className="relative mx-auto w-full max-w-[620px] touch-none overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(45deg,#eef2f7_25%,transparent_25%),linear-gradient(-45deg,#eef2f7_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eef2f7_75%),linear-gradient(-45deg,transparent_75%,#eef2f7_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] shadow-inner"
              style={{ aspectRatio: `${dimensions[0]} / ${dimensions[1]}` }}
              onPointerDown={beginDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {!transparent ? <div className="absolute inset-0 bg-white" /> : null}
              {loaded ? (
                <img
                  src={loaded.previewUrl}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                  style={{
                    width: `${previewSize.width}%`,
                    height: `${previewSize.height}%`,
                    left: `calc(50% + ${x}%)`,
                    top: `calc(50% + ${y}%)`,
                    transform: "translate(-50%, -50%)",
                    transformOrigin: "center",
                  }}
                />
              ) : null}
              {loading ? (
                <div className="absolute inset-0 grid place-items-center bg-white/75">
                  <Loader2 className="size-6 animate-spin text-indigo-500" />
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-3 rounded-xl border border-dashed border-indigo-400/60" />
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="size-2 rounded-full bg-indigo-500/70 shadow" />
              </div>
            </div>
            <p className="text-center text-[10px] leading-4 text-slate-400">
              Drag the image directly. Auto Center detects the visible subject, trims empty space and centers it visually.
            </p>
            {error ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700">{error}</div> : null}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={autoCenter} disabled={!loaded || saving} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 text-[10px] font-black text-white disabled:opacity-50">
                <Focus className="size-3.5" /> Auto Center
              </button>
              <button type="button" onClick={reset} disabled={saving} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-[10px] font-black text-slate-600 disabled:opacity-50">
                <RotateCcw className="size-3.5" /> Reset
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold text-slate-600">
                <span>Fit mode</span><Maximize2 className="size-3.5 text-slate-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["contain", "cover"] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => setFit(mode)} className={`h-9 rounded-xl text-[10px] font-black transition ${fit === mode ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {mode === "contain" ? "Fit" : "Fill"}
                  </button>
                ))}
              </div>
            </div>

            <RangeControl label="Zoom" value={zoom} min={0.55} max={3} step={0.01} display={`${Math.round(zoom * 100)}%`} onChange={setZoom} />
            <RangeControl label="Horizontal" value={x} min={-45} max={45} step={1} display={String(Math.round(x))} onChange={setX} />
            <RangeControl label="Vertical" value={y} min={-45} max={45} step={1} display={String(Math.round(y))} onChange={setY} />
            <RangeControl label="Padding" value={padding} min={0} max={30} step={1} display={`${Math.round(padding)}%`} onChange={setPadding} />

            <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-[9px] leading-4 text-slate-500">
              Output: {dimensions[0]}×{dimensions[1]} WebP. The source image remains untouched until the normal save/upload step succeeds.
            </div>

            <button type="button" onClick={() => void save()} disabled={!loaded || loading || saving} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#14203a] px-4 text-[11px] font-black text-white disabled:opacity-50">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Save adjustment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useSmartImageEditor() {
  const [request, setRequest] = useState<EditorRequest | null>(null);

  const edit = useCallback((source: File | string, options: EditorOptions = {}) => {
    return new Promise<File | null>((resolve) => {
      setRequest({ source, options, resolve });
    });
  }, []);

  const finish = useCallback((file: File | null) => {
    setRequest((current) => {
      current?.resolve(file);
      return null;
    });
  }, []);

  const dialog: ReactNode = request ? <SmartImageEditorDialog request={request} onDone={finish} /> : null;

  return {
    editFile: (file: File, options?: EditorOptions) => edit(file, options),
    editUrl: (url: string, options?: EditorOptions) => edit(url, options),
    dialog,
    isEditing: Boolean(request),
  };
}

export default SmartImageEditorDialog;
