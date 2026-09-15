import { categoryLabel, useLanguage } from "@/lib/i18n";
import {
  collectionQueryOptions,
  homeVendorProductsQueryOptions,
  showcaseCollectionsQueryOptions,
} from "@/lib/queries";
import type { ShowcaseCollection } from "@/lib/merchandising";
import { ProductRail } from "@/components/ProductRail";
import { ProductViewToggle } from "@/components/ProductViewToggle";
import { CategoryGlyph } from "@/components/CategoryGlyph";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { buildShopifyBrands } from "@/lib/brandDirectory";
import { findCategoryArtworkCollection } from "@/lib/categoryArtwork";
import { findFacetMerchandising } from "@/lib/homeMerchandising";
import { cdnImage } from "@/lib/image";
import { productsInCategory, productsOfBrand } from "@/lib/taxonomy";
import { useProductViewMode } from "@/hooks/useProductViewMode";

import {
  fetchCollectionByHandle,
  type ShopifyCollection,
  type ShopifyProduct,
} from "@/lib/shopify";
import type { CatalogIndex } from "@/lib/taxonomy";

const HOME_BRAND_PRODUCT_TARGET = 4;

function mergeUniqueProducts(...groups: ShopifyProduct[][]) {
  const seen = new Set<string>();
  const merged: ShopifyProduct[] = [];
  for (const product of groups.flat()) {
    if (seen.has(product.node.id)) continue;
    seen.add(product.node.id);
    merged.push(product);
  }
  return merged;
}

function useNearViewport(enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [nearby, setNearby] = useState(!enabled);

  useEffect(() => {
    if (!enabled || nearby) return;
    const node = ref.current;
    if (!node) return;

    if (!("IntersectionObserver" in window)) {
      setNearby(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setNearby(true);
        observer.disconnect();
      },
      {
        rootMargin: "1000px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, nearby]);

  return { ref, nearby };
}

function Header({
  id,
  title,
  subtitle,
  href = "/shop",
  actions,
  compact = false,
}: {
  id?: string;
  title: string;
  subtitle?: string | undefined;
  href?: string;
  actions?: ReactNode;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div
      className={
        compact ? "home-section-header !mb-0 flex-nowrap items-start" : "home-section-header"
      }
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id={id} className="break-words text-xl font-black tracking-tight">
            {title}
          </h2>
          <Link
            to={href as "/shop"}
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-1 py-1 text-xs font-bold text-primary transition-colors hover:text-primary/80 hover:underline"
          >
            {t("viewAll")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </Link>
        </div>
        {subtitle && (
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && <div className="shrink-0 pt-0.5">{actions}</div>}
    </div>
  );
}

export function CategorySection({
  catalog,
  collections,
}: {
  catalog: CatalogIndex;
  collections: ShopifyCollection[];
}) {
  const { language } = useLanguage();
  if (!catalog.categories.length) return null;
  const title = language === "ar" ? "تسوّق حسب الفئة" : "Shop by Category";

  return (
    <section
      aria-labelledby="home-categories"
      data-testid="category-section"
      className="overflow-hidden"
    >
      <Header id="home-categories" title={title} href="/categories" />
      <div className="relative -mx-4 sm:mx-0">
        <div
          className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 pe-14 scroll-smooth [scroll-padding-inline:1rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4 sm:px-0 sm:pe-0 lg:gap-5"
          role="list"
          aria-label={title}
        >
          {catalog.categories.map((category) => {
            const label = categoryLabel(category, language);
            const artwork = findCategoryArtworkCollection(
              collections,
              category.slug,
              category.label,
            );
            const imageUrl = cdnImage(artwork?.image?.url, 128);

            return (
              <Link
                key={category.slug}
                to="/category/$slug"
                params={{ slug: category.slug }}
                role="listitem"
                aria-label={label}
                className="group flex w-[5.8rem] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl px-1 py-1.5 text-center transition duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-[6.6rem] sm:gap-2.5 lg:w-[7.1rem]"
              >
                <span
                  className="relative grid h-[4.65rem] w-[4.65rem] shrink-0 place-items-center overflow-hidden rounded-[1.35rem] border border-border/70 bg-card shadow-card transition duration-300 group-hover:border-primary/25 group-hover:shadow-card-hover sm:h-[5.2rem] sm:w-[5.2rem] sm:rounded-[1.5rem] lg:h-[5.6rem] lg:w-[5.6rem]"
                  aria-hidden="true"
                >
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50 dark:from-card dark:via-card dark:to-surface" />
                  <span className="pointer-events-none absolute inset-x-3 top-1 h-px bg-white/80 dark:bg-white/10" />
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="relative h-full w-full object-contain p-1.5 transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                    />
                  ) : (
                    <CategoryGlyph
                      slug={category.slug}
                      className="relative h-[4.15rem] w-[4.15rem] transition-transform duration-300 ease-out group-hover:scale-[1.06] sm:h-[4.65rem] sm:w-[4.65rem] lg:h-[5rem] lg:w-[5rem]"
                    />
                  )}
                </span>
                <h3 className="line-clamp-2 min-h-[2rem] max-w-full text-center text-[11px] font-extrabold leading-[1.15] tracking-[-0.015em] text-foreground transition-colors group-hover:text-primary sm:min-h-[2.1rem] sm:text-xs">
                  {label}
                </h3>
              </Link>
            );
          })}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 end-0 w-10 bg-gradient-to-l from-background via-background/90 to-transparent sm:hidden"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}

export function BundleSection({ collections }: { collections: ShopifyCollection[] }) {
  const { t } = useLanguage();
  const candidates = collections
    .filter((c) =>
      /(?:^|[\s-])(bundle|pack|kit|combo|set)s?(?:$|[\s-])/i.test(`${c.handle} ${c.title}`),
    )
    .slice(0, 4);
  const results = useQueries({
    queries: candidates.map((c) => ({
      queryKey: ["home-bundle", c.handle],
      queryFn: () => fetchCollectionByHandle(c.handle, 8),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const sections = candidates
    .map((c, i) => ({ collection: c, products: results[i]?.data?.products ?? [] }))
    .filter((x) => x.products.length);
  if (!sections.length) return null;
  return (
    <section aria-labelledby="home-bundles">
      <Header
        id="home-bundles"
        title={t("bundlesTitle")}
        subtitle={t("bundlesDescription")}
        href="/collections"
      />
      <div className="grid gap-3 md:grid-cols-2">
        {sections.map(({ collection, products }) => (
          <div
            key={collection.id}
            className="overflow-hidden rounded-2xl border bg-card shadow-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-extrabold">{collection.title}</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {collection.description || `${products.length} ${t("products")}`}
                </p>
              </div>
              <Link
                to="/collections/$handle"
                params={{ handle: collection.handle }}
                className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground"
              >
                {t("shopBundle")}
              </Link>
            </div>
            <div className="p-4">
              <ProductRail
                products={products.slice(0, 5)}
                storageKey={`space-cell-bundle-${collection.handle}-view`}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BrandShowcase({
  catalog,
  collections,
}: {
  catalog: CatalogIndex;
  collections: ShopifyCollection[];
}) {
  const { t, language } = useLanguage();
  const { data: showcases = [] } = useQuery(showcaseCollectionsQueryOptions());
  const brands = buildShopifyBrands(catalog.brands, collections);
  const usedShowcases = new Set(brands.map((brand) => `showcase-${brand.slug}`));
  const categoryFeatures = catalog.categories.flatMap((category) => {
    const merchandising = findFacetMerchandising(collections, "category", category.slug);
    return merchandising ? [{ category, merchandising }] : [];
  });
  return (
    <div className="space-y-5 sm:space-y-6" data-testid="brand-showcases">
      {brands.map((brand) => {
        const products = productsOfBrand(catalog, brand.slug);
        const merchandising = findFacetMerchandising(collections, "brand", brand.slug);
        return (
          <BrandFacetSection
            key={brand.slug}
            id={`brand-${brand.slug}`}
            slug={brand.slug}
            vendorLabel={brand.label}
            title={merchandising?.title || brand.label}
            description={merchandising?.description || t("brandSelection")}
            href={`/brand/${brand.slug}`}
            products={products}
          />
        );
      })}
      {categoryFeatures.map(({ category, merchandising }) => (
        <FacetSection
          key={category.slug}
          id={`category-${category.slug}`}
          kind="category"
          slug={category.slug}
          title={merchandising.title || categoryLabel(category, language)}
          description={merchandising.description}
          href={`/category/${category.slug}`}
          products={productsInCategory(catalog, category.slug)}
        />
      ))}
      {showcases
        .filter((collection) => !usedShowcases.has(collection.handle))
        .map((collection) => (
          <ShopifyShowcase key={collection.handle} collection={collection} />
        ))}
    </div>
  );
}

function BrandFacetSection({
  id,
  slug,
  vendorLabel,
  title,
  description,
  href,
  products: indexedProducts,
}: {
  id: string;
  slug: string;
  vendorLabel: string;
  title: string;
  description?: string | null;
  href: string;
  products: ShopifyProduct[];
}) {
  const needsBackfill = indexedProducts.length < HOME_BRAND_PRODUCT_TARGET;
  const { ref, nearby } = useNearViewport(needsBackfill);
  const exactVendor =
    indexedProducts.find((product) => product.node.vendor?.trim())?.node.vendor?.trim() ||
    vendorLabel;
  const vendorQuery = homeVendorProductsQueryOptions(exactVendor);
  const {
    data: vendorProducts = [],
    isPending,
    isError,
  } = useQuery({
    ...vendorQuery,
    enabled: Boolean(exactVendor) && needsBackfill && nearby,
  });
  const products = needsBackfill
    ? mergeUniqueProducts(indexedProducts, vendorProducts).slice(0, HOME_BRAND_PRODUCT_TARGET)
    : indexedProducts;
  const loading = needsBackfill && products.length === 0 && (!nearby || isPending);
  const resolvedEmpty =
    needsBackfill &&
    nearby &&
    products.length === 0 &&
    !isPending &&
    (vendorProducts.length === 0 || isError);

  if (resolvedEmpty) return null;

  return (
    <div ref={ref} data-home-brand-shell={slug}>
      <FacetSection
        id={id}
        kind="brand"
        slug={slug}
        title={title}
        description={description}
        href={href}
        products={products}
        loading={loading}
      />
    </div>
  );
}

function FacetSection({
  id,
  title,
  description,
  href,
  products,
  kind,
  slug,
  loading = false,
}: {
  id: string;
  title: string;
  description?: string | null | undefined;
  href: string;
  products: ShopifyProduct[];
  kind: "brand" | "category";
  slug: string;
  loading?: boolean;
}) {
  const storageKey = `space-cell-${kind}-${slug}-view`;
  const [viewMode, setViewMode] = useProductViewMode("grid", storageKey);

  return (
    <section
      aria-labelledby={id}
      data-facet-kind={kind}
      data-facet-slug={slug}
      className="overflow-hidden rounded-[1.35rem] border border-border/75 bg-card shadow-card"
    >
      <div className="px-3.5 pt-3.5 sm:px-5 sm:pt-5">
        <Header
          id={id}
          title={title}
          subtitle={description || undefined}
          href={href}
          compact
          actions={<ProductViewToggle mode={viewMode} onChange={setViewMode} />}
        />
      </div>
      <div className="px-3.5 pb-3.5 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
        {loading && products.length === 0 ? (
          <div className="shimmer min-h-96 rounded-2xl bg-surface" aria-hidden="true" />
        ) : (
          <ProductRail
            products={products.slice(0, 8)}
            storageKey={storageKey}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={false}
            compactGrid
          />
        )}
      </div>
    </section>
  );
}

function ShopifyShowcase({ collection }: { collection: ShowcaseCollection }) {
  const { t } = useLanguage();
  const storageKey = `showcase-${collection.handle}-view`;
  const [viewMode, setViewMode] = useProductViewMode("grid", storageKey);
  const { data, isPending } = useQuery(collectionQueryOptions(collection.handle, 12));
  const productLabel = `${collection.productCount} ${t(collection.productCount === 1 ? "product" : "products")}`;

  return (
    <section
      className="overflow-hidden rounded-[1.35rem] border border-border/75 bg-card shadow-card"
      aria-labelledby={`showcase-${collection.handle}`}
    >
      <div className="px-3.5 pt-3.5 sm:px-5 sm:pt-5">
        <Header
          id={`showcase-${collection.handle}`}
          title={collection.title}
          subtitle={collection.description || productLabel}
          href={`/collections/${collection.handle}`}
          compact
          actions={<ProductViewToggle mode={viewMode} onChange={setViewMode} />}
        />
      </div>
      <div className="px-3.5 pb-3.5 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
        {data?.products.length ? (
          <ProductRail
            products={data.products}
            storageKey={storageKey}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={false}
            compactGrid
          />
        ) : isPending ? (
          <div className="shimmer h-48 rounded-2xl bg-surface" aria-hidden="true" />
        ) : (
          <p className="text-sm text-muted-foreground">{t("noProducts")}</p>
        )}
      </div>
    </section>
  );
}
