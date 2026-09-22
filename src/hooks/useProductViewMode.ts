import { useEffect, useState } from "react";

export type ProductViewMode = "dense" | "grid";

const DEFAULT_STORAGE_KEY = "space-cell-product-view-mode";

export function useProductViewMode(
  defaultMode: ProductViewMode = "grid",
  storageKey = DEFAULT_STORAGE_KEY,
) {
  const [mode, setMode] = useState<ProductViewMode>(defaultMode);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "dense" || stored === "grid") setMode(stored);
      else if (stored === "list") window.localStorage.setItem(storageKey, "grid");
    } catch {
      // Storage can be unavailable in private/restricted browser contexts.
    }
  }, [storageKey]);

  const update = (next: ProductViewMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      // Keep the in-memory preference if storage is unavailable.
    }
  };

  return [mode, update] as const;
}
