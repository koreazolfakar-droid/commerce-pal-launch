import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { Pipette, Upload, X } from "lucide-react";
import { useLanguage } from "@/dashboard/i18n";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_FILES = /^(image\/(?:jpeg|png|webp|avif|gif|bmp))$/i;
type Point = { x: number; y: number };

function safeImageSource(value: string) {
  return /^(https?:\/\/|blob:https?:\/\/)/i.test(value);
}

function SampleImage({ source, onApply, onCancel }: {
  source: string;
  onApply: (value: string) => void;
  onCancel: () => void;
}) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [point, setPoint] = useState<Point | null>(null);
  const [hex, setHex] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const sample = (next: Point) => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!ready || !image || !canvas || !image.naturalWidth || !image.naturalHeight) return;
    const x = Math.max(0, Math.min(1, next.x));
    const y = Math.max(0, Math.min(1, next.y));
    setPoint({ x, y });
    try {
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("canvas unavailable");
      context.clearRect(0, 0, 1, 1);
      const px = Math.min(image.naturalWidth - 1, Math.floor(x * image.naturalWidth));
      const py = Math.min(image.naturalHeight - 1, Math.floor(y * image.naturalHeight));
      context.drawImage(image, px, py, 1, 1, 0, 0, 1, 1);
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
      if (a === 0) {
        setHex("");
        setError(ar ? "هذه المنطقة شفافة. اختر نقطة أخرى." : "This pixel is transparent. Select another point.");
        return;
      }
      setHex("#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase());
      setError("");
    } catch {
      setHex("");
      setError(ar ? "تعذرت قراءة الصورة. اختر نسخة منها من جهازك." : "Unable to read image pixels. Choose a local copy instead.");
    }
  };
  const pointerSample = (event: PointerEvent<HTMLImageElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    sample({ x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height });
  };
  const keyboardSample = (event: KeyboardEvent<HTMLImageElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " "].includes(event.key)) return;
    event.preventDefault();
    const position = point ?? { x: 0.5, y: 0.5 };
    const step = event.shiftKey ? 0.05 : 0.005;
    sample({
      x: position.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0),
      y: position.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0),
    });
  };
  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-muted-foreground">
        {ar ? "المس الصورة أو حرّك إصبعك فوقها. بالكيبورد استخدم الأسهم." : "Tap or drag on the image. Keyboard users can use the arrow keys."}
      </p>
      <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-lg border border-border bg-muted">
        <img ref={imageRef} crossOrigin="anonymous" src={source} alt={ar ? "صورة لاختيار لون المنتج" : "Image for sampling product color"}
          className="block h-auto max-h-[420px] w-auto max-w-full touch-none select-none cursor-crosshair focus-visible:outline-2 focus-visible:outline-primary"
          draggable={false} tabIndex={0} role="button"
          aria-label={ar ? "حدد لون الصورة باللمس أو الأسهم" : "Sample image color using touch or arrow keys"}
          onLoad={() => { setReady(true); setError(""); }}
          onError={() => { setReady(false); setHex(""); setError(ar ? "تعذر فتح الصورة. اختر صورة من جهازك." : "Image could not be opened. Choose a local image."); }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            pointerSample(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) pointerSample(event);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              pointerSample(event);
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onKeyDown={keyboardSample} />
        {point ? (
          <span aria-hidden="true" className="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ring-2 ring-black"
            style={{ left: String(point.x * 100) + "%", top: String(point.y * 100) + "%" }} />
        ) : null}
      </div>
      <canvas ref={canvasRef} width={1} height={1} hidden />
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <span aria-hidden="true" className="size-10 shrink-0 rounded-lg border border-border" style={{ backgroundColor: hex || undefined }} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{ar ? "اللون المحدد" : "Sampled color"}</p>
          <p className="font-mono text-sm font-semibold text-foreground" dir="ltr" aria-live="polite">{hex || "—"}</p>
        </div>
      </div>
      <label className="block text-xs font-medium text-foreground">
        {ar ? "اسم اللون الرسمي (اختياري)" : "Official color name (optional)"}
        <input value={name} onChange={event => setName(event.target.value)} maxLength={68}
          placeholder="e.g. Midnight Blue" className="mt-1 h-11 w-full rounded-lg border border-border bg-card px-3 text-base" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onCancel} className="min-h-11 flex-1 rounded-lg border border-border px-3 text-sm font-medium">{ar ? "إلغاء" : "Cancel"}</button>
        <button type="button" disabled={!hex} onClick={() => onApply(name.trim() ? name.trim() + " (" + hex + ")" : hex)}
          className="min-h-11 flex-1 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {ar ? "استخدام اللون" : "Use color"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{ar ? "اللون مأخوذ من بكسل الصورة، وقد يتأثر بالإضاءة والانعكاس." : "The color is sampled from the image and may be affected by lighting and reflections."}</p>
    </div>
  );
}

export default function ProductImageColorSampler({ imageSources, imageFile, onApply, onCancel }: {
  imageSources: string[];
  imageFile?: File | null;
  onApply: (value: string) => void;
  onCancel: () => void;
}) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const sources = [...new Set(imageSources.filter(safeImageSource))];
  const [chosen, setChosen] = useState("");
  const [file, setFile] = useState<File | null>(imageFile ?? null);
  const [localUrl, setLocalUrl] = useState("");
  const [fileError, setFileError] = useState("");
  useEffect(() => {
    if (!file) { setLocalUrl(""); return; }
    const url = URL.createObjectURL(file);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const source = file ? localUrl : sources.includes(chosen) ? chosen : sources[0] ?? "";
  return (
    <section className="space-y-3 rounded-xl border border-primary/30 bg-card p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Pipette className="size-4" aria-hidden="true" />{ar ? "نسخ اللون من الصورة" : "Pick color from image"}</h3>
        <button type="button" onClick={onCancel} aria-label={ar ? "إغلاق أداة الألوان" : "Close color sampler"} className="grid size-11 place-items-center rounded-lg hover:bg-muted"><X className="size-4" aria-hidden="true" /></button>
      </div>
      {sources.length ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label={ar ? "صور المنتج" : "Product images"}>
          {sources.map((url, index) => (
            <button key={url} type="button" aria-pressed={!file && source === url} aria-label={(ar ? "صورة " : "Image ") + (index + 1)}
              onClick={() => { setFile(null); setChosen(url); setFileError(""); }}
              className={"size-14 overflow-hidden rounded-lg border-2 " + (!file && source === url ? "border-primary" : "border-border")}>
              <img src={url} alt="" className="size-full object-contain" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
      <label className="block text-xs font-medium text-foreground">
        <span className="flex items-center gap-2"><Upload aria-hidden="true" className="size-4" />{ar ? "أو اختر صورة من جهازك" : "Or choose an image from your device"}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp"
          onChange={event => {
            const next = event.target.files?.[0];
            if (!next) return;
            if (!ALLOWED_FILES.test(next.type) || next.size > MAX_FILE_BYTES) {
              setFileError(ar ? "اختر صورة مدعومة بحجم لا يزيد عن 20 MB." : "Choose a supported image up to 20 MB.");
              event.target.value = "";
              return;
            }
            setFileError("");
            setFile(next);
            setLocalUrl("");
            event.target.value = "";
          }} className="mt-2 block w-full text-xs file:me-2 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-3" />
      </label>
      {fileError ? <p role="alert" className="text-xs text-destructive">{fileError}</p> : null}
      {source ? <SampleImage key={source} source={source} onApply={onApply} onCancel={onCancel} /> : (
        <p className="text-xs text-muted-foreground">{ar ? "اختر صورة لبدء تحديد اللون." : "Choose an image to start sampling."}</p>
      )}
    </section>
  );
}
