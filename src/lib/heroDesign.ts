export type HeroPoint = { x: number; y: number };
export type HeroLayout = { content: HeroPoint; buttons: HeroPoint };
export type HeroVisualConfig = {
  vertical: "top" | "center" | "bottom";
  titleSize: "compact" | "standard" | "large";
  contentWidth: "narrow" | "standard" | "wide";
  buttonRadius: "soft" | "rounded" | "pill";
  buttonPlacement?: "inline" | "free" | "below";
  desktopLayout?: HeroLayout;
  mobileLayout?: HeroLayout;
  /** Legacy focal point kept for backward compatibility with existing slides. */
  focalPoint?: HeroPoint;
  desktopFocalPoint?: HeroPoint;
  mobileFocalPoint?: HeroPoint;
};

export const DEFAULT_HERO_VISUAL_CONFIG: HeroVisualConfig = {
  vertical: "bottom",
  titleSize: "standard",
  contentWidth: "standard",
  buttonRadius: "rounded",
};

export function clampHeroPercent(value: unknown, fallback = 50): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : fallback;
}

function point(value: unknown): HeroPoint | undefined {
  if (!value || typeof value !== "object") return undefined;
  const p = value as Record<string, unknown>;
  if (typeof p.x !== "number" || typeof p.y !== "number") return undefined;
  return { x: clampHeroPercent(p.x), y: clampHeroPercent(p.y) };
}

function layout(value: unknown): HeroLayout | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  const content = point(v.content),
    buttons = point(v.buttons);
  return content && buttons ? { content, buttons } : undefined;
}

export function normalizeHeroVisualConfig(value: unknown): HeroVisualConfig {
  const v =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const desktopLayout = layout(v.desktopLayout),
    mobileLayout = layout(v.mobileLayout),
    focalPoint = point(v.focalPoint),
    desktopFocalPoint = point(v.desktopFocalPoint),
    mobileFocalPoint = point(v.mobileFocalPoint);
  return {
    vertical:
      v.vertical === "top" || v.vertical === "center" ? v.vertical : "bottom",
    titleSize:
      v.titleSize === "compact" || v.titleSize === "large"
        ? v.titleSize
        : "standard",
    contentWidth:
      v.contentWidth === "narrow" || v.contentWidth === "wide"
        ? v.contentWidth
        : "standard",
    buttonRadius:
      v.buttonRadius === "soft" || v.buttonRadius === "pill"
        ? v.buttonRadius
        : "rounded",
    ...(v.buttonPlacement === "free" || v.buttonPlacement === "below"
      ? { buttonPlacement: v.buttonPlacement }
      : {}),
    ...(desktopLayout ? { desktopLayout } : {}),
    ...(mobileLayout ? { mobileLayout } : {}),
    ...(focalPoint ? { focalPoint } : {}),
    ...(desktopFocalPoint ? { desktopFocalPoint } : {}),
    ...(mobileFocalPoint ? { mobileFocalPoint } : {}),
  };
}

export function defaultHeroLayout(
  config: HeroVisualConfig,
  alignment?: string,
  rtl = false,
): HeroLayout {
  const logicalX = alignment === "center" ? 50 : alignment === "end" ? 100 : 0;
  const x = rtl ? 100 - logicalX : logicalX;
  return {
    content: {
      x,
      y:
        config.vertical === "top"
          ? 0
          : config.vertical === "center"
            ? 50
            : config.buttonPlacement === "free"
              ? 75
              : 100,
    },
    buttons: { x, y: 100 },
  };
}

/** Positions use the remaining space, keeping the entire element inside its canvas. */
export function moveHeroPoint(
  origin: HeroPoint,
  dx: number,
  dy: number,
  availableWidth: number,
  availableHeight: number,
): HeroPoint {
  const snap = (v: number) => (Math.abs(v - 50) < 2 ? 50 : clampHeroPercent(v));
  return {
    x: snap(origin.x + (availableWidth > 0 ? (dx / availableWidth) * 100 : 0)),
    y: snap(
      origin.y + (availableHeight > 0 ? (dy / availableHeight) * 100 : 0),
    ),
  };
}
