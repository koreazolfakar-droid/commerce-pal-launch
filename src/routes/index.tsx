import { useLanguage } from "@/lib/i18n";
import { lazy, Suspense, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Timer } from "lucide-react";

import { HomeCategorySection } from "@/components/HomeCategorySection";
import { HomeHero } from "@/components/HomeHero";
import { StoreLayout } from "@/components/StoreLayout";
import { applyCmsBrands, buildShopifyBrands } from "@/lib/brandDirectory";
import { cmsSeoPage, cmsText, EMPTY_CMS, localizeSection, type CmsSection } from "@/lib/cms";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import {
  bestSellingQueryOptions,
  newestQueryOptions,
  catalogQueryOptions,
  collectionQueryOptions,
  collectionsQueryOptions,
} from "@/lib/queries";
import { productDiscountPercent } from "@/lib/shopify";
import {
  canonicalLink,
  jsonLd,
  languageAlternateLinks,
  organizationJsonLd,
  SITE_NAME,
  socialMeta,
  websiteJsonLd,
} from "@/lib/seo";
import "../home-ticker.css";

const LazyDealSpotlight = lazy(() =>
  import("@/components/DealSpotlight").then((module) => ({ default: module.DealSpotlight })),
);
const LazyProductRail = lazy(() =>
  import("@/components/ProductRail").then((module) => ({ default: module.ProductRail })),
);
const LazyRecentlyViewed = lazy(() =>
  import("@/components/HomeSections").then((module) => ({ default: module.RecentlyViewed })),
);
const LazyServicesStrip = lazy(() =>
  import("@/components/HomeSections").then((module) => ({ default: module.ServicesStrip })),
);
const LazyTopBrands = lazy(() =>
  import("@/components/TopBrands").then((module) => ({ default: module.TopBrands })),
);
const LazyWhyShop = lazy(() =>
  import("@/components/WhyShop").then((module) => ({ default: module.WhyShop })),
);
const LazyBundleSection = lazy(() =>
  import("@/components/BrandShowcaseSections").then((module) => ({
    default: module.BundleSection,
  })),
);
const LazyBrandShowcase = lazy(() =>
  import("@/components/BrandShowcaseSections").then((module) => ({
    default: module.BrandShowcase,
  })),
);

const HOME_HERO_COLLECTION_HANDLE = "homepage-hero";
const HOME_SECONDARY_IDLE_TIMEOUT_MS = 1400;
const HOME_SECONDARY_FALLBACK_DELAY_MS = 350;

type IdleCapableWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Keep below-the-fold JavaScript and secondary Shopify requests out of the
 * startup critical path. They become available as soon as the browser reaches
 * an idle window, with a short fallback for browsers without requestIdleCallback.
 */
function useDeferredHomepageWork() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let idleRequestId: number | null = null;
    let fallbackTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
    const idleWindow = window as IdleCapableWindow;
    const activate = () => {
      if (!cancelled) setReady(true);
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleRequestId = idleWindow.requestIdleCallback(activate, {
        timeout: HOME_SECONDARY_IDLE_TIMEOUT_MS,
      });
    } else {
      fallbackTimer = globalThis.setTimeout(activate, HOME_SECONDARY_FALLBACK_DELAY_MS);
    }

    return () => {
      cancelled = true;
      if (idleRequestId !== null) idleWindow.cancelIdleCallback?.(idleRequestId);
      if (fallbackTimer !== null) globalThis.clearTimeout(fallbackTimer);
    };
  }, []);

  return ready;
}

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const [heroCollection, cms] = await Promise.all([
      context.queryClient.ensureQueryData(collectionQueryOptions(HOME_HERO_COLLECTION_HANDLE, 4)),
      context.queryClient.ensureQueryData(cmsQueryOptions()),
    ]);
    const heroImage = heroCollection?.products?.[0]?.node.images.edges[0]?.node.url;
    return { heroImage, cmsSeo: cmsSeoPage(cms, "home") };
  },
  head: ({ loaderData }) => {
    const cmsSeo = loaderData?.cmsSeo;
    const title =
      cmsSeo?.title?.trim() || `${SITE_NAME} Lebanon | Official Online Electronics Store`;
    const description =
      cmsSeo?.description?.trim() ||
      `${SITE_NAME} Lebanon is an online electronics store for smartphones, tablets, laptops, headphones, smartwatches and accessories with live availability and secure Shopify checkout.`;
    const image = cmsSeo?.og_image_url?.trim() || loaderData?.heroImage;
    const canonicalUrl = cmsSeo?.canonical_url?.trim();
    const customJsonLd = cmsSeo?.json_ld;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "application-name", content: SITE_NAME },
        { name: "apple-mobile-web-app-title", content: SITE_NAME },
        {
          name: "robots",
          content:
            cmsSeo?.robots?.trim() ||
            "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        },
        ...socialMeta({
          title,
          description,
          path: "/",
          ...(image ? { image } : {}),
        }),
      ],
      links: [
        canonicalUrl ? { rel: "canonical", href: canonicalUrl } : canonicalLink("/"),
        ...languageAlternateLinks({ path: "/", arabicPath: "/ar" }),
      ],
      scripts: [
        jsonLd(websiteJsonLd()),
        jsonLd(organizationJsonLd()),
        ...(customJsonLd && Object.keys(customJsonLd).length ? [jsonLd(customJsonLd)] : []),
      ],
    };
  },
  component: Index,
});

function SectionHeader({
  title,
  subtitle,
  href = "/shop",
  action,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  action?: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="home-section-header">
      <div className="min-w-0">
        <h2 className="text-xl font-black tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action ?? (
        <Link
          to={href as "/shop"}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          {t("viewAll")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      )}
    </div>
  );
}

function SectionFallback({ className = "h-52" }: { className?: string }) {
  return <div className={`${className} rounded-3xl bg-surface`} aria-hidden="true" />;
}

function DealsCountdown() {
  const { t } = useLanguage();
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      setLeft(end.getTime() - now.getTime());
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  if (left === null) return null;
  const total = Math.max(0, Math.floor(left / 1000));
  const parts = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-full border bg-card px-3 py-1.5 shadow-card">
      <Timer className="h-3.5 w-3.5 text-primary" />
      <span className="hidden text-[11px] font-semibold text-muted-foreground sm:inline">
        {t("todayEnds")}
      </span>
      <span className="flex items-center gap-1 font-mono text-xs font-bold tabular-nums">
        {parts.map((part, i) => (
          <span key={i} className="rounded-md bg-accent px-1.5 py-0.5 text-accent-foreground">
            {String(part).padStart(2, "0")}
          </span>
        ))}
      </span>
    </div>
  );
}

function HomePromoTicker({ heading, details }: { heading: string; details: string }) {
  const accessibleLabel = `${heading} • ${details}`;

  return (
    <div
      className="home-promo-ticker"
      data-testid="homepage-promo-ticker"
      aria-label={accessibleLabel}
    >
      <div className="home-promo-ticker-track">
        <span className="home-promo-ticker-copy">
          <h1 className="m-0 inline text-[inherit] font-[inherit] tracking-[inherit]">{heading}</h1>
          <span className="home-promo-ticker-dot" aria-hidden="true">
            •
          </span>
          <span>{details}</span>
        </span>
        <span className="home-promo-ticker-copy" aria-hidden="true">
          <span>{heading}</span>
          <span className="home-promo-ticker-dot">•</span>
          <span>{details}</span>
        </span>
      </div>
    </div>
  );
}

function cmsBuilderState(section: CmsSection) {
  const content =
    section.content && typeof section.content === "object" && !Array.isArray(section.content)
      ? (section.content as Record<string, unknown>)
      : {};
  const builder =
    content["builder"] && typeof content["builder"] === "object" && !Array.isArray(content["builder"])
      ? (content["builder"] as Record<string, unknown>)
      : {};

  return builder;
}

function cmsSectionIsScheduled(section: CmsSection) {
  const builder = cmsBuilderState(section);
  const startDate = typeof builder["startDate"] === "string" ? builder["startDate"] : "";
  const endDate = typeof builder["endDate"] === "string" ? builder["endDate"] : "";
  const today = new Date().toISOString().slice(0, 10);
  return (!startDate || today >= startDate) && (!endDate || today <= endDate);
}

function cmsSectionDeviceClass(section?: CmsSection) {
  if (!section) return "";
  const builder = cmsBuilderState(section);
  const mobile = builder["showOnMobile"] !== false;
  const tablet = builder["showOnTablet"] !== false;
  const desktop = builder["showOnDesktop"] !== false;
  return [
    mobile ? "" : "max-sm:hidden",
    tablet ? "" : "sm:max-lg:hidden",
    desktop ? "" : "lg:hidden",
  ]
    .filter(Boolean)
    .join(" ");
}

function safeCmsHref(value: unknown) {
  if (typeof value !== "string") return undefined;
  const href = value.trim();
  if (!href) return undefined;
  if (href.startsWith("/") || href.startsWith("#") || href.startsWith("https://")) return href;
  return undefined;
}

function CmsBuilderSection({ section }: { section: CmsSection }) {
  const { language } = useLanguage();
  const localized = localizeSection(section, language);
  const builder = cmsBuilderState(section);
  const settings =
    builder["settings"] && typeof builder["settings"] === "object" && !Array.isArray(builder["settings"])
      ? (builder["settings"] as Record<string, unknown>)
      : {};
  const type =
    typeof builder["type"] === "string"
      ? builder["type"]
      : typeof section.content["builderType"] === "string"
        ? section.content["builderType"]
        : section.section_type;
  const displayTitle = localized.title || section.title || "";
  const displaySubtitle = localized.subtitle || section.subtitle || "";
  const description = typeof builder["description"] === "string" ? builder["description"] : "";
  const eyebrow = typeof builder["eyebrow"] === "string" ? builder["eyebrow"] : "";
  const buttonText = typeof builder["buttonText"] === "string" ? builder["buttonText"] : "";
  const secondaryButtonText =
    typeof builder["secondaryButtonText"] === "string" ? builder["secondaryButtonText"] : "";
  const buttonLink = safeCmsHref(builder["buttonLink"]);
  const secondaryButtonLink = safeCmsHref(builder["secondaryButtonLink"]);
  const media = typeof settings["media"] === "string" ? settings["media"] : "";
  const background = typeof builder["background"] === "string" ? builder["background"] : "surface";
  const alignment = typeof builder["alignment"] === "string" ? builder["alignment"] : "left";
  const dark = background === "navy" || background === "purple";
  const alignmentClass =
    alignment === "center"
      ? "items-center text-center"
      : alignment === "right"
        ? "items-end text-right"
        : "items-start text-left";

  if (type === "announcement") {
    return (
      <section className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white">
        {displayTitle || description}
        {buttonText && buttonLink ? (
          <a href={buttonLink} className="ms-2 font-bold text-indigo-200 hover:underline">
            {buttonText}
          </a>
        ) : null}
      </section>
    );
  }

  const faqItems = Array.isArray(settings["items"])
    ? settings["items"].filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border p-5 shadow-card sm:p-8 ${
        background === "navy"
          ? "border-slate-800 bg-slate-950 text-white"
          : background === "purple"
            ? "border-violet-500/20 bg-gradient-to-br from-violet-700 to-indigo-700 text-white"
            : background === "mist"
              ? "bg-surface"
              : "bg-card"
      }`}
      data-cms-section={section.section_key}
    >
      {media ? (
        <img
          src={media}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-y-0 end-0 h-full w-[42%] object-cover opacity-80"
        />
      ) : null}
      <div className={`relative z-10 flex max-w-2xl flex-col gap-3 ${alignmentClass}`}>
        {eyebrow ? (
          <div className={`text-xs font-bold uppercase tracking-[.16em] ${dark ? "text-indigo-200" : "text-primary"}`}>
            {eyebrow}
          </div>
        ) : null}
        {displayTitle ? (
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{displayTitle}</h2>
        ) : null}
        {displaySubtitle ? (
          <p className={`text-sm font-semibold ${dark ? "text-white/80" : "text-muted-foreground"}`}>
            {displaySubtitle}
          </p>
        ) : null}
        {description ? (
          <p className={`max-w-xl text-sm leading-6 ${dark ? "text-white/75" : "text-muted-foreground"}`}>
            {description}
          </p>
        ) : null}
        {(buttonText && buttonLink) || (secondaryButtonText && secondaryButtonLink) ? (
          <div className="mt-1 flex flex-wrap gap-2">
            {buttonText && buttonLink ? (
              <a
                href={buttonLink}
                className={`rounded-full px-5 py-2.5 text-xs font-bold ${
                  dark ? "bg-white text-slate-950" : "bg-primary text-primary-foreground"
                }`}
              >
                {buttonText}
              </a>
            ) : null}
            {secondaryButtonText && secondaryButtonLink ? (
              <a
                href={secondaryButtonLink}
                className={`rounded-full border px-5 py-2.5 text-xs font-bold ${
                  dark ? "border-white/30 text-white" : "border-border"
                }`}
              >
                {secondaryButtonText}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      {type === "faq" && faqItems.length ? (
        <div className="relative z-10 mt-6 space-y-2">
          {faqItems.map((item, index) => {
            const question = typeof item["question"] === "string" ? item["question"] : "";
            const answer = typeof item["answer"] === "string" ? item["answer"] : "";
            if (!question && !answer) return null;
            return (
              <details key={`${section.id}-faq-${index}`} className="rounded-2xl border bg-background/85 p-4">
                <summary className="cursor-pointer text-sm font-bold">{question}</summary>
                {answer ? <p className="mt-2 text-sm text-muted-foreground">{answer}</p> : null}
              </details>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function Index() {
  const { t, language } = useLanguage();
  const deferredWorkReady = useDeferredHomepageWork();
  const { data: cms = EMPTY_CMS } = useQuery(cmsQueryOptions());
  const { data: catalog } = useQuery({
    ...catalogQueryOptions(),
    enabled: deferredWorkReady,
  });
  const { data: collections = [] } = useQuery({
    ...collectionsQueryOptions(),
    enabled: deferredWorkReady,
  });
  const { data: heroCollection } = useQuery(collectionQueryOptions(HOME_HERO_COLLECTION_HANDLE, 4));
  const catalogReady = Boolean(catalog);
  const secondaryQueriesReady = catalogReady && deferredWorkReady;
  const { data: newItems = [] } = useQuery({
    ...newestQueryOptions(),
    enabled: secondaryQueriesReady,
  });
  const { data: bestSellers = [] } = useQuery({
    ...bestSellingQueryOptions(),
    enabled: secondaryQueriesReady,
  });

  const heroOnlyProductIds = new Set(
    (heroCollection?.products ?? [])
      .filter((product) => Number(product.node.priceRange.minVariantPrice.amount) <= 0)
      .map((product) => product.node.id),
  );
  const isHomepageMerchandise = (product: NonNullable<typeof catalog>["products"][number]) =>
    !heroOnlyProductIds.has(product.node.id);

  const products = catalog?.products ?? [];
  const merchandiseProducts = products.filter(isHomepageMerchandise);
  const homepageCatalog = catalog ? { ...catalog, products: merchandiseProducts } : null;
  const brands = catalog
    ? applyCmsBrands(buildShopifyBrands(catalog.brands, collections), cms.brands)
    : [];
  const deals = merchandiseProducts.filter((product) => productDiscountPercent(product) !== null);
  const best = (bestSellers ?? []).filter(isHomepageMerchandise);
  const latest = newItems.filter(isHomepageMerchandise);
  const tickerHeading =
    cmsText(cms, language === "ar" ? "home_ticker_heading_ar" : "home_ticker_heading_en") ??
    (language === "ar"
      ? "Space Call لبنان - متجر الهواتف والإلكترونيات"
      : "Space Call Lebanon - Phones & Electronics Store");
  const tickerDetails =
    cmsText(cms, language === "ar" ? "home_ticker_details_ar" : "home_ticker_details_en") ??
    (language === "ar"
      ? "متجرك الموثوق للهواتف والإلكترونيات • توفر مباشر • أسعار واضحة • دفع آمن"
      : "Your trusted phones & electronics store • Live availability • Clear pricing • Secure checkout");

  const homeSections = cms.sections.filter((section) => section.page_slug === "home");
  const sectionByKey = new Map(homeSections.map((section) => [section.section_key, section]));
  const coreKeys = new Set(["hero", "categories", "brands", "featured_products", "trust"]);
  const coreSection = (key: string) => sectionByKey.get(key);
  const isLive = (section: CmsSection | undefined, fallbackVisible = true) =>
    section ? section.is_visible && cmsSectionIsScheduled(section) : fallbackVisible;
  const orderOf = (key: string, fallback: number) => coreSection(key)?.sort_order ?? fallback;

  const featuredSection = coreSection("featured_products");
  const localizedFeaturedSection = featuredSection
    ? localizeSection(featuredSection, language)
    : undefined;
  const featuredTitle =
    localizedFeaturedSection?.title?.trim() || t("bestSellers");
  const featuredSubtitle =
    localizedFeaturedSection?.subtitle?.trim() || t("bestSellersDescription");

  const blocks: Array<{
    key: string;
    order: number;
    section?: CmsSection;
    visible: boolean;
    node: React.ReactNode;
  }> = [
    {
      key: "hero",
      order: orderOf("hero", 10),
      section: coreSection("hero"),
      visible: isLive(coreSection("hero")),
      node: (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:gap-4">
          <HomePromoTicker heading={tickerHeading} details={tickerDetails} />
          <HomeHero heroCollection={heroCollection} cmsHeroSlides={cms.heroSlides} />
        </div>
      ),
    },
    {
      key: "categories",
      order: orderOf("categories", 15),
      section: coreSection("categories"),
      visible: isLive(coreSection("categories")),
      node: catalog ? (
        <HomeCategorySection catalog={catalog} collections={collections} />
      ) : (
        <div className="h-28 animate-pulse rounded-3xl bg-surface" aria-hidden="true" />
      ),
    },
    {
      key: "brands",
      order: orderOf("brands", 20),
      section: coreSection("brands"),
      visible: isLive(coreSection("brands")),
      node: catalog ? (
        <Suspense fallback={<SectionFallback className="h-24" />}>
          <LazyTopBrands brands={brands} />
        </Suspense>
      ) : (
        <div className="h-24 animate-pulse rounded-3xl bg-surface" aria-hidden="true" />
      ),
    },
    {
      key: "featured_products",
      order: orderOf("featured_products", 30),
      section: featuredSection,
      visible: isLive(featuredSection),
      node: catalogReady ? (
        <>
          {best.length > 0 ? (
            <section data-testid="best-sellers">
              <SectionHeader title={featuredTitle} subtitle={featuredSubtitle} />
              <Suspense fallback={<SectionFallback />}>
                <LazyProductRail products={best} storageKey="space-cell-home-best-sellers-view" />
              </Suspense>
            </section>
          ) : null}

          {deals.length > 0 ? (
            <section id="deals" className="scroll-mt-24" data-testid="deals-section">
              <SectionHeader
                title={t("todaysDeals")}
                subtitle={t("dealsDescription")}
                action={<DealsCountdown />}
              />
              <Suspense fallback={<SectionFallback className="h-72" />}>
                {deals.length <= 2 ? (
                  <LazyDealSpotlight products={deals} />
                ) : (
                  <LazyProductRail products={deals} storageKey="space-cell-home-deals-view" />
                )}
              </Suspense>
              <div className="mt-4">
                <Link
                  to="/shop"
                  search={{ availability: "on-sale" }}
                  className="press inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-xs font-bold hover:border-primary hover:text-primary"
                >
                  {t("allDeals")} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>
          ) : null}

          {latest.length > 0 ? (
            <section data-testid="new-items">
              <SectionHeader
                title={t("newItems")}
                subtitle={t("newItemsDescription")}
                action={
                  <Link
                    to="/shop"
                    search={{ sort: "newest" }}
                    className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    {t("viewAll")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                  </Link>
                }
              />
              <Suspense fallback={<SectionFallback />}>
                <LazyProductRail products={latest} storageKey="space-cell-home-new-items-view" />
              </Suspense>
            </section>
          ) : null}

          {deferredWorkReady ? (
            <Suspense fallback={<SectionFallback className="h-64" />}>
              <LazyBundleSection collections={collections} />
              {homepageCatalog ? (
                <LazyBrandShowcase catalog={homepageCatalog} collections={collections} />
              ) : null}
            </Suspense>
          ) : null}
        </>
      ) : (
        <div className="h-52 animate-pulse rounded-3xl bg-surface" aria-hidden="true" />
      ),
    },
    {
      key: "recently_viewed",
      order: 35,
      visible: deferredWorkReady,
      node: (
        <Suspense fallback={null}>
          <LazyRecentlyViewed products={merchandiseProducts} />
        </Suspense>
      ),
    },
    {
      key: "trust",
      order: orderOf("trust", 40),
      section: coreSection("trust"),
      visible: deferredWorkReady && isLive(coreSection("trust")),
      node: (
        <Suspense fallback={null}>
          <LazyServicesStrip />
          <LazyWhyShop />
        </Suspense>
      ),
    },
    ...homeSections
      .filter((section) => !coreKeys.has(section.section_key))
      .map((section) => ({
        key: section.section_key,
        order: section.sort_order,
        section,
        visible: section.is_visible && cmsSectionIsScheduled(section),
        node: <CmsBuilderSection section={section} />,
      })),
  ];

  const orderedBlocks = blocks
    .filter((block) => block.visible)
    .sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));

  return (
    <StoreLayout>
      <div className="home-page">
        {orderedBlocks.map((block) => (
          <div key={block.key} className={cmsSectionDeviceClass(block.section)}>
            {block.node}
          </div>
        ))}
      </div>
    </StoreLayout>
  );

}
