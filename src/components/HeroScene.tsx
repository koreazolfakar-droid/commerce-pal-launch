import {
  useRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import type { CmsHeroSlide } from "@/lib/cms";
import {
  defaultHeroLayout,
  moveHeroPoint,
  normalizeHeroVisualConfig,
  type HeroLayout,
  type HeroVisualConfig,
} from "@/lib/heroDesign";
import "./hero-scene.css";

type Part = keyof HeroLayout;
type Editor = {
  mode: "desktop" | "mobile";
  selected: Part;
  onSelect: (part: Part) => void;
  onChange: (config: HeroVisualConfig) => void;
  onStart: () => void;
  onEnd: () => void;
};
function href(type: string | undefined, value: string | null | undefined) {
  if (!value) return undefined;
  if (type === "product") return `/product/${encodeURIComponent(value)}`;
  if (type === "collection") return `/collections/${encodeURIComponent(value)}`;
  if (
    type === "url" &&
    (/^\/(?!\/)/.test(value) || /^https?:\/\//i.test(value))
  )
    return value;
  return undefined;
}
export function HeroScene({
  slide,
  language,
  editor,
  onImageError,
  priority = false,
}: {
  slide: CmsHeroSlide;
  language: "ar" | "en";
  editor?: Editor;
  onImageError?: () => void;
  priority?: boolean;
}) {
  const config = normalizeHeroVisualConfig(slide.visual_config);
  const fallback = defaultHeroLayout(
    config,
    slide.content_alignment,
    language === "ar",
  );
  const desktop = config.desktopLayout ?? fallback,
    mobile = config.mobileLayout ?? fallback;
  const current = editor?.mode === "mobile" ? mobile : desktop;
  const drag = useRef<{
    id: number;
    part: Part;
    x: number;
    y: number;
    width: number;
    height: number;
    config: HeroVisualConfig;
    layout: HeroLayout;
  } | null>(null);
  const placement = config.buttonPlacement ?? "inline";
  const free =
    placement === "free" ||
    Boolean(config.desktopLayout || config.mobileLayout);
  const mobileImage = slide.mobile_image_url || slide.image_url;
  const desktopFocus = config.focalPoint ?? { x: 50, y: 50 };
  const mobileFocus = config.mobileFocalPoint ?? desktopFocus;
  const ar = language === "ar";
  const patch = (
    part: Part,
    next: HeroLayout[Part],
    base = config,
    oldLayout = current,
  ) =>
    editor?.onChange({
      ...base,
      [editor.mode === "mobile" ? "mobileLayout" : "desktopLayout"]: {
        ...oldLayout,
        [part]: next,
      },
    });
  const down = (event: PointerEvent<HTMLDivElement>, part: Part) => {
    if (!editor || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    editor.onSelect(part);
    editor.onStart();
    const el = event.currentTarget,
      parent = el.parentElement!;
    const box = el.getBoundingClientRect(),
      canvas = parent.getBoundingClientRect();
    drag.current = {
      id: event.pointerId,
      part,
      x: event.clientX,
      y: event.clientY,
      width: canvas.width - box.width,
      height: canvas.height - box.height,
      config,
      layout: {
        ...current,
        [part]: {
          x:
            canvas.width > box.width
              ? ((box.left - canvas.left) / (canvas.width - box.width)) * 100
              : 0,
          y:
            canvas.height > box.height
              ? ((box.top - canvas.top) / (canvas.height - box.height)) * 100
              : 0,
        },
      },
    };
    el.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    patch(
      d.part,
      moveHeroPoint(
        d.layout[d.part],
        event.clientX - d.x,
        event.clientY - d.y,
        d.width,
        d.height,
      ),
      d.config,
      d.layout,
    );
  };
  const end = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    editor?.onEnd();
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const positioned = (part: Part, children: ReactNode) => {
    const positionStyle = {
      "--hero-x": `${desktop[part].x}%`,
      "--hero-y": `${desktop[part].y}%`,
      "--hero-mx": `${mobile[part].x}%`,
      "--hero-my": `${mobile[part].y}%`,
      "--hero-tx": `${-desktop[part].x}%`,
      "--hero-ty": `${-desktop[part].y}%`,
      "--hero-mtx": `${-mobile[part].x}%`,
      "--hero-mty": `${-mobile[part].y}%`,
    } as CSSProperties;
    return (
      <div
        data-hero-part={part}
        data-selected={editor?.selected === part || undefined}
        className={`hero-scene-part hero-scene-${part}`}
        style={positionStyle}
        tabIndex={editor ? 0 : undefined}
        role={editor ? "group" : undefined}
        aria-label={
          editor
            ? ar
              ? part === "content"
                ? "تحريك النص"
                : "تحريك الأزرار"
              : `Move ${part}`
            : undefined
        }
        onPointerDown={editor ? (e) => down(e, part) : undefined}
        onPointerMove={editor ? move : undefined}
        onPointerUp={editor ? end : undefined}
        onPointerCancel={editor ? end : undefined}
        onKeyDown={
          editor
            ? (e) => {
                if (
                  !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                    e.key,
                  )
                )
                  return;
                e.preventDefault();
                editor.onStart();
                const step = e.shiftKey ? 10 : 1;
                patch(
                  part,
                  moveHeroPoint(
                    current[part],
                    e.key === "ArrowLeft"
                      ? -step
                      : e.key === "ArrowRight"
                        ? step
                        : 0,
                    e.key === "ArrowUp"
                      ? -step
                      : e.key === "ArrowDown"
                        ? step
                        : 0,
                    100,
                    100,
                  ),
                );
                editor.onEnd();
              }
            : undefined
        }
      >
        {children}
      </div>
    );
  };
  const buttons = [
    {
      label: slide.button_label,
      url: href(slide.target_type, slide.target_value),
      style: slide.button_style,
      blank: slide.open_in_new_tab,
    },
    {
      label: slide.secondary_button_label,
      url: href(slide.secondary_target_type, slide.secondary_target_value),
      style: slide.secondary_button_style,
      blank: slide.secondary_open_in_new_tab,
    },
  ].filter((button) => button.label && button.url);
  const buttonNodes = (
    <div className="hero-scene-buttons-row">
      {buttons.map((button, i) =>
        editor ? (
          <span key={i} className="hero-scene-button" data-style={button.style}>
            {button.label}
          </span>
        ) : (
          <a
            key={i}
            className="hero-scene-button"
            data-style={button.style}
            href={button.url}
            target={button.blank ? "_blank" : undefined}
            rel={button.blank ? "noopener noreferrer" : undefined}
          >
            {button.label}
          </a>
        ),
      )}
    </div>
  );
  return (
    <div
      className="hero-scene"
      data-editor={editor ? "true" : undefined}
      data-mode={editor?.mode}
      data-size={config.titleSize}
      data-width={config.contentWidth}
      data-radius={config.buttonRadius}
      data-theme={slide.content_theme ?? "light"}
      data-mobile-source={slide.mobile_image_url ? "dedicated" : "fallback"}
      data-align={slide.content_alignment ?? "start"}
      data-vertical={config.vertical}
      data-free={free || undefined}
      dir={ar ? "rtl" : "ltr"}
    >
      <div className="hero-scene-canvas" data-testid="home-hero-media">
        <picture className="hero-scene-artwork">
          {!editor ? (
            <source media="(max-width: 639px)" srcSet={mobileImage} />
          ) : null}
          <img
            src={editor?.mode === "mobile" ? mobileImage : slide.image_url}
            alt={
              (ar ? slide.image_alt_ar : slide.image_alt_en) ||
              slide.title ||
              "Space Call"
            }
            draggable={false}
            onError={onImageError}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding={priority ? "sync" : "async"}
            style={{
              "--hero-focus-x": `${desktopFocus.x}%`,
              "--hero-focus-y": `${desktopFocus.y}%`,
              "--hero-mobile-focus-x": `${mobileFocus.x}%`,
              "--hero-mobile-focus-y": `${mobileFocus.y}%`,
            } as CSSProperties}
          />
        </picture>
        <div
          className="hero-scene-shade"
          style={{
            opacity:
              Math.max(0, Math.min(90, slide.overlay_opacity ?? 20)) / 100,
          }}
        />
        <div className="hero-scene-safe" data-testid="home-hero-content">
          {positioned(
            "content",
            <div className="hero-scene-copy">
              {slide.eyebrow ? (
                <div className="hero-scene-eyebrow">{slide.eyebrow}</div>
              ) : null}
              {slide.title ? <h2>{slide.title}</h2> : null}
              {slide.subtitle ? <p>{slide.subtitle}</p> : null}
              {placement === "inline" && buttons.length > 0
                ? buttonNodes
                : null}
              {editor && !slide.title && !slide.subtitle && !slide.eyebrow ? (
                <span>
                  {ar
                    ? "أضف عنوانًا من حقول النص"
                    : "Add a title using the text fields"}
                </span>
              ) : null}
            </div>,
          )}
          {placement === "free" && buttons.length > 0
            ? positioned("buttons", buttonNodes)
            : null}
        </div>
      </div>
      {placement === "below" && buttons.length > 0 ? (
        <div className="hero-scene-below">{buttonNodes}</div>
      ) : null}
    </div>
  );
}
