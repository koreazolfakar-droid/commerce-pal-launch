import { categoryLabel, useLanguage } from "@/lib/i18n";
import { collectionQueryOptions, showcaseCollectionsQueryOptions } from "@/lib/queries";
import type { ShowcaseCollection } from "@/lib/merchandising";
import { ProductRail } from "@/components/ProductRail";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useQueries, useQuery } from "@tanstack/react-query";

import { FacetHero } from "@/components/FacetHero";
import { buildShopifyBrands } from "@/lib/brandDirectory";
import { findFacetHero } from "@/lib/homeMerchandising";
import { productsInCategory, productsOfBrand } from "@/lib/taxonomy";

import {
  fetchCollectionByHandle,
  type ShopifyCollection,
  type ShopifyProduct,
} from "@/lib/shopify";
import type { CatalogIndex } from "@/lib/taxonomy";

function Header({
  id,
  title,
  subtitle,
  href = "/shop",
}: {
  id?: string;
  title: string;
  subtitle?: string;
  href?: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="home-section-header">
      <div className="min-w-0">
        <h2 id={id} className="break-words text-xl font-black tracking-tight">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <Link
        to={href as "/shop"}
        className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline"
      >
        {t("viewAll")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
      </Link>
    </div>
  );
}

export function CategorySection({
  catalog,
}: {
  catalog: CatalogIndex;
  collections: ShopifyCollection[];
}) {
  const { t, language } = useLanguage();
  if (!catalog.categories.length) return null;
  return (
    <section aria-labelledby="home-categories" data-testid="category-section">
      <Header id="home-categories" title={t("categoriesTitle")} href="/shop" />

      <div className="scroll-rail category-icon-rail">
        {catalog.categories.map((category) => (
          <Link
            key={category.slug}
            to="/category/$slug"
            params={{ slug: category.slug }}
            className="group flex min-w-0 flex-col items-center gap-2 rounded-xl px-1 py-2 text-center transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              {category.icon ? (
                <category.icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
              ) : null}
            </span>
            <span className="break-words text-xs font-semibold leading-snug">
              {categoryLabel(category, language)}
            </span>
          </Link>
        ))}
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

/** Every live brand gets its own section, even when a merchant also adds custom showcases. */
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
  const categoryHeroes = catalog.categories.flatMap((category) => {
    const hero = findFacetHero(collections, "category", category.slug);
    return hero ? [{ category, hero }] : [];
  });
  return (
    <div className="space-y-8" data-testid="brand-showcases">
      {brands.map((brand, index) => {
        const products = productsOfBrand(catalog, brand.slug);
        const hero = findFacetHero(collections, "brand", brand.slug);
        return (
          <FacetSection
            key={brand.slug}
            id={`brand-${brand.slug}`}
            kind="brand"
            slug={brand.slug}
            title={hero?.title || brand.label}
            description={hero?.description || t("brandSelection")}
            image={hero?.image ?? products[0]?.node.images.edges[0]?.node ?? null}
            href={`/brand/${brand.slug}`}
            products={products}
            flip={index % 2 === 1}
            brand={brand}
          />
        );
      })}
      {categoryHeroes.map(({ category, hero }, index) => (
        <FacetSection
          key={category.slug}
          id={`category-${category.slug}`}
          kind="category"
          slug={category.slug}
          title={hero.title || categoryLabel(category, language)}
          description={hero.description}
          image={hero.image}
          href={`/category/${category.slug}`}
          products={productsInCategory(catalog, category.slug)}
          flip={index % 2 === 1}
        />
      ))}
      {showcases
        .filter((collection) => !usedShowcases.has(collection.handle))
        .map((collection, index) => (
          <ShopifyShowcase key={collection.handle} collection={collection} flip={index % 2 === 1} />
        ))}
    </div>
  );
}

function FacetSection({
  products,
  kind,
  slug,
  ...hero
}: Parameters<typeof FacetHero>[0] & {
  products: ShopifyProduct[];
  kind: "brand" | "category";
  slug: string;
}) {
  return (
    <section
      aria-labelledby={hero.id}
      data-facet-kind={kind}
      data-facet-slug={slug}
      className="overflow-hidden rounded-3xl border bg-card"
    >
      <FacetHero {...hero} />
      <div className="border-t p-4 sm:p-6">
        <ProductRail
          products={products.slice(0, 8)}
          storageKey={`space-cell-${kind}-${slug}-view`}
        />
      </div>
    </section>
  );
}

function ShopifyShowcase({ collection, flip }: { collection: ShowcaseCollection; flip: boolean }) {
  const { t } = useLanguage();
  const { data, isPending } = useQuery(collectionQueryOptions(collection.handle));
  return (
    <section
      className="overflow-hidden rounded-3xl border bg-card"
      aria-labelledby={`showcase-${collection.handle}`}
    >
      <FacetHero
        id={`showcase-${collection.handle}`}
        title={collection.title}
        description={collection.description}
        image={collection.image}
        href={`/collections/${collection.handle}`}
        flip={flip}
      />
      <div className="p-4 sm:p-6">
        <p className="mb-2 text-xs text-muted-foreground">
          {collection.productCount} {t(collection.productCount === 1 ? "product" : "products")}
        </p>
        {data?.products.length ? (
          <ProductRail products={data.products} storageKey={`showcase-${collection.handle}-view`} />
        ) : isPending ? (
          <div className="shimmer h-48 rounded-2xl bg-surface" aria-hidden="true" />
        ) : (
          <p className="text-sm text-muted-foreground">{t("noProducts")}</p>
        )}
      </div>
    </section>
  );
}
