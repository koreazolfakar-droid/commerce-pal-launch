import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { HeroScene } from "@/components/HeroScene";
import { localizedCmsText, type CmsHeroSlide } from "@/lib/cms";
import {
  defaultHeroLayout,
  normalizeHeroVisualConfig,
  type HeroLayout,
  type HeroVisualConfig,
} from "@/lib/heroDesign";
import type { DashboardHeroInput } from "@/dashboard/data/hero";

export function HeroVisualEditor({
  form,
  onChange,
  mode,
  language,
}: {
  form: DashboardHeroInput;
  onChange: (form: DashboardHeroInput) => void;
  mode: "desktop" | "mobile";
  language: "en" | "ar";
}) {
  const ar = language === "ar";
  const [selected, setSelected] = useState<keyof HeroLayout>("content");
  const [cropMode, setCropMode] = useState(false);
  const [history, setHistory] = useState<DashboardHeroInput[]>([]);
  const [future, setFuture] = useState<DashboardHeroInput[]>([]);
  const latest = useRef(form);
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 390, height: 320 });
  const previewWidth = mode === "mobile" ? 390 : 960;
  useEffect(() => {
    latest.current = form;
  }, [form]);

  useEffect(() => {
    if (!host.current || !scene.current) return;
    const observer = new ResizeObserver(() =>
      setDimensions({
        width: host.current?.clientWidth ?? 390,
        height: scene.current?.offsetHeight ?? 320,
      }),
    );
    observer.observe(host.current);
    observer.observe(scene.current);
    return () => observer.disconnect();
  }, [mode]);
  const scale = Math.min(1, dimensions.width / previewWidth);
  const checkpoint = () => {
    setHistory((h) => [...h.slice(-29), latest.current]);
    setFuture([]);
  };
  const apply = (next: DashboardHeroInput) => {
    checkpoint();
    onChange(next);
  };
  const config = normalizeHeroVisualConfig(form.visualConfig);
  const layoutKey = mode === "mobile" ? "mobileLayout" : "desktopLayout";
  const layout =
    config[layoutKey] ?? defaultHeroLayout(config, form.contentAlignment, ar);
  const focusKey: "focalPoint" | "mobileFocalPoint" =
    mode === "mobile" ? "mobileFocalPoint" : "focalPoint";
  const focus =
    config[focusKey] ?? config.focalPoint ?? { x: 50, y: 50 };
  const updateFocusFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const nextFocus = {
      x: Math.max(0, Math.min(100, Math.round(((event.clientX - box.left) / box.width) * 100))),
      y: Math.max(0, Math.min(100, Math.round(((event.clientY - box.top) / box.height) * 100))),
    };
    const live = latest.current;
    const liveConfig = normalizeHeroVisualConfig(live.visualConfig);
    onChange({
      ...live,
      visualConfig: {
        ...liveConfig,
        [focusKey]: nextFocus,
      },
    });
  };
  const updateConfig = (patch: Partial<HeroVisualConfig>) =>
    apply({ ...form, visualConfig: { ...config, ...patch } });
  const slide: CmsHeroSlide = {
    id: "preview",
    title:
      localizedCmsText(language, form.titleEn, form.titleAr, form.titleEn) ??
      null,
    subtitle:
      localizedCmsText(
        language,
        form.subtitleEn,
        form.subtitleAr,
        form.subtitleEn,
      ) ?? null,
    eyebrow:
      localizedCmsText(
        language,
        form.eyebrowEn,
        form.eyebrowAr,
        form.eyebrowEn,
      ) ?? null,
    image_url: form.imageUrl,
    mobile_image_url: form.mobileImageUrl || null,
    image_alt_en: form.imageAltEn,
    image_alt_ar: form.imageAltAr,
    button_label:
      localizedCmsText(
        language,
        form.buttonLabelEn,
        form.buttonLabelAr,
        form.buttonLabelEn,
      ) ?? null,
    target_type: form.targetType,
    target_value: form.targetValue,
    secondary_button_label:
      localizedCmsText(
        language,
        form.secondaryButtonLabelEn,
        form.secondaryButtonLabelAr,
        form.secondaryButtonLabelEn,
      ) ?? null,
    secondary_target_type: form.secondaryTargetType,
    secondary_target_value: form.secondaryTargetValue,
    sort_order: 0,
    content_alignment: form.contentAlignment,
    content_theme: form.contentTheme,
    overlay_opacity: form.overlayOpacity,
    button_style: form.buttonStyle,
    secondary_button_style: form.secondaryButtonStyle,
    visual_config: config,
  };

  const hasPreviewImage =
    mode === "mobile"
      ? Boolean(form.mobileImageUrl || form.imageUrl)
      : Boolean(form.imageUrl);

  return (
    <div className="space-y-3" dir={ar ? "rtl" : "ltr"}>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          aria-pressed={!cropMode}
          onClick={() => setCropMode(false)}
          className={`min-h-11 rounded-lg px-3 text-[10px] font-bold transition ${
            !cropMode
              ? "bg-white text-[#14203a] shadow-sm"
              : "text-slate-500"
          }`}
        >
          <span className="block">{ar ? "المحتوى" : "Content"}</span>
          <span className="mt-0.5 block text-[8px] font-medium opacity-65">
            {ar ? "النص والأزرار" : "Text & buttons"}
          </span>
        </button>
        <button
          type="button"
          aria-pressed={cropMode}
          disabled={!hasPreviewImage}
          onClick={() => setCropMode(true)}
          className={`min-h-11 rounded-lg px-3 text-[10px] font-bold transition disabled:opacity-40 ${
            cropMode
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-500"
          }`}
        >
          <span className="block">{ar ? "الصورة" : "Image"}</span>
          <span className="mt-0.5 block text-[8px] font-medium opacity-65">
            {ar ? "ضبط الصورة باللمس" : "Adjust image by touch"}
          </span>
        </button>
      </div>

      <p className="px-1 text-[10px] leading-4 text-slate-400">
        {cropMode
          ? ar
            ? "اسحب داخل المعاينة لتحديد الجزء المهم من الصورة."
            : "Drag directly on the preview to choose the important image area."
          : ar
            ? "حرّك النص أو الأزرار داخل المعاينة، أو عدّل الحقول مباشرة تحتها."
            : "Move text or buttons in the preview, or edit the fields directly below it."}
      </p>

      <div
        ref={host}
        className={`relative mx-auto w-full overflow-hidden rounded-2xl bg-slate-100 p-0 ${
          mode === "desktop" ? "max-w-[360px]" : "max-w-[390px]"
        }`}
        style={{ height: dimensions.height * scale }}
      >
        <div
          ref={scene}
          style={{
            width: previewWidth,
            transform: `scale(${scale})`,
            transformOrigin: ar ? "top right" : "top left",
            marginInline: "auto",
          }}
        >
          {hasPreviewImage ? (
            <HeroScene
              slide={slide}
              language={language}
              editor={{
                mode,
                selected,
                onSelect: setSelected,
                onStart: checkpoint,
                onEnd: () => {},
                onChange: (visualConfig) =>
                  onChange({ ...latest.current, visualConfig }),
              }}
            />
          ) : (
            <div className="grid aspect-[16/9] place-items-center rounded-2xl bg-slate-100 px-6 text-center">
              <span className="text-[11px] font-medium text-slate-400">
                {ar
                  ? "ارفع صورة لهذا الجهاز لتبدأ المعاينة"
                  : "Upload an image for this device to start previewing"}
              </span>
            </div>
          )}
        </div>

        {cropMode && hasPreviewImage ? (
          <div
            className="absolute inset-0 z-20 touch-none cursor-crosshair bg-slate-950/5 outline-none ring-inset focus-visible:ring-2 focus-visible:ring-indigo-500"
            tabIndex={0}
            role="group"
            aria-label={
              ar ? "حرّك نقطة تركيز صورة الهيرو" : "Move the hero image focal point"
            }
            onPointerDown={(event) => {
              checkpoint();
              event.currentTarget.setPointerCapture(event.pointerId);
              updateFocusFromPointer(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                updateFocusFromPointer(event);
              }
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }}
            onPointerCancel={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  event.key,
                )
              ) {
                return;
              }
              event.preventDefault();
              const step = event.shiftKey ? 5 : 1;
              const next = {
                x: Math.max(
                  0,
                  Math.min(
                    100,
                    focus.x +
                      (event.key === "ArrowLeft"
                        ? -step
                        : event.key === "ArrowRight"
                          ? step
                          : 0),
                  ),
                ),
                y: Math.max(
                  0,
                  Math.min(
                    100,
                    focus.y +
                      (event.key === "ArrowUp"
                        ? -step
                        : event.key === "ArrowDown"
                          ? step
                          : 0),
                  ),
                ),
              };
              updateConfig({ [focusKey]: next });
            }}
          >
            <span className="absolute left-3 top-3 rounded-full bg-slate-950/65 px-2.5 py-1 text-[9px] font-semibold text-white shadow-sm backdrop-blur">
              {ar ? "اسحب الصورة" : "Drag image focus"}
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-500/25 shadow-lg"
              style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
            >
              <span className="absolute left-1/2 top-1/2 h-px w-9 -translate-x-1/2 -translate-y-1/2 bg-white" />
              <span className="absolute left-1/2 top-1/2 h-9 w-px -translate-x-1/2 -translate-y-1/2 bg-white" />
            </span>
          </div>
        ) : null}
      </div>

      {cropMode ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[10px] font-semibold text-slate-600">
              {ar ? "أفقي" : "Horizontal focus"} · {focus.x}%
              <input
                type="range"
                min="0"
                max="100"
                value={focus.x}
                onPointerDown={checkpoint}
                onChange={(event) =>
                  onChange({
                    ...form,
                    visualConfig: {
                      ...config,
                      [focusKey]: {
                        ...focus,
                        x: Number(event.target.value),
                      },
                    },
                  })
                }
                className="mt-2 h-9 w-full accent-indigo-600"
              />
            </label>
            <label className="text-[10px] font-semibold text-slate-600">
              {ar ? "عمودي" : "Vertical focus"} · {focus.y}%
              <input
                type="range"
                min="0"
                max="100"
                value={focus.y}
                onPointerDown={checkpoint}
                onChange={(event) =>
                  onChange({
                    ...form,
                    visualConfig: {
                      ...config,
                      [focusKey]: {
                        ...focus,
                        y: Number(event.target.value),
                      },
                    },
                  })
                }
                className="mt-2 h-9 w-full accent-indigo-600"
              />
            </label>
          </div>
          <button
            type="button"
            className="mt-2 min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600"
            onClick={() =>
              updateConfig(
                mode === "mobile"
                  ? { mobileFocalPoint: undefined }
                  : { focalPoint: undefined },
              )
            }
          >
            {ar ? "إعادة تركيز الصورة" : "Reset image focus"}
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(selected === "content"
            ? (["title", "subtitle"] as const)
            : (["buttonLabel", "secondaryButtonLabel"] as const)
          ).map((field) => {
            const key = `${field}${ar ? "Ar" : "En"}` as
              | "titleAr"
              | "titleEn"
              | "subtitleAr"
              | "subtitleEn"
              | "buttonLabelAr"
              | "buttonLabelEn"
              | "secondaryButtonLabelAr"
              | "secondaryButtonLabelEn";
            const label =
              field === "title"
                ? ar
                  ? "العنوان"
                  : "Title"
                : field === "subtitle"
                  ? ar
                    ? "النص الوصفي"
                    : "Subtitle"
                  : field === "buttonLabel"
                    ? ar
                      ? "نص الزر"
                      : "Button label"
                    : ar
                      ? "نص الزر الثاني"
                      : "Second button label";
            return (
              <label key={key} className="text-[10px] font-semibold text-slate-600">
                {label}
                <input
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] outline-none focus:border-indigo-400"
                  value={form[key]}
                  onFocus={checkpoint}
                  onChange={(event) =>
                    onChange({ ...form, [key]: event.target.value })
                  }
                />
              </label>
            );
          })}
        </div>
      )}

      <details className="group overflow-hidden rounded-xl border border-slate-200 bg-white">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[10px] font-semibold text-slate-600 [&::-webkit-details-marker]:hidden">
          <span>{ar ? "تحكم دقيق" : "Fine controls"}</span>
          <span className="text-[9px] text-slate-400 group-open:hidden">
            {ar ? "اختياري" : "Optional"}
          </span>
          <span className="hidden text-[9px] text-slate-400 group-open:inline">
            {ar ? "إخفاء" : "Hide"}
          </span>
        </summary>
        <div className="space-y-3 border-t border-slate-100 p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              disabled={!history.length}
              className="min-h-10 rounded-lg border px-3 text-[10px] disabled:opacity-40"
              onClick={() => {
                const previous = history.at(-1);
                if (!previous) return;
                setFuture((f) => [...f, form]);
                setHistory((h) => h.slice(0, -1));
                onChange(previous);
              }}
            >
              {ar ? "تراجع" : "Undo"}
            </button>
            <button
              type="button"
              disabled={!future.length}
              className="min-h-10 rounded-lg border px-3 text-[10px] disabled:opacity-40"
              onClick={() => {
                const next = future.at(-1);
                if (!next) return;
                setHistory((h) => [...h, form]);
                setFuture((f) => f.slice(0, -1));
                onChange(next);
              }}
            >
              {ar ? "إعادة" : "Redo"}
            </button>
            <button
              type="button"
              className="min-h-10 rounded-lg border px-3 text-[10px]"
              onClick={() => updateConfig({ [layoutKey]: undefined })}
            >
              {ar ? "إعادة المواضع" : "Reset positions"}
            </button>
            <button
              type="button"
              className="min-h-10 rounded-lg border px-3 text-[10px]"
              onClick={() => setCropMode((value) => !value)}
            >
              {cropMode
                ? ar
                  ? "تعديل المحتوى"
                  : "Edit content"
                : ar
                  ? "تعديل الصورة"
                  : "Edit image"}
            </button>
          </div>

          {!cropMode ? (
            <>
              <label className="block text-[10px] font-semibold text-slate-600">
                {ar ? "مكان الأزرار" : "Button placement"}
                <select
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
                  value={config.buttonPlacement ?? "inline"}
                  onChange={(event) =>
                    updateConfig({
                      buttonPlacement: event.target
                        .value as HeroVisualConfig["buttonPlacement"],
                    })
                  }
                >
                  <option value="inline">{ar ? "مع النص" : "With text"}</option>
                  <option value="free">
                    {ar ? "حر داخل الصورة" : "Drag inside hero"}
                  </option>
                  <option value="below">{ar ? "تحت الصورة" : "Below hero"}</option>
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-[10px] font-semibold text-slate-600">
                  {ar ? "العنصر" : "Element"}
                  <select
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2"
                    value={selected}
                    onChange={(event) =>
                      setSelected(event.target.value as keyof HeroLayout)
                    }
                  >
                    <option value="content">{ar ? "النص" : "Text"}</option>
                    {config.buttonPlacement === "free" ? (
                      <option value="buttons">{ar ? "الأزرار" : "Buttons"}</option>
                    ) : null}
                  </select>
                </label>
                {(["x", "y"] as const).map((axis) => (
                  <label
                    key={axis}
                    className="text-[10px] font-semibold text-slate-600"
                  >
                    {axis === "x"
                      ? ar
                        ? "أفقي"
                        : "Horizontal"
                      : ar
                        ? "عمودي"
                        : "Vertical"}{" "}
                    · {layout[selected][axis]}%
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={layout[selected][axis]}
                      onPointerDown={checkpoint}
                      onChange={(event) =>
                        onChange({
                          ...form,
                          visualConfig: {
                            ...config,
                            [layoutKey]: {
                              ...layout,
                              [selected]: {
                                ...layout[selected],
                                [axis]: Number(event.target.value),
                              },
                            },
                          },
                        })
                      }
                      className="mt-2 h-9 w-full accent-indigo-600"
                    />
                  </label>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </details>
    </div>
  );
}
