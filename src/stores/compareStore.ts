import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { trackHandleEvent } from "@/lib/analytics";

export const MAX_COMPARE_PRODUCTS = 4;

interface CompareState {
  handles: string[];
  add: (handle: string) => "added" | "exists" | "full";
  remove: (handle: string) => void;
  toggle: (handle: string) => "added" | "removed" | "full";
  clear: () => void;
  replace: (handles: string[]) => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      handles: [],
      add: (handle) => {
        const current = get().handles;
        if (current.includes(handle)) return "exists";
        if (current.length >= MAX_COMPARE_PRODUCTS) return "full";
        set({ handles: [...current, handle] });
        trackHandleEvent("compare_product", handle);
        return "added";
      },
      remove: (handle) =>
        set((state) => ({ handles: state.handles.filter((item) => item !== handle) })),
      toggle: (handle) => {
        const current = get().handles;
        if (current.includes(handle)) {
          set({ handles: current.filter((item) => item !== handle) });
          return "removed";
        }
        if (current.length >= MAX_COMPARE_PRODUCTS) return "full";
        set({ handles: [...current, handle] });
        trackHandleEvent("compare_product", handle);
        return "added";
      },
      clear: () => set({ handles: [] }),
      replace: (handles) => set({ handles: [...new Set(handles)].slice(0, MAX_COMPARE_PRODUCTS) }),
    }),
    { name: "space-cell-compare", storage: createJSONStorage(() => localStorage) },
  ),
);
