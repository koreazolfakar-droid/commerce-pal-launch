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
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Builds a `srcset` for 1x/2x displays at the given layout width. */
export function cdnSrcSet(url: string | undefined, width: number): string | undefined {
  if (!url || !SHOPIFY_CDN.test(url)) return undefined;
  const one = cdnImage(url, width);
  const two = cdnImage(url, width * 2);
  if (!one || !two) return undefined;
  return `${one} 1x, ${two} 2x`;
}
