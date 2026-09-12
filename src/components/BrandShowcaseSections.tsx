import { categoryLabel, useLanguage } from "@/lib/i18n";
import { collectionQueryOptions, showcaseCollectionsQueryOptions } from "@/lib/queries";
import type { ShowcaseCollection } from "@/lib/merchandising";
import { ProductRail } from "@/components/ProductRail";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useQueries, useQuery } from "@tanstack/react-query";

import { buildShopifyBrands } from "@/lib/brandDirectory";
import { findFacetMerchandising } from "@/lib/homeMerchandising";
import { cdnImage } from "@/lib/image";
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
  subtitle?: string | undefined;
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

      <div
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5"
        role="list"
      >
        {catalog.categories.map((category, index) => {
          const previewProduct = productsInCategory(catalog, category.slug).find(
            (product) => product.node.images.edges[0]?.node,
          );
          const image = previewProduct?.node.images.edges[0]?.node;
          const label = categoryLabel(category, language);

          return (
            <Link
              key={category.slug}
              to="/category/$slug"
              params={{ slug: category.slug }}
              role="listitem"
              className="group relative isolate min-h-[7.4rem] overflow-hidden rounded-[1.15rem] border border-border/70 bg-card p-3 shadow-card transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:min-h-[8.25rem] sm:rounded-[1.3rem] sm:p-3.5 lg:min-h-[8.75rem]"
            >
              <div
                className={`pointer-events-none absolute inset-0 opacity-90 ${
                  index % 4 === 0
                    ? "bg-gradient-to-br from-primary/[0.10] via-transparent to-sky-400/[0.06]"
                    : index % 4 === 1
                      ? "bg-gradient-to-br from-violet-500/[0.08] via-transparent to-primary/[0.06]"
                      : index % 4 === 2
                        ? "bg-gradient-to-br from-cyan-400/[0.08] via-transparent to-primary/[0.07]"
                        : "bg-gradient-to-br from-primary/[0.07] via-transparent to-indigo-400/[0.07]"
                }`}
                aria-hidden="true"
              />

              <div className="relative z-10 max-w-[66%] sm:max-w-[62%]">
                <h3 className="line-clamp-2 text-[0.82rem] font-black leading-[1.15] tracking-tight text-foreground sm:text-sm">
                  {label}
                </h3>
                <span className="mt-2.5 grid h-7 w-7 place-items-center rounded-full border border-border/70 bg-background/85 text-primary shadow-sm backdrop-blur transition group-hover:border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground sm:mt-3 sm:h-8 sm:w-8">
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
                </span>
              </div>

              {image ? (
                <img
                  src={cdnImage(image.url, 320)}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  width={220}
                  height={220}
                  className="pointer-events-none absolute -bottom-2 -end-2 h-[74%] w-[58%] object-contain object-bottom transition-transform duration-300 group-hover:scale-[1.045] sm:-bottom-2 sm:-end-1 sm:h-[78%] sm:w-[60%]"
                />
              ) : category.icon ? (
                <span
                  className="pointer-events-none absolute bottom-3 end-3 grid h-12 w-12 place-items-center rounded-2xl border border-primary/15 bg-primary/[0.07] text-primary sm:h-14 sm:w-14"
                  aria-hidden="true"
                >
                  <category.icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.7} />
                </span>
              ) : null}

              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card/55 to-transparent"
                aria-hidden="true"
              />
            </Link>
          );
        })}
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

/** Every live brand keeps a compact product section without any hero artwork. */
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
    <div className="space-y-6" data-testid="brand-showcases">
      {brands.map((brand) => {
        const products = productsOfBrand(catalog, brand.slug);
        const merchandising = findFacetMerchandising(collections, "brand", brand.slug);
        return (
          <FacetSection
            key={brand.slug}
            id={`brand-${brand.slug}`}
            kind="brand"
            slug={brand.slug}
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

function FacetSection({
  id,
  title,
  description,
  href,
  products,
  kind,
  slug,
}: {
  id: string;
  title: string;
  description?: string | null;
  href: string;
  products: ShopifyProduct[];
  kind: "brand" | "category";
  slug: string;
}) {
  return (
    <section
      aria-labelledby={id}
      data-facet-kind={kind}
      data-facet-slug={slug}
      className="overflow-hidden rounded-2xl border bg-card"
    >
      <div className="p-4 sm:p-5">
        <Header id={id} title={title} subtitle={description || undefined} href={href} />
      </div>
      <div className="border-t p-4 sm:p-5">
        <ProductRail
          products={products.slice(0, 8)}
          storageKey={`space-cell-${kind}-${slug}-view`}
        />
      </div>
    </section>
  );
}

function ShopifyShowcase({ collection }: { collection: ShowcaseCollection }) {
  const { t } = useLanguage();
  const { data, isPending } = useQuery(collectionQueryOptions(collection.handle));
  return (
    <section
      className="overflow-hidden rounded-2xl border bg-card"
      aria-labelledby={`showcase-${collection.handle}`}
    >
      <div className="p-4 sm:p-5">
        <Header
          id={`showcase-${collection.handle}`}
          title={collection.title}
          subtitle={collection.description}
          href={`/collections/${collection.handle}`}
        />
      </div>
      <div className="border-t p-4 sm:p-5">
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
