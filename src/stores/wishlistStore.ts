import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
        set((state) => ({
          handles: state.handles.includes(handle)
            ? state.handles.filter((item) => item !== handle)
            : [...state.handles, handle],
        })),
      has: (handle) => get().handles.includes(handle),
    }),
    {
      name: "space-cell-wishlist",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
