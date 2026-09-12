import { categoryLabel, useLanguage } from "@/lib/i18n";
import { collectionQueryOptions, showcaseCollectionsQueryOptions } from "@/lib/queries";
import type { ShowcaseCollection } from "@/lib/merchandising";
import { ProductRail } from "@/components/ProductRail";
import { CategoryGlyph } from "@/components/CategoryGlyph";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useQueries, useQuery } from "@tanstack/react-query";

import { buildShopifyBrands } from "@/lib/brandDirectory";
import { findFacetMerchandising } from "@/lib/homeMerchandising";
import { productsInCategory, productsOfBrand } from "@/lib/taxonomy";

import {
  fetchCollectionByHandle,
  type ShopifyCollection,
  type ShopifyProduct,
} from "@/lib/shopify";
import type { CatalogIndex } from "@/lib/taxonomy";

function Header({ id, title, subtitle, href = "/shop" }: { id?: string; title: string; subtitle?: string | undefined; href?: string }) {
  const { t } = useLanguage();
  return (
    <div className="home-section-header">
      <div className="min-w-0">
        <h2 id={id} className="break-words text-xl font-black tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <Link to={href as "/shop"} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline">
        {t("viewAll")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
      </Link>
    </div>
  );
}

export function CategorySection({ catalog }: { catalog: CatalogIndex; collections: ShopifyCollection[] }) {
  const { t, language } = useLanguage();
  if (!catalog.categories.length) return null;

  return (
    <section aria-labelledby="home-categories" data-testid="category-section" className="overflow-hidden">
      <Header id="home-categories" title={t("categoriesTitle")} href="/categories" />
      <div className="relative">
        <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 pe-14 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:gap-4 sm:px-0 sm:pe-0" role="list" aria-label={t("categoriesTitle")}>
          {catalog.categories.map((category) => {
            const label = categoryLabel(category, language);
            return (
              <Link
                key={category.slug}
                to="/category/$slug"
                params={{ slug: category.slug }}
                role="listitem"
                aria-label={label}
                className="group flex w-[6.65rem] shrink-0 snap-start flex-col items-center text-center focus-visible:outline-none sm:w-[7.6rem] lg:w-[8rem]"
              >
                <span
                  className="relative block aspect-square w-full overflow-hidden rounded-[1.55rem] border border-black/[0.055] bg-white shadow-[0_10px_28px_-21px_rgba(15,23,42,.38)] transition-[transform,box-shadow,border-color] duration-300 ease-out group-hover:-translate-y-0.5 group-hover:border-primary/20 group-hover:shadow-[0_18px_34px_-23px_rgba(37,99,235,.32)] group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2 sm:rounded-[1.75rem] dark:border-white/[0.1]"
                  aria-hidden="true"
                >
                  <CategoryGlyph
                    slug={category.slug}
                    className="absolute inset-0 h-full w-full transition-transform duration-300 ease-out group-hover:scale-[1.035]"
                  />
                </span>
                <h3 className="mt-2.5 line-clamp-2 min-h-[2rem] w-full px-0.5 text-[0.74rem] font-semibold leading-[1.25] tracking-[-0.012em] text-foreground sm:mt-3 sm:text-[0.8rem]">{label}</h3>
              </Link>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 end-0 w-12 bg-gradient-to-l from-background via-background/90 to-transparent sm:hidden" aria-hidden="true" />
      </div>
    </section>
  );
}

export function BundleSection({ collections }: { collections: ShopifyCollection[] }) {
  const { t } = useLanguage();
  const candidates = collections.filter((c) => /(?:^|[\s-])(bundle|pack|kit|combo|set)s?(?:$|[\s-])/i.test(`${c.handle} ${c.title}`)).slice(0, 4);
  const results = useQueries({ queries: candidates.map((c) => ({ queryKey: ["home-bundle", c.handle], queryFn: () => fetchCollectionByHandle(c.handle, 8), staleTime: 5 * 60 * 1000 })) });
  const sections = candidates.map((c, i) => ({ collection: c, products: results[i]?.data?.products ?? [] })).filter((x) => x.products.length);
  if (!sections.length) return null;
  return (
    <section aria-labelledby="home-bundles">
      <Header id="home-bundles" title={t("bundlesTitle")} subtitle={t("bundlesDescription")} href="/collections" />
      <div className="grid gap-3 md:grid-cols-2">
        {sections.map(({ collection, products }) => (
          <div key={collection.id} className="overflow-hidden rounded-2xl border bg-card shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-3">
              <div className="min-w-0"><h3 className="truncate text-sm font-extrabold">{collection.title}</h3><p className="mt-0.5 text-[11px] text-muted-foreground">{collection.description || `${products.length} ${t("products")}`}</p></div>
              <Link to="/collections/$handle" params={{ handle: collection.handle }} className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground">{t("shopBundle")}</Link>
            </div>
            <div className="p-4"><ProductRail products={products.slice(0, 5)} storageKey={`space-cell-bundle-${collection.handle}-view`} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BrandShowcase({ catalog, collections }: { catalog: CatalogIndex; collections: ShopifyCollection[] }) {
  const { t, language } = useLanguage();
  const { data: showcases = [] } = useQuery(showcaseCollectionsQueryOptions());
  const brands = buildShopifyBrands(catalog.brands, collections);
  const usedShowcases = new Set(brands.map((brand) => `showcase-${brand.slug}`));
  const categoryFeatures = catalog.categories.flatMap((category) => { const merchandising = findFacetMerchandising(collections, "category", category.slug); return merchandising ? [{ category, merchandising }] : []; });
  return (
    <div className="space-y-6" data-testid="brand-showcases">
      {brands.map((brand) => { const products = productsOfBrand(catalog, brand.slug); const merchandising = findFacetMerchandising(collections, "brand", brand.slug); return <FacetSection key={brand.slug} id={`brand-${brand.slug}`} kind="brand" slug={brand.slug} title={merchandising?.title || brand.label} description={merchandising?.description || t("brandSelection")} href={`/brand/${brand.slug}`} products={products} />; })}
      {categoryFeatures.map(({ category, merchandising }) => <FacetSection key={category.slug} id={`category-${category.slug}`} kind="category" slug={category.slug} title={merchandising.title || categoryLabel(category, language)} description={merchandising.description} href={`/category/${category.slug}`} products={productsInCategory(catalog, category.slug)} />)}
      {showcases.filter((collection) => !usedShowcases.has(collection.handle)).map((collection) => <ShopifyShowcase key={collection.handle} collection={collection} />)}
    </div>
  );
}

function FacetSection({ id, title, description, href, products, kind, slug }: { id: string; title: string; description?: string | null; href: string; products: ShopifyProduct[]; kind: "brand" | "category"; slug: string }) {
  return <section aria-labelledby={id} data-facet-kind={kind} data-facet-slug={slug} className="overflow-hidden rounded-2xl border bg-card"><div className="p-4 sm:p-5"><Header id={id} title={title} subtitle={description || undefined} href={href} /></div><div className="border-t p-4 sm:p-5"><ProductRail products={products.slice(0, 8)} storageKey={`space-cell-${kind}-${slug}-view`} /></div></section>;
}

function ShopifyShowcase({ collection }: { collection: ShowcaseCollection }) {
  const { t } = useLanguage();
  const { data, isPending } = useQuery(collectionQueryOptions(collection.handle, 12));
  return <section className="overflow-hidden rounded-2xl border bg-card" aria-labelledby={`showcase-${collection.handle}`}><div className="p-4 sm:p-5"><Header id={`showcase-${collection.handle}`} title={collection.title} subtitle={collection.description} href={`/collections/${collection.handle}`} /></div><div className="border-t p-4 sm:p-5"><p className="mb-2 text-xs text-muted-foreground">{collection.productCount} {t(collection.productCount === 1 ? "product" : "products")}</p>{data?.products.length ? <ProductRail products={data.products} storageKey={`showcase-${collection.handle}-view`} /> : isPending ? <div className="shimmer h-48 rounded-2xl bg-surface" aria-hidden="true" /> : <p className="text-sm text-muted-foreground">{t("noProducts")}</p>}</div></section>;
}
