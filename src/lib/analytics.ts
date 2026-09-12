import { productCurrency, productPrice, productPrimaryVariant } from "@/lib/productPricing";
import type { ShopifyProduct } from "@/lib/shopify";

export type CommerceEventName =
  | "page_view"
  | "view_item"
  | "search"
  | "view_item_list"
  | "select_item"
  | "add_to_cart"
  | "remove_from_cart"
  | "view_cart"
  | "begin_checkout"
  | "purchase"
  | "add_to_wishlist"
  | "compare_product";

type EventParams = Record<string, unknown>;

type AnalyticsCartLine = {
  product: ShopifyProduct;
  quantity: number;
  price: { amount: string; currencyCode: string };
  variantId?: string;
  variantTitle?: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA4_MEASUREMENT_ID = String(import.meta.env.VITE_GA4_MEASUREMENT_ID ?? "").trim();
let gaInitialized = false;

function ensureDataLayer() {
  if (typeof window === "undefined") return null;
  window.dataLayer = window.dataLayer ?? [];
  return window.dataLayer;
}

/**
 * Loads gtag lazily so analytics never blocks the initial render. When no GA4
 * measurement id is configured, events remain available on `window.dataLayer`
 * for GTM or another consent-aware analytics integration.
 */
export function ensureGa4() {
  if (typeof window === "undefined" || !GA4_MEASUREMENT_ID || gaInitialized) return;
  const dataLayer = ensureDataLayer();
  if (!dataLayer) return;

  window.gtag = window.gtag ?? ((...args: unknown[]) => dataLayer.push(args));
  window.gtag("js", new Date());
  window.gtag("config", GA4_MEASUREMENT_ID, { send_page_view: false });

  if (!document.querySelector(`script[data-space-call-ga4="${GA4_MEASUREMENT_ID}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_MEASUREMENT_ID)}`;
    script.dataset.spaceCallGa4 = GA4_MEASUREMENT_ID;
    document.head.appendChild(script);
  }

  gaInitialized = true;
}

export function trackEvent(name: CommerceEventName, params: EventParams = {}) {
  if (typeof window === "undefined") return;

  if (GA4_MEASUREMENT_ID) {
    ensureGa4();
    window.gtag?.("event", name, params);
    return;
  }

  ensureDataLayer()?.push({ event: name, ...params });
}

export function trackPageView(path: string, title?: string) {
  trackEvent("page_view", {
    page_location: typeof window !== "undefined" ? window.location.href : path,
    page_path: path,
    ...(title ? { page_title: title } : {}),
  });
}

export function analyticsItem(product: ShopifyProduct, quantity = 1) {
  const variant = productPrimaryVariant(product);
  return {
    item_id: product.node.handle || product.node.id,
    item_name: product.node.title,
    item_brand: product.node.vendor || undefined,
    item_category: product.node.productType || undefined,
    item_variant: variant?.title && variant.title !== "Default Title" ? variant.title : undefined,
    price: productPrice(product),
    quantity,
  };
}

export function trackProductEvent(
  name: Extract<CommerceEventName, "view_item" | "select_item" | "add_to_wishlist">,
  product: ShopifyProduct,
  params: EventParams = {},
) {
  const currency = productCurrency(product);
  const value = productPrice(product);
  trackEvent(name, {
    currency,
    value,
    items: [analyticsItem(product)],
    ...params,
  });
}

export function trackProductList(name: string, products: ShopifyProduct[]) {
  if (!products.length) return;
  trackEvent("view_item_list", {
    item_list_name: name,
    items: products.slice(0, 24).map((product, index) => ({
      ...analyticsItem(product),
      index,
    })),
  });
}

export function trackCartEvent(
  name: Extract<CommerceEventName, "add_to_cart" | "remove_from_cart" | "view_cart" | "begin_checkout">,
  lines: AnalyticsCartLine[],
) {
  if (!lines.length) return;
  const currency = lines[0]?.price.currencyCode ?? productCurrency(lines[0]!.product);
  const value = lines.reduce(
    (sum, line) => sum + Number(line.price.amount || productPrice(line.product)) * line.quantity,
    0,
  );
  trackEvent(name, {
    currency,
    value,
    items: lines.map((line) => ({
      ...analyticsItem(line.product, line.quantity),
      item_variant:
        line.variantTitle && line.variantTitle !== "Default Title"
          ? line.variantTitle
          : analyticsItem(line.product, line.quantity).item_variant,
      item_variant_id: line.variantId,
      price: Number(line.price.amount),
    })),
  });
}

export function trackHandleEvent(
  name: Extract<CommerceEventName, "add_to_wishlist" | "compare_product">,
  handle: string,
) {
  trackEvent(name, { items: [{ item_id: handle, item_name: handle }] });
}
