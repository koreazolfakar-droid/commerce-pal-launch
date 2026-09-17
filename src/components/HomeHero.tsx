import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { TrustBenefitsRail } from "@/components/TrustBenefitsRail";
import type { CmsHeroSlide } from "@/lib/cms";
import { homepageHeroCollections } from "@/lib/homeMerchandising";
import { useLanguage } from "@/lib/i18n";
import { collectionsQueryOptions } from "@/lib/queries";
import type { ShopifyCollection, ShopifyProduct } from "@/lib/shopify";

type HomeHeroCollection =
  | {
      collection: ShopifyCollection;
      products: ShopifyProduct[];
    }
  | null
  | undefined;

type StoredHomeHero = {
  cachedAt: number;
  value: Exclude<HomeHeroCollection, null | undefined>;
};

const HERO_ROTATION_MS = 8000;
const HERO_REFRESH_FALLBACK_TTL_MS = 10 * 60 * 1000;
const HERO_REFRESH_FALLBACK_STORAGE_KEY = "space-call-home-hero-refresh-fallback-v1";
const SHOPIFY_CDN = /cdn\.shopify\.com|shopifycdn\.(net|com)/;
const HERO_IMAGE_WIDTHS = [640, 960, 1280, 1600, 1920, 2400, 2880] as const;

function heroCdnImage(url: string | undefined, width: number): string | undefined {
  if (!url) return undefined;
  if (!SHOPIFY_CDN.test(url)) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set("width", String(width));
    parsed.searchParams.set("format", "webp");
    parsed.searchParams.set("quality", "88");
    return parsed.toString();
  } catch {
    return url;
  }
}

function heroCdnSrcSet(url: string | undefined): string | undefined {
  if (!url || !SHOPIFY_CDN.test(url)) return undefined;
  return HERO_IMAGE_WIDTHS.map((width) => `${heroCdnImage(url, width)} ${width}w`).join(", ");
}

function readStoredHero(): Exclude<HomeHeroCollection, null | undefined> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(HERO_REFRESH_FALLBACK_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredHomeHero>;
    const valid =
      typeof parsed.cachedAt === "number" &&
      Boolean(parsed.value?.collection?.id) &&
      Array.isArray(parsed.value?.products);

    if (!valid || Date.now() - parsed.cachedAt! >= HERO_REFRESH_FALLBACK_TTL_MS) {
      window.sessionStorage.removeItem(HERO_REFRESH_FALLBACK_STORAGE_KEY);
      return null;
    }

    return parsed.value as Exclude<HomeHeroCollection, null | undefined>;
  } catch {
    return null;
  }
}

function storeHero(value: Exclude<HomeHeroCollection, null | undefined>) {
  if (typeof window === "undefined") return;

  try {
    const snapshot: StoredHomeHero = { cachedAt: Date.now(), value };
    window.sessionStorage.setItem(HERO_REFRESH_FALLBACK_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage may be unavailable in private/restricted browser contexts.
  }
}

export function HomeHero({
  products: _products,
  heroCollection,
  cmsHeroSlides: _cmsHeroSlides = [],
}: {
  products: ShopifyProduct[];
  heroCollection?: HomeHeroCollection;
  cmsHeroSlides?: CmsHeroSlide[];
}) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [storedHeroCollection, setStoredHeroCollection] = useState<
    Exclude<HomeHeroCollection, null | undefined> | null
  >(null);
  const [failedShopifySlideId, setFailedShopifySlideId] = useState<string>();

  useEffect(() => {
    if (heroCollection?.collection) {
      storeHero(heroCollection);
      setStoredHeroCollection(heroCollection);
      return;
    }

    const fallback = readStoredHero();
    if (fallback) setStoredHeroCollection(fallback);
  }, [heroCollection]);

  const effectiveHeroCollection = heroCollection?.collection
    ? heroCollection
    : storedHeroCollection;

  const cachedCollections = queryClient.getQueryData<ShopifyCollection[]>(
    collectionsQueryOptions().queryKey,
  );

  const configuredCollections = useMemo(() => {
    const collections = cachedCollections ?? [];
    const primary = effectiveHeroCollection?.collection;
    if (!primary) return collections;

    return [primary, ...collections.filter((collection) => collection.id !== primary.id)];
  }, [cachedCollections, effectiveHeroCollection?.collection]);

  const shopifySlides = useMemo(
    () => homepageHeroCollections(configuredCollections),
    [configuredCollections],
  );
  const slideCount = shopifySlides.length;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex((current) => (slideCount ? Math.min(current, slideCount - 1) : 0));
  }, [slideCount]);

  useEffect(() => {
    if (slideCount <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, HERO_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [slideCount]);

  const shopifySlide = shopifySlides[activeIndex] ?? shopifySlides[0];
  const shopifyImage = shopifySlide?.image;
  const shopifyImageActive = Boolean(
    shopifySlide && shopifyImage && failedShopifySlideId !== shopifySlide.id,
  );
  const heroFallbackProduct = effectiveHeroCollection?.products.find((product) =>
    Boolean(product.node.images.edges[0]?.node.url),
  );
  const heroFallbackImage = heroFallbackProduct?.node.images.edges[0]?.node;
  const heroSource = shopifyImageActive
    ? "shopify-collection"
    : heroFallbackImage && heroFallbackProduct
      ? "hero-product-fallback"
      : "placeholder";

  useEffect(() => {
    if (
      shopifySlide?.id &&
      failedShopifySlideId &&
      shopifySlide.id !== failedShopifySlideId
    ) {
      setFailedShopifySlideId(undefined);
    }
  }, [failedShopifySlideId, shopifySlide?.id]);

  const shopifyHeroPicture =
    shopifyImageActive && shopifyImage && shopifySlide ? (
      <picture>
        <source
          media="(max-width: 639px)"
          srcSet={heroCdnSrcSet(shopifyImage.url)}
          sizes="100vw"
        />
        <img
          key={`${shopifySlide.id}:${shopifyImage.url}`}
          src={heroCdnImage(shopifyImage.url, 1920)}
          srcSet={heroCdnSrcSet(shopifyImage.url)}
          sizes="(min-width: 1440px) 1400px, 100vw"
          alt={shopifyImage.altText ?? shopifySlide.title ?? "Space Call"}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          draggable={false}
          onError={() => setFailedShopifySlideId(shopifySlide.id)}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </picture>
    ) : null;

  return (
    <>
      <section
        aria-label={t("featuredTechnology")}
        data-testid="home-hero"
        data-hero-source={heroSource}
        data-hero-handle={shopifySlide?.handle ?? heroFallbackProduct?.node.handle ?? "none"}
        data-hero-collection-handle={shopifySlide?.handle}
        className="relative isolate aspect-[16/9] w-full max-w-full min-w-0 overflow-hidden rounded-[1.15rem] border border-primary/45 bg-hero text-hero-foreground shadow-float sm:aspect-auto sm:min-h-[25rem] sm:rounded-[clamp(1.25rem,3vw,2rem)] sm:border-hero-border lg:min-h-[28rem]"
      >
        {shopifyHeroPicture ? (
          <div
            data-testid="home-hero-media"
            aria-label={shopifySlide?.title ?? "Space Call"}
            className="absolute inset-0 z-[1] block overflow-hidden"
          >
            {shopifyHeroPicture}
          </div>
        ) : heroFallbackImage && heroFallbackProduct ? (
          <div
            data-testid="home-hero-media"
            aria-label={heroFallbackProduct.node.title ?? "Space Call"}
            className="absolute inset-0 z-[1] block overflow-hidden bg-white"
          >
            <picture>
              <source
                media="(max-width: 639px)"
                srcSet={heroCdnSrcSet(heroFallbackImage.url)}
                sizes="100vw"
              />
              <img
                key={`${heroFallbackProduct.node.id}:${heroFallbackImage.url}`}
                src={heroCdnImage(heroFallbackImage.url, 1920)}
                srcSet={heroCdnSrcSet(heroFallbackImage.url)}
                sizes="(min-width: 1440px) 1400px, 100vw"
                alt={heroFallbackImage.altText ?? heroFallbackProduct.node.title ?? "Space Call"}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain object-center"
              />
            </picture>
          </div>
        ) : (
          <div
            data-testid="home-hero-media"
            aria-hidden="true"
            className="absolute inset-0 z-[1] grid place-items-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-8"
          >
            <div className="grid place-items-center rounded-3xl bg-white/95 p-5 shadow-xl">
              <img src="/logo.svg" alt="" className="h-14 w-auto max-w-[15rem] object-contain" />
            </div>
          </div>
        )}

        {slideCount > 1 && (
          <div
            data-testid="home-hero-dots"
            className="absolute bottom-3 end-3 z-10 flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-2 backdrop-blur-md sm:bottom-5 sm:end-5"
            aria-label={language === "ar" ? "شرائح الهيرو" : "Hero slides"}
          >
            {Array.from({ length: slideCount }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={
                  language === "ar"
                    ? `عرض صورة الهيرو ${index + 1}`
                    : `Show hero image ${index + 1}`
                }
                aria-current={index === activeIndex ? "true" : undefined}
                className={
                  index === activeIndex
                    ? "h-2.5 w-6 rounded-full bg-primary transition-all"
                    : "h-2.5 w-2.5 rounded-full bg-white/55 transition-all hover:bg-white/80"
                }
              />
            ))}
          </div>
        )}
      </section>

      <div className="mt-3 sm:mt-4">
        <TrustBenefitsRail />
      </div>
    </>
  );
}
