import { translate, type TranslationKey } from "@/lib/i18n";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  canonicalLink,
  jsonLd,
  SITE_URL,
  socialMeta,
} from "@/lib/seo";
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
export const SHOP_ACCOUNT_URL = CONFIG_ACCOUNT_URL;

const INFO_PAGE_SEO: Record<
  InfoPageName,
  { title: string; description: string; schemaType: "WebPage" | "AboutPage" | "ContactPage" | "FAQPage" }
> = {
  about: {
    title: `About ${STORE_NAME} | Electronics Store in Lebanon`,
    description: `Learn about ${STORE_NAME}, an electronics store in Lebanon for smartphones, tablets, laptops, audio, wearables and accessories with shopping support.`,
    schemaType: "AboutPage",
  },
  faq: {
    title: `${STORE_NAME} FAQ | Orders, Delivery, Returns & Warranty`,
    description: `Find answers about ${STORE_NAME} orders, authentic products, delivery in Lebanon, returns, warranty, tracking and WhatsApp support.`,
    schemaType: "FAQPage",
  },
  contact: {
    title: `Contact ${STORE_NAME} | Product & Order Support Lebanon`,
    description: `Contact ${STORE_NAME} in Lebanon for product availability, order support, delivery questions, returns, warranty and after-sales assistance.`,
    schemaType: "ContactPage",
  },
  help: {
    title: `${STORE_NAME} Help Center | Order & Shopping Support`,
    description: `Get help with ${STORE_NAME} orders, tracking, product questions, delivery, returns, warranty and after-sales support in Lebanon.`,
    schemaType: "WebPage",
  },
  shipping: {
    title: `${STORE_NAME} Shipping | Delivery Information Lebanon`,
    description: `Learn how ${STORE_NAME} delivery works in Lebanon, including order preparation, delivery confirmation, receiving your package and support.`,
    schemaType: "WebPage",
  },
  returns: {
    title: `${STORE_NAME} Returns | Return Policy & Request Guide`,
    description: `Learn how to request a return from ${STORE_NAME}, what to keep with the product, and how eligibility is reviewed under the store return policy.`,
    schemaType: "WebPage",
  },
  warranty: {
    title: `${STORE_NAME} Warranty | Electronics Warranty Guide Lebanon`,
    description: `Read ${STORE_NAME} warranty guidance for electronics, including coverage, proof of purchase, serial information and the service process in Lebanon.`,
    schemaType: "WebPage",
  },
  privacy: {
    title: `${STORE_NAME} Privacy Policy | Customer Data & Store Privacy`,
    description: `Read how ${STORE_NAME} handles customer information used to operate the store, process orders, provide support and work with service providers.`,
    schemaType: "WebPage",
  },
  terms: {
    title: `${STORE_NAME} Terms of Service | Online Store Terms Lebanon`,
    description: `Read the terms for using the ${STORE_NAME} online store in Lebanon, including orders, pricing, product information, acceptable use and store policies.`,
    schemaType: "WebPage",
  },
};

const FAQ_ITEMS = [
  ["faqOriginalQ", "faqOriginalA"],
  ["faqTrackingQ", "faqTrackingA"],
  ["faqReturnsQ", "faqReturnsA"],
  ["faqDeliveryQ", "faqDeliveryA"],
  ["faqWhatsAppQ", "faqWhatsAppA"],
] as const satisfies ReadonlyArray<readonly [TranslationKey, TranslationKey]>;

function infoPageJsonLd(page: InfoPageName) {
  const seo = INFO_PAGE_SEO[page];
  const path = `/${page}`;
  const pageUrl = absoluteUrl(path);
  const base = {
    "@context": "https://schema.org",
    "@type": seo.schemaType,
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: seo.title,
    headline: translate("en", INFO_PAGES[page]),
    description: seo.description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: ["en-LB", "ar-LB"],
  } as Record<string, unknown>;

  if (page === "faq") {
    base.mainEntity = FAQ_ITEMS.map(([question, answer]) => ({
      "@type": "Question",
      name: translate("en", question),
      acceptedAnswer: {
        "@type": "Answer",
        text: translate("en", answer),
      },
    }));
  }

  return base;
}

export function infoPageHead(page: InfoPageName) {
  const seo = INFO_PAGE_SEO[page];
  const path = `/${page}`;
  const pageLabel = translate("en", INFO_PAGES[page]);

  return {
    meta: [
      { title: seo.title },
      { name: "description", content: seo.description },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      ...socialMeta({ title: seo.title, description: seo.description, path }),
    ],
    links: [canonicalLink(path)],
    scripts: [
      jsonLd(infoPageJsonLd(page)),
      jsonLd(
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: pageLabel, path },
        ]),
      ),
    ],
  };
}
