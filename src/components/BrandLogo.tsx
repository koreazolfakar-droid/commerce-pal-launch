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

export function BrandLogo({ size = 40, ...props }: BrandLogoProps) {
  // Reset loading/error state when a card is reused for a different brand or source.
  return (
    <LogoImage
      key={`${props.slug}:${props.label}:${props.imageUrl ?? ""}:${size}:${props.wordmark ?? false}:${props.frameless ?? false}`}
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

  // Wide wordmarks used to look much smaller than square marks such as Xiaomi
  // because they were width-constrained inside the same logo slot. Scale only
  // genuinely wide marks, preserving their aspect ratio, so every brand has a
  // comparable optical height without stretching or blurring the artwork.
  const wordmarkScale = wordmark
    ? Math.min(1.55, Math.max(1, imageAspectRatio / 2.6))
    : 1;

  const captureNaturalSize = (img: HTMLImageElement) => {
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setImageAspectRatio(img.naturalWidth / img.naturalHeight);
    }
  };

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
      style={{ width: wordmark ? size * 2.6 : size, height: size }}
      className={cn(
        "relative inline-grid shrink-0 place-items-center",
        frameless
          ? "overflow-visible rounded-none bg-transparent"
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
            transform: `scale(${wordmarkScale})`,
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
