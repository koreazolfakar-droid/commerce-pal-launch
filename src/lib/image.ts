/**
 * Storefront image helpers.
 *
 * Product originals stay untouched in Supabase Storage. Product cards and
 * galleries request high-quality responsive WebP variants through Space Call's
 * free responsive-image Edge Function. The original URL remains the fallback.
 */

const STORAGE_PUBLIC_MARKER = "/storage/v1/object/public/cms-media/";
const RESPONSIVE_PRODUCT_WIDTHS = [160, 240, 320, 480, 640, 828, 960, 1280, 1600, 1920] as const;

type ResponsiveSource = {
  origin: string;
  path: string;
};

function responsiveSource(url: string | undefined): ResponsiveSource | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const markerIndex = parsed.pathname.indexOf(STORAGE_PUBLIC_MARKER);
    if (markerIndex < 0) return null;

    const encodedPath = parsed.pathname.slice(markerIndex + STORAGE_PUBLIC_MARKER.length);
    const path = decodeURIComponent(encodedPath);
    if (!path.startsWith("products/")) return null;

    return { origin: parsed.origin, path };
  } catch {
    return null;
  }
}

export function responsiveImageUrl(url: string | undefined, width: number): string | undefined {
  const source = responsiveSource(url);
  if (!source) return undefined;

  const normalizedWidth = RESPONSIVE_PRODUCT_WIDTHS.reduce((best, candidate) => {
    return Math.abs(candidate - width) < Math.abs(best - width) ? candidate : best;
  }, RESPONSIVE_PRODUCT_WIDTHS[0]);

  const params = new URLSearchParams({
    path: source.path,
    w: String(normalizedWidth),
  });
  return `${source.origin}/functions/v1/responsive-image?${params.toString()}`;
}

/**
 * Keep the original object URL as the src fallback. Modern browsers will choose
 * a responsive candidate from srcset; if the variant service is unavailable,
 * components can drop srcset and immediately retry the untouched original.
 */
export function cdnImage(url: string | undefined, _width: number): string | undefined {
  return url || undefined;
}

export function cdnSrcSet(url: string | undefined, width: number): string | undefined {
  const source = responsiveSource(url);
  if (!source) return undefined;

  const cap = Math.min(1920, Math.max(640, Math.ceil(width * 2)));
  const candidates = RESPONSIVE_PRODUCT_WIDTHS.filter((candidate) => candidate <= cap);
  const widths =
    candidates.length > 0
      ? candidates
      : [RESPONSIVE_PRODUCT_WIDTHS[0]];

  return widths
    .map((candidate) => {
      const params = new URLSearchParams({
        path: source.path,
        w: String(candidate),
      });
      return `${source.origin}/functions/v1/responsive-image?${params.toString()} ${candidate}w`;
    })
    .join(", ");
}
