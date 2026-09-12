/**
 * Image delivery helpers.
 *
 * Shopify CDN already provides a high quality image transformation pipeline, so
 * the fastest path is to never download the original asset when the UI only
 * needs a smaller representation. These helpers centralise width, quality and
 * modern-format negotiation and also generate responsive candidates.
 */

const SHOPIFY_CDN = /cdn\.shopify\.com|shopifycdn\.(net|com)/i;

export type ImageFit = "crop" | "contain";

export interface OptimizedImageOptions {
  width: number;
  quality?: number;
  format?: "webp" | "avif";
  height?: number;
  fit?: ImageFit;
}

export function isShopifyImage(url: string | undefined): boolean {
  return Boolean(url && SHOPIFY_CDN.test(url));
}

/**
 * Returns a CDN-transformed URL for Shopify images and leaves local/third-party
 * assets untouched. Width and quality are clamped to sane storefront values.
 */
export function cdnImage(
  url: string | undefined,
  widthOrOptions: number | OptimizedImageOptions,
): string | undefined {
  if (!url) return undefined;
  if (!isShopifyImage(url)) return url;

  const options: OptimizedImageOptions =
    typeof widthOrOptions === "number"
      ? { width: widthOrOptions }
      : widthOrOptions;

  try {
    const parsed = new URL(url);
    const width = Math.max(64, Math.min(2400, Math.round(options.width)));
    const quality = Math.max(55, Math.min(90, Math.round(options.quality ?? 78)));

    parsed.searchParams.set("width", String(width));
    parsed.searchParams.set("format", options.format ?? "webp");
    parsed.searchParams.set("quality", String(quality));

    if (options.height) {
      parsed.searchParams.set("height", String(Math.max(64, Math.min(2400, Math.round(options.height)))));
    }
    if (options.fit) parsed.searchParams.set("crop", options.fit === "crop" ? "center" : "none");

    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Generates width-descriptor candidates so the browser can select the smallest
 * useful Shopify CDN image for the actual viewport and DPR.
 */
export function cdnSrcSet(
  url: string | undefined,
  baseWidth: number,
  widths?: number[],
  quality = 78,
): string | undefined {
  if (!url || !isShopifyImage(url)) return undefined;

  const candidates = widths ?? [
    Math.max(160, Math.round(baseWidth * 0.5)),
    Math.max(240, Math.round(baseWidth * 0.75)),
    Math.max(320, Math.round(baseWidth)),
    Math.max(480, Math.round(baseWidth * 1.5)),
    Math.max(640, Math.round(baseWidth * 2)),
  ];

  const unique = Array.from(new Set(candidates.map((value) => Math.min(2400, Math.round(value)))))
    .filter((value) => value > 0)
    .sort((a, b) => a - b);

  const srcset = unique
    .map((width) => {
      const transformed = cdnImage(url, { width, quality });
      return transformed ? `${transformed} ${width}w` : null;
    })
    .filter(Boolean)
    .join(", ");

  return srcset || undefined;
}

/** Conservative defaults used by product cards. */
export const productImageSizes = {
  card: "(max-width: 639px) 46vw, (max-width: 1023px) 31vw, 280px",
  compactCard: "(max-width: 639px) 31vw, 220px",
  gallery: "(min-width: 1024px) 560px, 92vw",
  hero: "(max-width: 639px) 100vw, (min-width: 1280px) 1280px, 100vw",
} as const;
