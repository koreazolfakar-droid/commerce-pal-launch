import { useEffect, useMemo, useRef, useState } from "react";

import { brandLogoSources, brandMonogram } from "@/lib/brands";
import { cdnImage, cdnSrcSet } from "@/lib/image";
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

const PADDED_SQUARE_WORDMARKS = new Set(["ugreen"]);

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

  // Keep optical corrections intentionally modest. The rail now reserves width
  // from the label length and clips inside that invisible slot, so no logo is
  // allowed to grow into its neighbour even when merchant artwork has padding.
  const knownScale: Record<string, number> = {
    apple: 0.98,
    xiaomi: 1,
    samsung: 1.08,
    anker: 1.05,
    acefast: 1.28,
  };
  if (knownScale[key] !== undefined) return knownScale[key];

  if (aspectRatio >= 5) {
    return Math.min(1.22, Math.max(1.08, aspectRatio / 6));
  }
  if (aspectRatio >= 3.2) return 1.06;

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
  const merchantSource = safeImageSource(imageUrl);
  const sources = useMemo(() => {
    const builtIn = brandLogoSources(slug, label, size * 2)
      .map(safeImageSource)
      .filter(Boolean) as string[];
    const merchant = safeImageSource(imageUrl);

    // Shopify is the merchant-controlled source of truth. A curated local logo
    // remains a resilient fallback when Shopify has no image or the remote image
    // fails to load, but it must never prevent a merchant logo update from showing.
    const ordered = merchant ? [merchant, ...builtIn] : builtIn;

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

  const brandKey = normalizeBrandKey(slug, label);
  const paddedSquareMerchantWordmark = Boolean(
    normalizeForRail &&
    wordmark &&
    merchantSource &&
    source === merchantSource &&
    PADDED_SQUARE_WORDMARKS.has(brandKey) &&
    imageAspectRatio >= 0.85 &&
    imageAspectRatio <= 1.15,
  );
  const opticalScale = normalizeForRail ? railOpticalScale(slug, label, imageAspectRatio) : 1;
  const displayScale = paddedSquareMerchantWordmark ? Math.max(opticalScale, 1.08) : opticalScale;
  const compactLabelLength = label.replace(/[^a-z0-9]/gi, "").length;
  const normalizedWordmarkRatio = paddedSquareMerchantWordmark
    ? 2.8
    : Math.min(2.8, Math.max(2.05, 1.7 + Math.min(compactLabelLength, 10) * 0.12));
  const frameWidth = wordmark ? size * (normalizeForRail ? normalizedWordmarkRatio : 2.6) : size;
  const requestedWidth = Math.max(64, Math.ceil(frameWidth * 2));
  const renderedSource = source ? (cdnImage(source, requestedWidth) ?? source) : undefined;
  const renderedSrcSet = source ? cdnSrcSet(source, requestedWidth) : undefined;

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
          ? normalizeForRail
            ? "overflow-hidden rounded-none bg-transparent"
            : "overflow-visible rounded-none bg-transparent"
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
      {source && renderedSource && (
        <img
          ref={imgRef}
          key={source}
          src={renderedSource}
          srcSet={renderedSrcSet}
          sizes={`${Math.round(frameWidth)}px`}
          alt={`${label} logo`}
          width={Math.round(frameWidth)}
          height={size}
          loading="lazy"
          decoding="async"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            opacity: loaded ? 1 : 0,
            transform: displayScale === 1 ? undefined : `scale(${displayScale})`,
            transformOrigin: "center",
          }}
          onLoad={(event) => {
            captureNaturalSize(event.currentTarget);
            setLoadedSource(source);
          }}
          onError={() => setAttempt((value) => value + 1)}
          className={cn(
            "relative min-h-0 min-w-0 transition-[opacity,transform] duration-150",
            paddedSquareMerchantWordmark ? "object-cover" : "object-contain",
          )}
        />
      )}
    </span>
  );
}
