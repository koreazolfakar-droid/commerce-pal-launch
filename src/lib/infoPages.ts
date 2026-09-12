import { translate, type TranslationKey } from "@/lib/i18n";
import { absoluteUrl, canonicalLink } from "@/lib/seo";
import type { PolicyKey } from "@/lib/policies";
import { SHOP_ACCOUNT_URL as CONFIG_ACCOUNT_URL, STORE_NAME } from "@/lib/storeConfig";

export const INFO_PAGES = {
  about: "aboutTitle",
  faq: "faqTitle",
  contact: "contactTitle",
  help: "helpTitle",
  shipping: "shippingTitle",
  returns: "returnsTitle",
  warranty: "warrantyTitle",
  privacy: "privacyTitle",
  terms: "termsTitle",
} as const satisfies Record<string, TranslationKey>;
export type InfoPageName = keyof typeof INFO_PAGES;
export const POLICY_PAGES = {
  shipping: "shippingPolicy",
  returns: "refundPolicy",
  privacy: "privacyPolicy",
  terms: "termsOfService",
} as const satisfies Partial<Record<InfoPageName, PolicyKey>>;
export const POLICY_LINKS = ["shipping", "returns", "warranty", "privacy", "terms"] as const;

/** Keep account/order links on the Space Call domain first, then explain the Shopify hand-off. */
export const SHOP_ACCOUNT_URL = "/help#account-orders";
export const SHOPIFY_ACCOUNT_URL = CONFIG_ACCOUNT_URL;

export function infoPageHead(page: InfoPageName) {
  const title = `${translate("en", INFO_PAGES[page])} — ${STORE_NAME}`;
  const description =
    page === "about" ? translate("en", "aboutBody") : translate("en", "helpDescription");
  const path = `/${page}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl(path) },
      { property: "og:image", content: absoluteUrl("/logo.png") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: absoluteUrl("/logo.png") },
    ],
    links: [canonicalLink(path)],
  };
}
