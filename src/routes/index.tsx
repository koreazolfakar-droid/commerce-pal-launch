import { useLanguage } from "@/lib/i18n";
import { DealSpotlight } from "@/components/DealSpotlight";
import { useEffect, useState } from "react";
import { ProductRail } from "@/components/ProductRail";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Timer } from "lucide-react";

import { BenefitsBar, RecentlyViewed, ServicesStrip } from "@/components/HomeSections";
import { Newsletter } from "@/components/Newsletter";
import { PromoBanners, type PromoSlot } from "@/components/PromoBanners";
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
  showcaseCollectionsQueryOptions,
  shopPoliciesQueryOptions,
} from "@/lib/queries";
import { productDiscountPercent, type ShopifyProduct } from "@/lib/shopify";
import type { CatalogFacet, CatalogIndex } from "@/lib/taxonomy";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(catalogQueryOptions()),
      context.queryClient.ensureQueryData(bestSellingQueryOptions()),
      context.queryClient.ensureQueryData(newestQueryOptions()),
      context.queryClient.ensureQueryData(collectionsQueryOptions()),
      context.queryClient.ensureQueryData(showcaseCollectionsQueryOptions()),
      context.queryClient.ensureQueryData(shopPoliciesQueryOptions()),
    ]);
  },
  head: () => ({
    meta: [
      { title: `${SITE_NAME} — Premium Phones, Tablets & Audio` },
      {
        name: "description",
        content: `Shop ${SITE_NAME} smartphones, tablets, smartwatches, audio and accessories with live availability and secure Shopify checkout.`,
      },
      { property: "og:title", content: `${SITE_NAME} — Premium Phones, Tablets & Audio` },
      {
        property: "og:description",
        content:
          "Premium smartphones, tablets, audio and accessories with live availability and secure checkout.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/") },
      { property: "og:image", content: absoluteUrl("/logo.png") },
      { name: "twitter:image", content: absoluteUrl("/logo.png") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${SITE_NAME} — Premium Phones, Tablets & Audio` },
      {
        name: "twitter:description",
        content:
          "Premium smartphones, tablets, audio and accessories with live availability and secure checkout.",
      },
    ],
    links: [canonicalLink("/")],
    scripts: [
      jsonLd({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
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

function promoSlots(catalog: CatalogIndex, productOf: (facet: CatalogFacet, kind: "brand" | "category") => ShopifyProduct | undefined): PromoSlot[] {
  const brandBy = (slug: string) => catalog.brands.find((b) => b.slug === slug);
  const categoryBy = (...slugs: string[]) => slugs.map((slug) => catalog.categories.find((c) => c.slug === slug)).find(Boolean);
  const slots: PromoSlot[] = [];
  const add = (kind: "brand" | "category", facet?: CatalogFacet) => { if (facet) slots.push({ kind, facet, product: productOf(facet, kind) }); };
  add("brand", brandBy("samsung") ?? catalog.brands[0]);
  add("category", categoryBy("laptops"));
  add("category", categoryBy("audio", "headphones"));
  return slots;
}

function Index() {
  const { t, language } = useLanguage();
  const { data: newItems } = useSuspenseQuery(newestQueryOptions());
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const { data: bestSellers } = useSuspenseQuery(bestSellingQueryOptions());
  const { data: collections } = useSuspenseQuery(collectionsQueryOptions());

  const products = catalog.products;
  const brands = buildShopifyBrands(catalog.brands, collections);
  const deals = products.filter((product) => productDiscountPercent(product) !== null);
  const best = bestSellers ?? [];
  const firstOf = (facet: CatalogFacet, kind: "brand" | "category") => products.find((p) => kind === "brand" ? catalog.brandOf.get(p.node.handle)?.slug === facet.slug : (catalog.categoryOf.get(p.node.handle) ?? []).includes(facet.slug));
  const slots = promoSlots(catalog, firstOf);

  return (
    <StoreLayout>
      <div className="home-page">
        {products.length === 0 ? (
          <div className="px-4"><div className="rounded-3xl border border-dashed bg-card px-6 py-16 text-center"><h1 className="text-2xl font-bold">{t("welcomeStore")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("catalogUpdating")}</p></div></div>
        ) : (
          <>
            <BenefitsBar />
            <ShopifyHeroCollections collections={collections} />
            <CategorySection catalog={catalog} collections={collections} />
            <TopBrands brands={brands} />

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
            <PromoBanners slots={slots} />
            <ServicesStrip />
            <RecentlyViewed products={products} />
            <WhyShop />
            <Newsletter />

            <header className="max-w-3xl border-t border-border/70 pt-5" data-testid="homepage-seo-intro">
              <h1 className="text-lg font-black leading-tight tracking-tight text-foreground sm:text-xl">
                {language === "ar" ? "تسوّق الهواتف والإلكترونيات في لبنان" : "Shop Phones & Electronics in Lebanon"}
              </h1>
              <p className="mt-2 max-w-2xl text-[0.78rem] leading-relaxed text-muted-foreground sm:text-sm">
                {language === "ar"
                  ? "اكتشف أحدث الهواتف الذكية والأجهزة اللوحية واللابتوبات والساعات الذكية والصوتيات والإكسسوارات من Space Call، مع توفر مباشر وتسوق آمن عبر متجرنا في لبنان."
                  : "Discover smartphones, tablets, laptops, smartwatches, audio and accessories at Space Call, with live availability and secure shopping for customers in Lebanon."}
              </p>
            </header>

            <BenefitsBar compact />
          </>
        )}
      </div>
    </StoreLayout>
  );
}

import { absoluteUrl, canonicalLink, jsonLd, SITE_NAME, SITE_URL } from "@/lib/seo";
