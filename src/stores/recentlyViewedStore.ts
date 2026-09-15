import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface RecentlyViewedState {
  handles: string[];
  add: (handle: string) => void;
}

const MAX_ITEMS = 12;

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      handles: [],
      add: (handle) =>
        set((state) => ({
          handles: [handle, ...state.handles.filter((item) => item !== handle)].slice(0, MAX_ITEMS),
        })),
    }),
    {
      name: "space-cell-recently-viewed",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
