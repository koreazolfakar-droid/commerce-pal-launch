import { createServerFn } from "@tanstack/react-start";
import { storefrontApiRequest } from "@/lib/shopify";
import { SHOP_POLICIES_QUERY } from "@/lib/storefrontDocuments";

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

type ShopPoliciesResponse = { data?: { shop?: ShopPolicies | null } };

export function safePolicyUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export const fetchShopPolicies = createServerFn({ method: "GET" }).handler(
  async (): Promise<ShopPolicies | null> => {
    try {
      const response = (await storefrontApiRequest(SHOP_POLICIES_QUERY)) as ShopPoliciesResponse;
      const shop = response.data?.shop;
      if (!shop) return null;
      const { sanitizePolicyHtml } = await import("@/lib/policyHtml");
      const clean = (policy: ShopPolicy | null): ShopPolicy | null =>
        policy
          ? {
              ...policy,
              body: sanitizePolicyHtml(policy.body),
              url: safePolicyUrl(policy.url) ?? "",
            }
          : null;
      return {
        privacyPolicy: clean(shop.privacyPolicy),
        refundPolicy: clean(shop.refundPolicy),
        termsOfService: clean(shop.termsOfService),
        shippingPolicy: clean(shop.shippingPolicy),
      };
    } catch {
      return null;
    }
  },
);
