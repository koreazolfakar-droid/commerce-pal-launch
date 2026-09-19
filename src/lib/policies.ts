import { createServerFn } from "@tanstack/react-start";
import { fetchCmsSnapshot, type CmsSettingValue } from "@/lib/cms";

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

function settingText(settings: Record<string, CmsSettingValue>, key: string) {
  const value = settings[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

async function policyFromCms(
  settings: Record<string, CmsSettingValue>,
  prefix: string,
): Promise<ShopPolicy | null> {
  const body = settingText(settings, `${prefix}_body`);
  if (!body) return null;
  const { sanitizePolicyHtml } = await import("@/lib/policyHtml");
  const title = settingText(settings, `${prefix}_title`) || "Store policy";
  const url = settingText(settings, `${prefix}_url`);
  return {
    title,
    body: sanitizePolicyHtml(body),
    url: url ? (safePolicyUrl(url) ?? "") : "",
  };
}

/** Detailed policy content is now sourced only from the Space Call CMS/Supabase. */
export const fetchShopPolicies = createServerFn({ method: "GET" }).handler(
  async (): Promise<ShopPolicies> => {
    const cms = await fetchCmsSnapshot();
    const settings = cms.settings;
    return {
      privacyPolicy: await policyFromCms(settings, "privacy_policy"),
      refundPolicy: await policyFromCms(settings, "refund_policy"),
      termsOfService: await policyFromCms(settings, "terms_of_service"),
      shippingPolicy: await policyFromCms(settings, "shipping_policy"),
    };
  },
);
