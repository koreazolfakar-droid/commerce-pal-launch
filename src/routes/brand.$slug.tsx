import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { CatalogView } from "@/components/CatalogView";
import { buildShopifyBrands } from "@/lib/brandDirectory";
import { categoryLabel, useLanguage } from "@/lib/i18n";
import { StoreLayout } from "@/components/StoreLayout";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import { absoluteUrl, breadcrumbJsonLd, canonicalLink, itemListJsonLd, jsonLd } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";

export const Route = createFileRoute("/brand/$slug")({
  validateSearch: parseProductSearch,
  loader: async ({ context, params }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQueryOptions());
    await context.queryClient.ensureQueryData(collectionsQueryOptions());
    const brand = catalog.brands.find((entry) => entry.slug === params.slug);
    if (!brand) throw notFound();
    return {
      label: brand.label,
      products: catalog.products.filter(
        (product) => catalog.brandOf.get(product.node.handle)?.slug === params.slug,
      ),
    };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: `Brand unavailable — ${STORE_NAME}` },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    const label = loaderData?.label ?? params.slug.replace(/-/g, " ");
    const title = `${label} Products in Lebanon | ${STORE_NAME}`;
    const description = `Shop ${label} phones, devices and accessories in Lebanon from ${STORE_NAME} with live Shopify pricing and stock.`;
    const path = `/brand/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: absoluteUrl(path) },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [canonicalLink(path)],
      scripts: loaderData
        ? [
            jsonLd(
              breadcrumbJsonLd([
                { name: "Home", path: "/" },
                { name: label, path },
              ]),
            ),
            jsonLd(itemListJsonLd(`${label} products`, loaderData.products)),
          ]
        : [],
    };
  },
  component: BrandPage,
});

function BrandPage() {
  const { language } = useLanguage();
  const { data: collections } = useSuspenseQuery(collectionsQueryOptions());
  const { slug } = Route.useParams();
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const brand = buildShopifyBrands(catalog.brands, collections).find(
    (entry) => entry.slug === slug,
  );
  const inBrand = catalog.products.filter(
    (product) => catalog.brandOf.get(product.node.handle)?.slug === slug,
  );
  const products = applyFilters(inBrand, catalog, filters);

  const categories = catalog.categories.filter((category) =>
    inBrand.some((product) =>
      (catalog.categoryOf.get(product.node.handle) ?? []).includes(category.slug),
    ),
  );

  const header = categories.length ? (
    <div className="mb-5 flex flex-wrap gap-2" aria-label="Brand categories">
      {categories.map((category) => (
        <button
          key={category.slug}
          type="button"
          onClick={() =>
            navigate({
              search: (prev: ProductFilters) => ({ ...prev, category: [category.slug] }),
            })
          }
          aria-pressed={filters.category?.includes(category.slug) ?? false}
          className="min-h-10 rounded-full border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:border-primary aria-pressed:border-primary aria-pressed:bg-accent"
        >
          {categoryLabel(category, language)}
        </button>
      ))}
    </div>
  ) : undefined;

  return (
    <StoreLayout>
      <CatalogView
        title={`${brand?.label ?? slug} products`}
        description={`${inBrand.length} product${inBrand.length === 1 ? "" : "s"} from this brand, resolved automatically from Shopify vendor and product data.`}
        products={products}
        total={inBrand.length}
        filters={filters}
        facets={{ categories }}
        priceMin={catalog.priceMin}
        priceMax={catalog.priceMax}
        currency={catalog.currency}
        header={header}
        onChange={(patch: Partial<ProductFilters>) =>
          navigate({ search: (prev: ProductFilters) => ({ ...prev, ...patch }) })
        }
        onReset={() => navigate({ search: {} })}
      />
    </StoreLayout>
  );
}
