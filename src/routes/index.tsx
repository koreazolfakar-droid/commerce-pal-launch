import { useLanguage } from "@/lib/i18n";
import { lazy, Suspense, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Timer } from "lucide-react";

import { HomeCategorySection } from "@/components/HomeCategorySection";
import { HomeHero } from "@/components/HomeHero";
import { StoreLayout } from "@/components/StoreLayout";
import { applyCmsBrands, buildStoreBrands } from "@/lib/brandDirectory";
import { cmsSeoPage, cmsText, EMPTY_CMS, localizeSection, type CmsSection } from "@/lib/cms";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import {
  bestSellingQueryOptions,
  newestQueryOptions,
  homepageCatalogQueryOptions,
  navigationCatalogQueryOptions,
  collectionQueryOptions,
  collectionsQueryOptions,
  productsByIdsQueryOptions,
} from "@/lib/queries";
import { productDiscountPercent } from "@/lib/productPricing";
import {
  canonicalLink,
  jsonLd,
  languageAlternateLinks,
  organizationJsonLd,
  SITE_NAME,
  socialMeta,
  websiteJsonLd,
} from "@/lib/seo";

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
const HOME_SECONDARY_IDLE_TIMEOUT_MS = 160;
const HOME_SECONDARY_FALLBACK_DELAY_MS = 40;

type IdleCapableWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Keep below-the-fold JavaScript and secondary catalogue requests out of the
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
    // The CMS hero is the storefront's only visual hero source. Keep legacy
    // merchandising reads out of the SSR/LCP critical path.
    const cms = await context.queryClient.ensureQueryData(cmsQueryOptions());
    const firstCmsHero = cms.heroSlides[0];
    const desktopHeroPreload = firstCmsHero?.image_url?.trim() || undefined;
    const mobileHeroPreload =
      firstCmsHero?.mobile_image_url?.trim() || desktopHeroPreload;

    return {
      heroPreload:
        desktopHeroPreload && mobileHeroPreload
          ? { desktop: desktopHeroPreload, mobile: mobileHeroPreload }
          : undefined,
      cmsSeo: cmsSeoPage(cms, "home"),
    };
  },
  head: ({ loaderData }) => {
    const cmsSeo = loaderData?.cmsSeo;
    const title =
      cmsSeo?.title?.trim() || `${SITE_NAME} Lebanon | Official Online Electronics Store`;
    const description =
      cmsSeo?.description?.trim() ||
      `${SITE_NAME} Lebanon is an online electronics store for smartphones, tablets, laptops, headphones, smartwatches and accessories with live availability and direct Space Call checkout.`;
    const image = cmsSeo?.og_image_url?.trim() || loaderData?.heroPreload?.desktop;
    const canonicalUrl = cmsSeo?.canonical_url?.trim();
    const customJsonLd = cmsSeo?.json_ld;
    const heroPreload = loaderData?.heroPreload;
    const heroPreloadLinks = heroPreload
      ? heroPreload.mobile === heroPreload.desktop
        ? [{ rel: "preload" as const, as: "image" as const, href: heroPreload.desktop }]
        : [
            {
              rel: "preload" as const,
              as: "image" as const,
              href: heroPreload.mobile,
              media: "(max-width: 639px)",
            },
            {
              rel: "preload" as const,
              as: "image" as const,
              href: heroPreload.desktop,
              media: "(min-width: 640px)",
            },
          ]
      : [];

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
        ...heroPreloadLinks,
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
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
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
  return <div className={`${className} rounded-lg bg-surface`} aria-hidden="true" />;
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

function cmsManualProductIds(section?: CmsSection) {
  if (!section) return [];

  const builder = cmsBuilderState(section);
  const settings =
    builder["settings"] && typeof builder["settings"] === "object" && !Array.isArray(builder["settings"])
      ? (builder["settings"] as Record<string, unknown>)
      : {};

  if (settings["source"] !== "manual") return [];

  const configured = Array.isArray(settings["manualProductIds"])
    ? settings["manualProductIds"].filter((id): id is string => typeof id === "string")
    : typeof settings["sourceValue"] === "string"
      ? settings["sourceValue"].split(",")
      : [];

  return [...new Set(configured.map((id) => id.trim()).filter(Boolean))].slice(0, 20);
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

function CmsActionLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link to={href as never} preload="intent" className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
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
      <section className="rounded-lg bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white">
        {displayTitle || description}
        {buttonText && buttonLink ? (
          <CmsActionLink
            href={buttonLink}
            className="ms-2 font-bold text-indigo-200 hover:underline"
          >
            {buttonText}
          </CmsActionLink>
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
      className={`relative overflow-hidden rounded-lg border p-5 shadow-card sm:p-8 ${
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
          <div className={`text-xs font-semibold uppercase tracking-[.06em] ${dark ? "text-indigo-200" : "text-primary"}`}>
            {eyebrow}
          </div>
        ) : null}
        {displayTitle ? (
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{displayTitle}</h2>
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
              <CmsActionLink
                href={buttonLink}
                className={`rounded-full px-5 py-2.5 text-xs font-bold ${
                  dark ? "bg-white text-slate-950" : "bg-primary text-primary-foreground"
                }`}
              >
                {buttonText}
              </CmsActionLink>
            ) : null}
            {secondaryButtonText && secondaryButtonLink ? (
              <CmsActionLink
                href={secondaryButtonLink}
                className={`rounded-full border px-5 py-2.5 text-xs font-bold ${
                  dark ? "border-white/30 text-white" : "border-border"
                }`}
              >
                {secondaryButtonText}
              </CmsActionLink>
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
              <details
                key={`${section.id}-faq-${index}`}
                className="rounded-lg border bg-background/85 p-4"
              >
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
  const homepageSectionsForMerch = cms.sections.filter((section) => section.page_slug === "home");
  const featuredMerchSection = homepageSectionsForMerch.find(
    (section) => section.section_key === "featured_products",
  );
  const manualFeaturedProductIds = cmsManualProductIds(featuredMerchSection);
  const { data: navigationCatalog } = useQuery(navigationCatalogQueryOptions());
  const { data: catalog } = useQuery({
    ...homepageCatalogQueryOptions(),
    enabled: deferredWorkReady,
  });
  const { data: collections = [] } = useQuery({
    ...collectionsQueryOptions(),
    enabled: deferredWorkReady,
  });
  const {
    data: heroCollection,
    isFetched: heroCollectionFetched,
    isError: heroCollectionFailed,
  } = useQuery({
    ...collectionQueryOptions(HOME_HERO_COLLECTION_HANDLE, 4),
    enabled: deferredWorkReady,
  });
  const catalogReady =
    Boolean(catalog) && (heroCollectionFetched || heroCollectionFailed);
  const secondaryQueriesReady = catalogReady && deferredWorkReady;
  const { data: newItems = [] } = useQuery({
    ...newestQueryOptions(),
    enabled: secondaryQueriesReady,
  });
  const { data: bestSellers = [] } = useQuery({
    ...bestSellingQueryOptions(),
    enabled: secondaryQueriesReady && manualFeaturedProductIds.length === 0,
  });
  const { data: manualFeaturedProducts = [] } = useQuery({
    ...productsByIdsQueryOptions(manualFeaturedProductIds),
    enabled: secondaryQueriesReady && manualFeaturedProductIds.length > 0,
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
  const homepageCatalog = catalog
    ? {
        ...catalog,
        products: merchandiseProducts,
        categories: navigationCatalog?.categories ?? catalog.categories,
        brands: navigationCatalog?.brands ?? catalog.brands,
      }
    : null;
  const navigationCategories = navigationCatalog?.categories ?? catalog?.categories ?? [];
  const navigationBrands = navigationCatalog?.brands ?? catalog?.brands ?? [];
  const navigationReady = Boolean(navigationCatalog || catalog);
  const brands = applyCmsBrands(buildStoreBrands(navigationBrands, collections), cms.brands);
  const deals = merchandiseProducts.filter((product) => productDiscountPercent(product) !== null);
  const best = (
    manualFeaturedProductIds.length > 0 ? manualFeaturedProducts : bestSellers
  ).filter(isHomepageMerchandise);
  const latest = newItems.filter(isHomepageMerchandise);


  const homeSections = homepageSectionsForMerch;
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
      node: <HomeHero cmsHeroSlides={cms.heroSlides} />,
    },
    {
      key: "categories",
      order: orderOf("categories", 15),
      section: coreSection("categories"),
      visible: isLive(coreSection("categories")),
      node: navigationReady ? (
        <HomeCategorySection categories={navigationCategories} collections={collections} />
      ) : (
        <div className="h-28 rounded-lg bg-surface" aria-hidden="true" />
      ),
    },
    {
      key: "brands",
      order: orderOf("brands", 20),
      section: coreSection("brands"),
      visible: isLive(coreSection("brands")),
      node: navigationReady ? (
        <Suspense fallback={<SectionFallback className="h-24" />}>
          <LazyTopBrands brands={brands} />
        </Suspense>
      ) : (
        <div className="h-24 rounded-lg bg-surface" aria-hidden="true" />
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
        <div className="h-52 rounded-lg bg-surface" aria-hidden="true" />
      ),
    },
    {
      key: "recently_viewed",
      order: 35,
      visible: deferredWorkReady,
      node: (
        <Suspense fallback={null}>
          <LazyRecentlyViewed />
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
