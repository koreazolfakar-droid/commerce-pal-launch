export const APP_ORIGIN: string;
export const SUPABASE_ORIGIN: string;
export const CACHE_VERSION: string;
export const CACHE_PREFIX: string;
export const CACHE_CONFIG: Readonly<Record<string, { name: string; maxEntries: number; maxAgeSeconds: number }>>;
export function isApprovedMediaUrl(url: URL): boolean;
export function classifyCacheRequest(request: Request): "static" | "images" | null;
export function isCacheableResponse(response: Response, expectedKind: "static" | "images"): boolean;
