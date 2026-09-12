import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { trackHandleEvent } from "@/lib/analytics";

interface WishlistState {
  handles: string[];
  toggle: (handle: string) => void;
  has: (handle: string) => boolean;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      handles: [],
      toggle: (handle) =>
        set((state) => {
          const adding = !state.handles.includes(handle);
          if (adding) trackHandleEvent("add_to_wishlist", handle);
          return {
            handles: adding
              ? [...state.handles, handle]
              : state.handles.filter((item) => item !== handle),
          };
        }),
      has: (handle) => get().handles.includes(handle),
    }),
    {
      name: "space-cell-wishlist",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
