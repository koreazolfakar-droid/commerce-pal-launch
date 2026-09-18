import { createServerFn } from "@tanstack/react-start";

export interface ShopPolicy {
  title: string;
  body: string;
  url: string;
}

export type ShopPolicies = {
  privacyPolicy: ShopPolicy | null;
  refundPolicy: ShopPolicy | null;
  termsOfService: ShopPolicy | null;
  shippingPolicy: ShopPolicy | null;
};

export type PolicyKey = keyof ShopPolicies;

export function safePolicyUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Provider-neutral policy hook.
 * Dashboard-managed policies will replace this placeholder in the next backend
 * integration phase. It intentionally performs no Shopify or external commerce
 * platform request.
 */
export const fetchShopPolicies = createServerFn({ method: "GET" }).handler(
  async (): Promise<ShopPolicies | null> => null,
);
