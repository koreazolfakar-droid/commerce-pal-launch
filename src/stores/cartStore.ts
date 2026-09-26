import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { fetchProductsByIds } from "@/lib/storefrontData";
import type { StoreProduct } from "@/lib/storeTypes";

type Money = { amount: string; currencyCode: string };

export interface CartItem {
  lineId: string | null;
  product: StoreProduct;
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

function cartVariant(item: CartItem) {
  return item.product.node.variants.edges.find((edge) => edge.node.id === item.variantId)?.node;
}

export function cartItemMaxQuantity(item: CartItem) {
  const variant = cartVariant(item);
  if (!variant?.availableForSale) return 0;
  if (variant.trackInventory && !variant.allowBackorder) {
    return Math.max(0, Math.min(99, Math.trunc(variant.stockQuantity ?? 0)));
  }
  return 99;
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
 * The cart is intentionally local-first: no remote cart ID, Storefront mutation,
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
        set({ isLoading: true });
        try {
          const current = get().items;
          const existingIndex = current.findIndex((entry) => entry.variantId === item.variantId);
          const next = [...current];

          if (existingIndex >= 0) {
            const existing = next[existingIndex]!;
            const requested = existing.quantity + Math.max(1, item.quantity);
            const refreshed = { ...existing, ...item, lineId: null, quantity: requested };
            const maxQuantity = cartItemMaxQuantity(refreshed);
            if (maxQuantity < 1) return false;
            next[existingIndex] = {
              ...refreshed,
              quantity: Math.min(requested, maxQuantity),
            };
          } else {
            const candidate = { ...item, lineId: null, quantity: Math.max(1, item.quantity) };
            const maxQuantity = cartItemMaxQuantity(candidate);
            if (maxQuantity < 1) return false;
            next.push({ ...candidate, quantity: Math.min(candidate.quantity, maxQuantity) });
          }

          set(localCartState(next));
          return true;
        } finally {
          set({ isLoading: false });
        }
      },

      updateQuantity: async (variantId, quantity) => {
        if (quantity <= 0) return get().removeItem(variantId);
        set({ isLoading: true });
        try {
          const current = get().items;
          const target = current.find((item) => item.variantId === variantId);
          if (!target) return false;
          const maxQuantity = cartItemMaxQuantity(target);
          if (maxQuantity < 1) return false;
          const safeQuantity = Math.min(Math.max(1, Math.trunc(quantity)), maxQuantity);
          const next = current.map((item) =>
            item.variantId === variantId ? { ...item, quantity: safeQuantity } : item,
          );
          set(localCartState(next));
          return true;
        } finally {
          set({ isLoading: false });
        }
      },

      removeItem: async (variantId) => {
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

      syncCart: async () => {
        if (get().isSyncing) return;
        const current = get().items;
        if (!current.length) return;

        set({ isSyncing: true });
        try {
          const products = await fetchProductsByIds(
            [...new Set(current.map((item) => item.product.node.id))],
          );
          const productById = new Map(products.map((product) => [product.node.id, product]));
          const fetchedProductIds = new Set(current.map((item) => item.product.node.id));
          const next: CartItem[] = [];

          for (const item of get().items) {
            if (!fetchedProductIds.has(item.product.node.id)) {
              next.push(item);
              continue;
            }

            const product = productById.get(item.product.node.id);
            if (!product) continue;
            const variant = product.node.variants.edges.find(
              (edge) => edge.node.id === item.variantId,
            )?.node;
            if (!variant?.availableForSale) continue;

            const refreshed: CartItem = {
              ...item,
              product,
              variantTitle: variant.title,
              price: variant.price,
              selectedOptions: variant.selectedOptions,
            };
            const maxQuantity = cartItemMaxQuantity(refreshed);
            if (maxQuantity < 1) continue;
            next.push({
              ...refreshed,
              quantity: Math.min(Math.max(1, item.quantity), maxQuantity),
            });
          }

          set(localCartState(next));
        } catch (error) {
          console.warn("[cart] storefront synchronization failed; keeping the last local cart.", error);
        } finally {
          set({ isSyncing: false });
        }
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
