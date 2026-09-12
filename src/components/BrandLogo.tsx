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
};

function isValidImageSource(value: string | undefined): value is string {
  if (!value) return false;
  const source = value.trim();
  if (!source || source.startsWith("<") || source.includes("<svg")) return false;
  return /^(?:https?:\/\/|\/|data:image\/)/i.test(source);
}

export function BrandLogo({ size = 40, ...props }: BrandLogoProps) {
  // Reset loading/error state when a card is reused for a different brand or source.
  return (
    <LogoImage
      key={`${props.slug}:${props.label}:${props.imageUrl ?? ""}:${size}:${props.wordmark ?? false}`}
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
}: BrandLogoProps) {
  const sources = useMemo(() => {
    // Known brands always prefer bundled assets. Shopify collection imagery is only a
    // fallback, which prevents stale/broken collection images or raw SVG strings from
    // replacing the verified local logo.
    const candidates = [
      ...brandLogoSources(slug, label, size * 2),
      ...(isValidImageSource(imageUrl) ? [imageUrl] : []),
    ];
    return [...new Set(candidates.filter(isValidImageSource))];
  }, [imageUrl, slug, label, size]);
  const [attempt, setAttempt] = useState(0);
  const [loadedSource, setLoadedSource] = useState<string>();
  const imgRef = useRef<HTMLImageElement>(null);
  const source = sources[attempt];
  const loaded = Boolean(source && loadedSource === source);

  // Catch cached loads/errors which happened before hydration attached the handlers.
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !source || !img.complete) return;
    if (img.naturalWidth > 0) setLoadedSource(source);
    else setAttempt((value) => value + 1);
  }, [source]);

  return (
    <span
      role="img"
      aria-label={`${label} logo`}
      style={{ width: wordmark ? size * 2.6 : size, height: size }}
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-md bg-white",
        className,
      )}
    >
      {!loaded && (
        <span
          aria-hidden="true"
          style={{
            fontSize: wordmark ? 13 : Math.max(10, size * 0.34),
          }}
          className="absolute inset-0 grid place-items-center bg-white text-center font-semibold leading-tight text-black"
        >
          {wordmark ? label : brandMonogram(label)}
        </span>
      )}
      {source && (
        <img
          ref={imgRef}
          key={source}
          src={source}
          alt=""
          aria-hidden="true"
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          style={{ width: "100%", height: "100%", opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoadedSource(source)}
          onError={() => setAttempt((value) => value + 1)}
          className="relative min-h-0 min-w-0 object-contain transition-opacity"
        />
      )}
    </span>
  );
}
