const LAZY_CHUNK_ERROR_PATTERN =
  /failed to fetch dynamically imported module|importing a module script failed|chunkloaderror|loading chunk|error loading dynamically imported module/i;
const LAZY_CHUNK_RELOAD_PREFIX = "space-call:lazy-chunk-reload:";

export function isLazyChunkLoadError(error: unknown) {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return LAZY_CHUNK_ERROR_PATTERN.test(message);
}

/**
 * Recover a stale deployed lazy chunk exactly once per chunk key.
 *
 * A deployment can leave an already-open tab pointing at a hashed JS asset that
 * no longer exists. React.lazy surfaces that as a rejected dynamic import and
 * the root route otherwise replaces the whole storefront with its error page.
 * A guarded hard reload fetches the fresh document/asset manifest without
 * creating a reload loop if the new deployment is genuinely broken.
 */
export async function importWithChunkRecovery<T>(
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const storageKey = LAZY_CHUNK_RELOAD_PREFIX + key;

  try {
    const module = await load();

    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(storageKey);
      } catch {
        // Session storage is optional; a successful import needs no recovery state.
      }
    }

    return module;
  } catch (error) {
    if (typeof window !== "undefined" && isLazyChunkLoadError(error)) {
      let canUseReloadGuard = false;
      let alreadyReloaded = false;

      try {
        canUseReloadGuard = true;
        alreadyReloaded = window.sessionStorage.getItem(storageKey) === "1";
      } catch {
        // Never auto-reload without a working guard; that could create a loop.
      }

      if (canUseReloadGuard && !alreadyReloaded) {
        try {
          window.sessionStorage.setItem(storageKey, "1");
        } catch {
          throw error;
        }

        window.location.reload();

        // Keep Suspense pending while the browser navigates to the fresh document.
        return await new Promise<T>(() => undefined);
      }
    }

    throw error;
  }
}
