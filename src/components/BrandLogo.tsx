import { useMemo, useState } from "react";

import { brandLogoSources, brandMonogram } from "@/lib/brands";
import { cn } from "@/lib/utils";

/** Module-level cache of sources that already failed, so we never retry them. */
const failed = new Set<string>();

/**
 * Renders a brand logo for any Shopify vendor. Walks the resolved logo
 * candidates and degrades to a polished monogram — never a broken image.
 */
export function BrandLogo({
  slug,
  label,
  size = 40,
  className,
  imageUrl,
}: {
  slug: string;
  label: string;
  size?: number;
  className?: string;
  /** Logo served by Shopify (collection/brand image); always preferred. */
  imageUrl?: string;
}) {
  const sources = useMemo(
    () =>
      [...(imageUrl ? [imageUrl] : []), ...brandLogoSources(slug, label, size * 2)].filter(
        (source) => !failed.has(source),
      ),
    [imageUrl, slug, label, size],
  );
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const source = sources[attempt];

  // The monogram is always the base layer, so a logo that is still loading (or
  // that 404s while we walk the candidate list) never flashes a broken image.
  return (
    <span
      style={{ width: size, height: size }}
      className={cn("relative grid shrink-0 place-items-center", className)}
    >
      {!loaded && (
        <span
          aria-hidden="true"
          style={{ fontSize: Math.max(10, size * 0.34) }}
          className="absolute inset-0 grid place-items-center rounded-xl bg-accent font-extrabold tracking-tight text-accent-foreground"
        >
          {brandMonogram(label)}
        </span>
      )}
      {source && (
        <img
          key={source}
          src={source}
          alt={`${label} logo`}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          style={{ width: size, height: size, opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          onError={() => {
            failed.add(source);
            setAttempt((value) => value + 1);
          }}
          className="relative object-contain transition-opacity"
        />
      )}
    </span>
  );
}

