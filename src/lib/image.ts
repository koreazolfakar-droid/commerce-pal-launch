/**
 * Shopify CDN image helpers.
 *
 * Shopify's image CDN supports on-the-fly resizing through query params, so we
 * request exactly the pixels we render instead of shipping full-size originals.
 * This is the single biggest byte saving on a product-heavy storefront.
 */

const SHOPIFY_CDN = /cdn\.shopify\.com|shopifycdn\.(net|com)/;

/** Returns a width-constrained CDN url (no-op for non-Shopify sources). */
export function cdnImage(url: string | undefined, width: number): string | undefined {
  if (!url) return undefined;
  if (!SHOPIFY_CDN.test(url)) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("width", String(Math.round(width)));
    // Keep thumbnails and compact product imagery at the existing quality while
    // compressing large display assets a little more. Large hero/LCP candidates
    // benefit most from the byte reduction without changing layout or dimensions.
    const quality = width >= 960 ? 70 : 76;
    parsed.searchParams.set("format", "webp");
    parsed.searchParams.set("quality", String(quality));
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Builds a responsive width-descriptor srcset so mobile never downloads desktop artwork. */
export function cdnSrcSet(url: string | undefined, width: number): string | undefined {
  if (!url || !SHOPIFY_CDN.test(url)) return undefined;
  const maximum = Math.max(320, Math.round(width * 2));
  const candidates = [160, 240, 320, 480, 640, 800, 960, 1200, 1600, 1800, 2400, maximum]
    .filter((candidate) => candidate <= maximum)
    .concat(maximum);
  const widths = [...new Set(candidates)].sort((a, b) => a - b);
  return widths.map((candidate) => `${cdnImage(url, candidate)} ${candidate}w`).join(", ");
}
