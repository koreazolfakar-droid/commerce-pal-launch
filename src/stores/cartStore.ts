import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  CART_CREATE_MUTATION,
  CART_LINES_ADD_MUTATION,
  CART_LINES_REMOVE_MUTATION,
  CART_LINES_UPDATE_MUTATION,
  CART_QUERY,
} from "@/lib/shopifyDocuments";
import { trackCartEvent } from "@/lib/analytics";
import { storefrontApiRequest, type ShopifyProduct } from "@/lib/shopify";
import { STORE_CONFIG } from "@/lib/storeConfig";

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

type UserError = { field: string[] | null; message: string };
type RemoteVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price: Money;
  compareAtPrice?: Money | null;
  image?: { url: string; altText: string | null } | null;
  selectedOptions: Array<{ name: string; value: string }>;
  product: {
    id: string;
    title: string;
    handle: string;
    vendor?: string;
    productType?: string;
    availableForSale?: boolean;
    tags?: string[];
    priceRange: { minVariantPrice: Money };
    compareAtPriceRange?: { minVariantPrice: Money };
    images: { edges: Array<{ node: { url: string; altText: string | null } }> };
  };
};
type RemoteCart = {
  id: string;
  totalQuantity: number;
  checkoutUrl: string;
  cost?: { subtotalAmount?: Money; totalAmount?: Money };
  lines: {
    edges: Array<{ node: { id: string; quantity: number; merchandise?: RemoteVariant | null } }>;
  };
};
type CartResult = { success: boolean; cart?: RemoteCart; cartNotFound?: boolean; error?: string };

function safeCheckoutUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const allowed =
      host === "checkout.shopify.com" ||
      host === STORE_CONFIG.shopifyDomain ||
      host.endsWith(".myshopify.com");
    return allowed && url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function cartNotFound(errors: UserError[]) {
  return errors.some((error) => /cart (not found|does not exist)/i.test(error.message));
}

function parsePayload(
  payload: { cart?: RemoteCart; userErrors?: UserError[] } | undefined,
): CartResult {
  const errors = payload?.userErrors ?? [];
  if (cartNotFound(errors)) return { success: false, cartNotFound: true };
  if (errors.length)
    return { success: false, error: errors.map((error) => error.message).join(", ") };
  const cart = payload?.cart;
  const checkoutUrl = safeCheckoutUrl(cart?.checkoutUrl);
  if (!cart?.id || !checkoutUrl)
    return { success: false, error: "Shopify returned an invalid cart." };
  return { success: true, cart: { ...cart, checkoutUrl } };
}

async function createCart(item: CartItem): Promise<CartResult> {
  const data = await storefrontApiRequest(CART_CREATE_MUTATION, {
    input: { lines: [{ quantity: item.quantity, merchandiseId: item.variantId }] },
  });
  return parsePayload(data?.data?.cartCreate);
}

async function addLine(cartId: string, item: CartItem): Promise<CartResult> {
  const data = await storefrontApiRequest(CART_LINES_ADD_MUTATION, {
    cartId,
    lines: [{ quantity: item.quantity, merchandiseId: item.variantId }],
  });
  return parsePayload(data?.data?.cartLinesAdd);
}

async function updateLine(cartId: string, lineId: string, quantity: number): Promise<CartResult> {
  const data = await storefrontApiRequest(CART_LINES_UPDATE_MUTATION, {
    cartId,
    lines: [{ id: lineId, quantity }],
  });
  return parsePayload(data?.data?.cartLinesUpdate);
}

async function removeLine(cartId: string, lineId: string): Promise<CartResult> {
  const data = await storefrontApiRequest(CART_LINES_REMOVE_MUTATION, {
    cartId,
    lineIds: [lineId],
  });
  return parsePayload(data?.data?.cartLinesRemove);
}

function cartItems(cart: RemoteCart): CartItem[] {
  return (cart.lines?.edges ?? []).flatMap(({ node: line }) => {
    const variant = line.merchandise;
    if (!variant?.product || !variant.id || !variant.price) return [];
    const product: ShopifyProduct = {
      node: {
        ...variant.product,
        description: "",
        images: variant.product.images ?? { edges: [] },
        collections: { edges: [] },
        variants: { edges: [{ node: variant }] },
        options: variant.selectedOptions.map((option) => ({
          name: option.name,
          values: [option.value],
        })),
      },
    };
    return [
      {
        lineId: line.id,
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        quantity: line.quantity,
        selectedOptions: variant.selectedOptions ?? [],
      },
    ];
  });
}

function remoteState(cart: RemoteCart) {
  return {
    cartId: cart.id,
    checkoutUrl: safeCheckoutUrl(cart.checkoutUrl),
    items: cartItems(cart),
    subtotal: cart.cost?.subtotalAmount ?? null,
    total: cart.cost?.totalAmount ?? null,
  };
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
        const { items, cartId } = get();
        const existing = items.find((current) => current.variantId === item.variantId);
        set({ isLoading: true });
        try {
          const result = !cartId
            ? await createCart({ ...item, lineId: null })
            : existing?.lineId
              ? await updateLine(cartId, existing.lineId, existing.quantity + item.quantity)
              : await addLine(cartId, { ...item, lineId: null });
          if (result.cartNotFound) get().clearCart();
          if (!result.success || !result.cart) return false;
          set(remoteState(result.cart));
          trackCartEvent("add_to_cart", [{ ...item, lineId: null }]);
          return true;
        } finally {
          set({ isLoading: false });
        }
      },
      updateQuantity: async (variantId, quantity) => {
        if (quantity <= 0) return get().removeItem(variantId);
        const { cartId, items } = get();
        const item = items.find((current) => current.variantId === variantId);
        if (!cartId || !item?.lineId) return false;
        set({ isLoading: true });
        try {
          const result = await updateLine(cartId, item.lineId, quantity);
          if (result.cartNotFound) get().clearCart();
          if (!result.success || !result.cart) return false;
          const difference = quantity - item.quantity;
          set(remoteState(result.cart));
          if (difference !== 0) {
            trackCartEvent(difference > 0 ? "add_to_cart" : "remove_from_cart", [
              { ...item, quantity: Math.abs(difference) },
            ]);
          }
          return true;
        } finally {
          set({ isLoading: false });
        }
      },
      removeItem: async (variantId) => {
        const { cartId, items } = get();
        const item = items.find((current) => current.variantId === variantId);
        if (!cartId || !item?.lineId) return false;
        set({ isLoading: true });
        try {
          const result = await removeLine(cartId, item.lineId);
          if (result.cartNotFound) get().clearCart();
          if (!result.success || !result.cart) return false;
          trackCartEvent("remove_from_cart", [item]);
          if (result.cart.totalQuantity === 0) get().clearCart();
          else set(remoteState(result.cart));
          return true;
        } finally {
          set({ isLoading: false });
        }
      },
      clearCart: () =>
        set({ items: [], cartId: null, checkoutUrl: null, subtotal: null, total: null }),
      getCheckoutUrl: () => get().checkoutUrl,
      syncCart: async () => {
        const { cartId, isSyncing } = get();
        if (!cartId || isSyncing) return;
        set({ isSyncing: true });
        try {
          const data = await storefrontApiRequest(CART_QUERY, { id: cartId });
          const cart = data?.data?.cart as RemoteCart | null;
          if (!cart || cart.totalQuantity === 0) get().clearCart();
          else set(remoteState(cart));
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: "shopify-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        cartId: state.cartId,
        checkoutUrl: state.checkoutUrl,
        subtotal: state.subtotal,
        total: state.total,
      }),
    },
  ),
);
