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
}: {
  slug: string;
  label: string;
  size?: number;
  className?: string;
}) {
  const sources = useMemo(
    () => brandLogoSources(slug, label, size * 2).filter((source) => !failed.has(source)),
    [slug, label, size],
  );
  const [attempt, setAttempt] = useState(0);
  const source = sources[attempt];

  if (!source) {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size, fontSize: Math.max(11, size * 0.34) }}
        className={cn(
          "grid shrink-0 place-items-center rounded-xl bg-accent font-extrabold tracking-tight text-accent-foreground",
          className,
        )}
      >
        {brandMonogram(label)}
      </span>
    );
  }

  return (
    <img
      src={source}
      alt={`${label} logo`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={{ width: size, height: size }}
      onError={() => {
        failed.add(source);
        setAttempt((value) => value + 1);
      }}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
