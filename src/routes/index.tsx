import { useLanguage } from "@/lib/i18n";
import { DealSpotlight } from "@/components/DealSpotlight";
import { useEffect, useState } from "react";
import { ProductRail } from "@/components/ProductRail";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Timer } from "lucide-react";

import { BenefitsBar, RecentlyViewed, ServicesStrip } from "@/components/HomeSections";
import { Newsletter } from "@/components/Newsletter";
import { ShopifyHeroCollections } from "@/components/ShopifyHeroCollections";
import { StoreLayout } from "@/components/StoreLayout";
import { TopBrands } from "@/components/TopBrands";
import { WhyShop } from "@/components/WhyShop";
import { BrandShowcase, BundleSection, CategorySection } from "@/components/BrandShowcaseSections";
import { buildShopifyBrands } from "@/lib/brandDirectory";
import {
  bestSellingQueryOptions,
  newestQueryOptions,
  catalogQueryOptions,
  collectionsQueryOptions,
} from "@/lib/queries";
import { productDiscountPercent } from "@/lib/shopify";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(catalogQueryOptions()),
      context.queryClient.ensureQueryData(collectionsQueryOptions()),
    ]);
  },
  head: () => ({
    meta: [
      { title: `${SITE_NAME} | Phones, Tablets & Electronics in Lebanon` },
      {
        name: "description",
        content: `Shop smartphones, tablets, laptops, smartwatches, audio and accessories in Lebanon at ${SITE_NAME} with live availability and secure Shopify checkout.`,
      },
      { property: "og:title", content: `${SITE_NAME} | Phones, Tablets & Electronics in Lebanon` },
      {
        property: "og:description",
        content:
          "Shop smartphones, tablets, laptops, smartwatches, audio and accessories in Lebanon with live availability and secure checkout.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/") },
      { property: "og:image", content: absoluteUrl("/logo.png") },
      { name: "twitter:image", content: absoluteUrl("/logo.png") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${SITE_NAME} | Phones, Tablets & Electronics in Lebanon` },
      {
        name: "twitter:description",
        content:
          "Shop smartphones, tablets, laptops, smartwatches, audio and accessories in Lebanon with live availability and secure checkout.",
      },
    ],
    links: [canonicalLink("/")],
    scripts: [
      jsonLd({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: ["en", "ar"],
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      }),
      jsonLd({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: absoluteUrl("/logo.png"),
      }),
    ],
  }),
  component: Index,
});

function SectionHeader({ title, subtitle, href = "/shop", action }: { title: string; subtitle?: string; href?: string; action?: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className="home-section-header">
      <div className="min-w-0">
        <h2 className="text-xl font-black tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action ?? (
        <Link to={href as "/shop"} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline">
          {t("viewAll")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      )}
    </div>
  );
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
      <span className="hidden text-[11px] font-semibold text-muted-foreground sm:inline">{t("todayEnds")}</span>
      <span className="flex items-center gap-1 font-mono text-xs font-bold tabular-nums">
        {parts.map((part, i) => <span key={i} className="rounded-md bg-accent px-1.5 py-0.5 text-accent-foreground">{String(part).padStart(2, "0")}</span>)}
      </span>
    </div>
  );
}

function HomeSeoIntro({ language }: { language: string }) {
  const ar = language === "ar";

  return (
    <header
      className="rounded-3xl border border-border/70 bg-card px-5 py-5 shadow-card sm:px-7 sm:py-6"
      data-testid="homepage-seo-intro"
    >
      <div className="max-w-3xl">
        <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-primary sm:text-xs">
          {ar ? "Space Call لبنان" : "Space Call Lebanon"}
        </p>
        <h1 className="mt-1.5 text-xl font-black leading-tight tracking-tight text-foreground sm:text-2xl lg:text-3xl">
          {ar ? "تسوّق الهواتف والأجهزة اللوحية والإلكترونيات في لبنان" : "Phones, Tablets & Electronics in Lebanon"}
        </h1>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {ar
            ? "اكتشف الهواتف الذكية والأجهزة اللوحية واللابتوبات والساعات الذكية والصوتيات والإكسسوارات من Space Call، مع توفر مباشر وأسعار واضحة وتسوق آمن عبر Shopify."
            : "Shop smartphones, tablets, laptops, smartwatches, audio and accessories at Space Call, with live availability, clear pricing and secure Shopify checkout."}
        </p>

        <nav className="mt-4 flex flex-wrap gap-x-5 gap-y-2" aria-label={ar ? "روابط التسوق الرئيسية" : "Main shopping links"}>
          <Link to="/shop" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline sm:text-sm">
            {ar ? "تسوّق كل المنتجات" : "Shop all products"}
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          </Link>
          <Link to="/categories" className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-primary sm:text-sm">
            {ar ? "تصفّح الفئات" : "Browse categories"}
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          </Link>
          <Link to="/brands" className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-primary sm:text-sm">
            {ar ? "تسوّق حسب العلامة التجارية" : "Shop by brand"}
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Index() {
  const { t, language } = useLanguage();
  const [showProductSections, setShowProductSections] = useState(false);
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const { data: collections } = useSuspenseQuery(collectionsQueryOptions());
  const { data: newItems = [] } = useQuery({
    ...newestQueryOptions(),
    enabled: showProductSections,
  });
  const { data: bestSellers = [] } = useQuery({
    ...bestSellingQueryOptions(),
    enabled: showProductSections,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setShowProductSections(true), 350);
    return () => window.clearTimeout(timer);
  }, []);

  const products = catalog.products;
  const brands = buildShopifyBrands(catalog.brands, collections);
  const deals = products.filter((product) => productDiscountPercent(product) !== null);
  const best = bestSellers ?? [];

  return (
    <StoreLayout>
      <div className="home-page">
        {products.length === 0 ? (
          <div className="px-4"><div className="rounded-3xl border border-dashed bg-card px-6 py-16 text-center"><h1 className="text-2xl font-bold">{t("welcomeStore")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("catalogUpdating")}</p></div></div>
        ) : (
          <>
            <ShopifyHeroCollections collections={collections} />

            <HomeSeoIntro language={language} />
            <BenefitsBar compact />

            <CategorySection catalog={catalog} collections={collections} />
            <TopBrands brands={brands} />

            {showProductSections ? (
              <>
                {best.length > 0 && <section data-testid="best-sellers"><SectionHeader title={t("bestSellers")} subtitle={t("bestSellersDescription")} /><ProductRail products={best} storageKey="space-cell-home-best-sellers-view" /></section>}

                {deals.length > 0 && (
                  <section id="deals" className="scroll-mt-24" data-testid="deals-section">
                    <SectionHeader title={t("todaysDeals")} subtitle={t("dealsDescription")} action={<DealsCountdown />} />
                    {deals.length <= 2 ? <DealSpotlight products={deals} /> : <ProductRail products={deals} storageKey="space-cell-home-deals-view" />}
                    <div className="mt-4"><Link to="/shop" search={{ availability: "on-sale" }} className="press inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-xs font-bold hover:border-primary hover:text-primary">{t("allDeals")} <ArrowRight className="h-3.5 w-3.5" /></Link></div>
                  </section>
                )}

                {newItems.length > 0 && (
                  <section data-testid="new-items">
                    <SectionHeader title={t("newItems")} subtitle={t("newItemsDescription")} action={<Link to="/shop" search={{ sort: "newest" }} className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-primary hover:underline">{t("viewAll")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" /></Link>} />
                    <ProductRail products={newItems} storageKey="space-cell-home-new-items-view" />
                  </section>
                )}

                <BundleSection collections={collections} />
                <BrandShowcase catalog={catalog} collections={collections} />
              </>
            ) : (
              <div className="h-52 animate-pulse rounded-3xl bg-surface" aria-hidden="true" />
            )}

            <RecentlyViewed products={products} />
            <ServicesStrip />
            <WhyShop />
            <Newsletter />
          </>
        )}
      </div>
    </StoreLayout>
  );
}

import { absoluteUrl, canonicalLink, jsonLd, SITE_NAME, SITE_URL } from "@/lib/seo";
