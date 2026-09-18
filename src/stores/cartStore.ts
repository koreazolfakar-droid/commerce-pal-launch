import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ShopifyProduct } from "@/lib/shopify";

type Money = { amount: string; currencyCode: string };

export interface CartItem {
  lineId: string | null;
  product: ShopifyProduct;
  variantId: string;
  variantTitle: string;
  price: Money;
  quantity: number;
  selectedOptions: Array<{ name: string; value: string }>;
}

interface CartStore {
  items: CartItem[];
  cartId: string | null;
  checkoutUrl: string | null;
  subtotal: Money | null;
  total: Money | null;
  isLoading: boolean;
  isSyncing: boolean;
  addItem: (item: Omit<CartItem, "lineId">) => Promise<boolean>;
  updateQuantity: (variantId: string, quantity: number) => Promise<boolean>;
  removeItem: (variantId: string) => Promise<boolean>;
  clearCart: () => void;
  syncCart: () => Promise<void>;
  getCheckoutUrl: () => string | null;
}

function moneyTotal(items: CartItem[]): Money | null {
  if (!items.length) return null;
  const currencyCode = items[0]?.price.currencyCode || "USD";
  const amount = items
    .reduce((sum, item) => sum + Number(item.price.amount || 0) * item.quantity, 0)
    .toFixed(2);
  return { amount, currencyCode };
}

function localCartState(items: CartItem[]) {
  const total = moneyTotal(items);
  return {
    items,
    cartId: null,
    checkoutUrl: null,
    subtotal: total,
    total,
  };
}

/**
 * Space Call native cart.
 *
 * The cart is intentionally local-first: no Shopify cart ID, Storefront mutation,
 * or remote checkout URL is required. Server-side validation happens when the
 * order is created in the native Supabase order pipeline.
 */
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      checkoutUrl: null,
      subtotal: null,
      total: null,
      isLoading: false,
      isSyncing: false,

      addItem: async (item) => {
        await hydrateCartStore();
        set({ isLoading: true });
        try {
          const current = get().items;
          const existingIndex = current.findIndex((entry) => entry.variantId === item.variantId);
          const next = [...current];

          if (existingIndex >= 0) {
            const existing = next[existingIndex]!;
            next[existingIndex] = {
              ...existing,
              ...item,
              lineId: null,
              quantity: existing.quantity + Math.max(1, item.quantity),
            };
          } else {
            next.push({ ...item, lineId: null, quantity: Math.max(1, item.quantity) });
          }

          set(localCartState(next));
          return true;
        } finally {
          set({ isLoading: false });
        }
      },

      updateQuantity: async (variantId, quantity) => {
        if (quantity <= 0) return get().removeItem(variantId);
        await hydrateCartStore();
        set({ isLoading: true });
        try {
          const next = get().items.map((item) =>
            item.variantId === variantId ? { ...item, quantity } : item,
          );
          if (!next.some((item) => item.variantId === variantId)) return false;
          set(localCartState(next));
          return true;
        } finally {
          set({ isLoading: false });
        }
      },

      removeItem: async (variantId) => {
        await hydrateCartStore();
        set({ isLoading: true });
        try {
          const current = get().items;
          const next = current.filter((item) => item.variantId !== variantId);
          if (next.length === current.length) return false;
          set(localCartState(next));
          return true;
        } finally {
          set({ isLoading: false });
        }
      },

      clearCart: () => set(localCartState([])),

      // Kept for API compatibility with existing UI. Native carts have no
      // remote state to synchronize and no Shopify checkout URL.
      syncCart: async () => {
        await hydrateCartStore();
      },
      getCheckoutUrl: () => null,
    }),
    {
      name: "space-call-cart",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ items: state.items }),
      merge: (persisted, current) => {
        const saved = (persisted as Partial<CartStore> | undefined)?.items ?? [];
        return { ...current, ...localCartState(saved) };
      },
    },
  ),
);


let cartHydrationPromise: Promise<void> | null = null;

/**
 * Hydrate the persisted native cart exactly once per browser runtime.
 *
 * Mutations await this same promise so a late localStorage rehydrate can never
 * overwrite an item the user just added during initial client hydration.
 */
export function hydrateCartStore(): Promise<void> {
  if (!cartHydrationPromise) {
    cartHydrationPromise = Promise.resolve(useCartStore.persist.rehydrate())
      .then(() => undefined)
      .catch((error) => {
        cartHydrationPromise = null;
        throw error;
      });
  }

  return cartHydrationPromise;
}
