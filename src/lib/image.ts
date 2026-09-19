/**
 * Storefront image helpers.
 *
 * Product media is now stored in Space Call's Supabase Storage. Keep this
 * compatibility layer so components do not need a broad image API refactor.
 */
export function cdnImage(url: string | undefined, _width: number): string | undefined {
  return url || undefined;
}

/**
 * Native Supabase media currently uses the original public object URL.
 * Returning undefined lets the browser use the normal src without inventing
 * provider-specific transformation parameters.
 */
export function cdnSrcSet(_url: string | undefined, _width: number): string | undefined {
  return undefined;
}
