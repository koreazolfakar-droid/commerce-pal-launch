import { useEffect } from "react";

import { hydrateCartStore } from "@/stores/cartStore";
import { useRecentlyViewedStore } from "@/stores/recentlyViewedStore";
import { useWishlistStore } from "@/stores/wishlistStore";

/**
 * Persisted browser state must hydrate after React has attached to the SSR HTML.
 * This keeps the server and first client render identical, preventing hydration
 * mismatches while still restoring cart, wishlist and preference state promptly.
 */
export function usePersistedStoreHydration() {
  useEffect(() => {
    void Promise.all([
      hydrateCartStore(),
      Promise.resolve(useWishlistStore.persist.rehydrate()),
      Promise.resolve(useRecentlyViewedStore.persist.rehydrate()),
    ]);
  }, []);
}
