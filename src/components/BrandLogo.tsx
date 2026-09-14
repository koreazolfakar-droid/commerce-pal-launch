import { useEffect, useMemo, useRef, useState } from "react";

import { brandLogoSources, brandMonogram } from "@/lib/brands";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  slug: string;
  label: string;
  size?: number;
  className?: string;
  imageUrl?: string;
  wordmark?: boolean;
  frameless?: boolean;
  normalizeForRail?: boolean;
};

function safeImageSource(value?: string) {
  const source = value?.trim();
  if (!source) return undefined;

  // Never allow escaped/raw markup to become an image source. This protects
  // against Shopify fields accidentally containing an inline <svg> string.
  if (/<\s*svg\b|<\/?[a-z][^>]*>/i.test(source)) return undefined;

  if (/^(?:https?:\/\/|\/|data:image\/|blob:)/i.test(source)) return source;
  return undefined;
}

function normalizeBrandKey(slug: string, label: string) {
  return (slug || label)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function railOpticalScale(slug: string, label: string, aspectRatio: number) {
  const key = normalizeBrandKey(slug, label);

  // ACEFAST's merchant artwork contains unusually generous whitespace around
  // the visible mark. Crop that whitespace optically inside the fixed rail
  // viewport instead of letting the logo look much smaller than its peers.
  if (key === "acefast") return 1.95;

  // Very wide merchant-supplied artwork often carries transparent/white side
  // padding. Give it a modest optical correction while keeping normal curated
  // wordmarks (Anker, Samsung, etc.) at their intended scale.
  if (aspectRatio >= 5) {
    return Math.min(1.55, Math.max(1, aspectRatio / 4.5));
  }

  return 1;
}

export function BrandLogo({ size = 40, ...props }: BrandLogoProps) {
  // Reset loading/error state when a card is reused for a different brand or source.
  return (
    <LogoImage
      key={`${props.slug}:${props.label}:${props.imageUrl ?? ""}:${size}:${props.wordmark ?? false}:${props.frameless ?? false}:${props.normalizeForRail ?? false}`}
      {...props}
      size={size}
    />
  );
}

function LogoImage({
  slug,
  label,
  size = 40,
  className,
  imageUrl,
  wordmark = false,
  frameless = false,
  normalizeForRail = false,
}: BrandLogoProps) {
  const sources = useMemo(() => {
    const builtIn = brandLogoSources(slug, label, size * 2)
      .map(safeImageSource)
      .filter(Boolean) as string[];
    const merchant = safeImageSource(imageUrl);
    const firstBuiltIn = builtIn[0];
    const builtInIsLocal = Boolean(firstBuiltIn && !/^https?:\/\//i.test(firstBuiltIn));

    // Curated local assets always win for the brands we explicitly ship with.
    // For brands without a local asset, a merchant-provided Shopify image wins
    // over remote fallbacks so CSP/CDN failures never create empty logo tiles.
    const ordered = builtInIsLocal
      ? [...builtIn, ...(merchant ? [merchant] : [])]
      : [...(merchant ? [merchant] : []), ...builtIn];

    return [...new Set(ordered)];
  }, [imageUrl, slug, label, size]);
  const [attempt, setAttempt] = useState(0);
  const [loadedSource, setLoadedSource] = useState<string>();
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const source = sources[attempt];
  const loaded = Boolean(source && loadedSource === source);

  const captureNaturalSize = (img: HTMLImageElement) => {
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setImageAspectRatio(img.naturalWidth / img.naturalHeight);
    }
  };

  const opticalScale = normalizeForRail
    ? railOpticalScale(slug, label, imageAspectRatio)
    : 1;
  const frameWidth = wordmark
    ? size * (normalizeForRail ? 2.05 : 2.6)
    : size;

  // Catch cached loads/errors which happened before hydration attached the handlers.
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !source || !img.complete) return;
    if (img.naturalWidth > 0) {
      captureNaturalSize(img);
      setLoadedSource(source);
    } else {
      setAttempt((value) => value + 1);
    }
  }, [source]);

  return (
    <span
      style={{ width: frameWidth, height: size }}
      className={cn(
        "relative inline-grid shrink-0 place-items-center",
        frameless
          ? "overflow-visible rounded-none bg-transparent"
          : normalizeForRail
            ? "overflow-hidden rounded-md bg-white"
            : wordmark
              ? "overflow-visible rounded-md bg-white"
              : "overflow-hidden rounded-md bg-white",
        className,
      )}
    >
      {!loaded && (
        <span
          style={{
            fontSize: wordmark ? 13 : Math.max(10, size * 0.34),
          }}
          className={cn(
            "absolute inset-0 grid place-items-center text-center font-semibold leading-tight text-black",
            frameless ? "bg-transparent" : "bg-white",
          )}
        >
          {wordmark ? label : brandMonogram(label)}
        </span>
      )}
      {source && (
        <img
          ref={imgRef}
          key={source}
          src={source}
          alt={`${label} logo`}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          style={{
            width: "100%",
            height: "100%",
            opacity: loaded ? 1 : 0,
            transform: opticalScale === 1 ? undefined : `scale(${opticalScale})`,
            transformOrigin: "center",
          }}
          onLoad={(event) => {
            captureNaturalSize(event.currentTarget);
            setLoadedSource(source);
          }}
          onError={() => setAttempt((value) => value + 1)}
          className="relative min-h-0 min-w-0 object-contain transition-[opacity,transform] duration-150"
        />
      )}
    </span>
  );
}
