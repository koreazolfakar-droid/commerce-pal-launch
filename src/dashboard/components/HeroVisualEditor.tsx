import { useEffect, useRef, useState } from "react";
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
  const [history, setHistory] = useState<DashboardHeroInput[]>([]);
  const [future, setFuture] = useState<DashboardHeroInput[]>([]);
  const latest = useRef(form);
  latest.current = form;
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 390, height: 320 });
  const previewWidth = mode === "mobile" ? 390 : 1200;
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

  return (
    <div className="space-y-4" dir={ar ? "rtl" : "ltr"}>
      <p className="text-xs leading-5 text-slate-500">
        {ar
          ? "اسحب النص أو الأزرار داخل المعاينة. استخدم أدوات القص بالأسفل لضبط الصورة لكل جهاز بشكل مستقل."
          : "Drag text or buttons inside the preview. Use the crop controls below to adjust the image independently for each device."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold">
          {ar ? "مكان الأزرار" : "Button placement"}
          <select
            className="ms-2 min-h-11 rounded-lg border bg-white px-3"
            value={config.buttonPlacement ?? "inline"}
            onChange={(e) =>
              updateConfig({
                buttonPlacement: e.target
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
        <button
          type="button"
          disabled={!history.length}
          className="min-h-11 rounded-lg border px-3 text-xs disabled:opacity-40"
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
          className="min-h-11 rounded-lg border px-3 text-xs disabled:opacity-40"
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
          className="min-h-11 rounded-lg border px-3 text-xs"
          onClick={() => updateConfig({ [layoutKey]: undefined })}
        >
          {ar ? "إعادة مواضع هذا الجهاز" : "Reset device positions"}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-lg border px-3 text-xs"
          onClick={() =>
            updateConfig(
              mode === "mobile"
                ? { mobileFocalPoint: undefined }
                : { focalPoint: undefined },
            )
          }
        >
          {ar ? "إعادة قص الصورة" : "Reset image crop"}
        </button>
      </div>
      <div
        ref={host}
        className={`mx-auto w-full overflow-hidden rounded-2xl bg-slate-100 p-0 ${mode === "desktop" ? "max-w-[520px]" : "max-w-[390px]"}`}
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
          {form.imageUrl ? (
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
            <div className="grid h-64 place-items-center text-slate-500">
              {ar
                ? "ارفع صورة لتبدأ المعاينة"
                : "Upload an image to start previewing"}
            </div>
          )}
        </div>
      </div>
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
            <label key={key} className="text-xs font-semibold">
              {label}
              <input
                className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3"
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs">
          {ar ? "العنصر" : "Element"}
          <select
            className="mt-1 min-h-11 w-full rounded-lg border bg-white px-2"
            value={selected}
            onChange={(e) => setSelected(e.target.value as keyof HeroLayout)}
          >
            <option value="content">{ar ? "النص" : "Text"}</option>
            {config.buttonPlacement === "free" ? (
              <option value="buttons">{ar ? "الأزرار" : "Buttons"}</option>
            ) : null}
          </select>
        </label>
        {(["x", "y"] as const).map((axis) => (
          <label key={axis} className="text-xs">
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
              onChange={(e) =>
                onChange({
                  ...form,
                  visualConfig: {
                    ...config,
                    [layoutKey]: {
                      ...layout,
                      [selected]: {
                        ...layout[selected],
                        [axis]: Number(e.target.value),
                      },
                    },
                  },
                })
              }
              className="mt-3 h-8 w-full accent-indigo-600"
            />
          </label>
        ))}
        <label className="text-xs">
          {ar ? "قص الصورة أفقيًا" : "Image crop horizontal"} · {focus.x}%
          <input
            type="range"
            min="0"
            max="100"
            value={focus.x}
            onPointerDown={checkpoint}
            onChange={(e) =>
              onChange({
                ...form,
                visualConfig: {
                  ...config,
                  [focusKey]: {
                    ...focus,
                    x: Number(e.target.value),
                  },
                },
              })
            }
            className="mt-3 h-8 w-full accent-indigo-600"
          />
        </label>
        <label className="text-xs">
          {ar ? "قص الصورة عموديًا" : "Image crop vertical"} · {focus.y}%
          <input
            type="range"
            min="0"
            max="100"
            value={focus.y}
            onPointerDown={checkpoint}
            onChange={(e) =>
              onChange({
                ...form,
                visualConfig: {
                  ...config,
                  [focusKey]: {
                    ...focus,
                    y: Number(e.target.value),
                  },
                },
              })
            }
            className="mt-3 h-8 w-full accent-indigo-600"
          />
        </label>
      </div>
      <p className="text-xs text-slate-500">
        {ar
          ? "الصور المتعددة: أضف شريحة من New slide، ارفع صورتها ثم انشرها. رتّب الشرائح بالسهمين. القالب الفاتح مناسب للصور ذات الخلفية الفاتحة."
          : "Multiple images: add a New slide, upload its image and publish it. Use the arrows to reorder. Light catalogue works best with light artwork."}
      </p>
    </div>
  );
}
