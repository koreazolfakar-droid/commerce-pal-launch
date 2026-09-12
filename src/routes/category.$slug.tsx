import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";

import { CatalogView } from "@/components/CatalogView";
import { StoreLayout } from "@/components/StoreLayout";
import { categoryLabel, useLanguage } from "@/lib/i18n";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import { categoryDefinition, displayCollections, productsInCategory } from "@/lib/taxonomy";
import { absoluteUrl, breadcrumbJsonLd, canonicalLink, itemListJsonLd, jsonLd } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";

export const Route = createFileRoute("/category/$slug")({
  validateSearch: parseProductSearch,
  loader: async ({ context, params }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQueryOptions());
    const definition =
      catalog.categories.find((item) => item.slug === params.slug) ??
      categoryDefinition(params.slug);
    if (!definition) throw notFound();
    await context.queryClient.ensureQueryData(collectionsQueryOptions());
    return { label: definition.label, products: productsInCategory(catalog, params.slug) };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: `Category unavailable — ${STORE_NAME}` },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    const label = loaderData?.label ?? categoryDefinition(params.slug)?.label ?? "Category";
    const title = `${label} in Lebanon | ${STORE_NAME}`;
    const description = `Shop ${label.toLowerCase()} in Lebanon from ${STORE_NAME} with live pricing, stock and secure Shopify checkout.`;
    const path = `/category/${params.slug}`;
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
            jsonLd(itemListJsonLd(label, loaderData.products)),
          ]
        : [],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { t, language } = useLanguage();
  const { slug } = Route.useParams();
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const { data: collections } = useQuery(collectionsQueryOptions());
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const definition =
    catalog.categories.find((item) => item.slug === slug) ?? categoryDefinition(slug);
  const label = definition ? categoryLabel(definition, language) : slug;
  const inCategory = productsInCategory(catalog, slug);
  const products = applyFilters(inCategory, catalog, filters);

  const update = (patch: Partial<ProductFilters>) =>
    navigate({ search: (prev: ProductFilters) => ({ ...prev, ...patch }) });

  const brands = catalog.brands.filter((brand) =>
    inCategory.some((product) => catalog.brandOf.get(product.node.handle)?.slug === brand.slug),
  );

  return (
    <StoreLayout>
      <CatalogView
        title={label}
        description={`${inCategory.length} ${t(inCategory.length === 1 ? "product" : "products")}`}
        products={products}
        total={inCategory.length}
        filters={filters}
        facets={{
          brands,
          collections: displayCollections(collections ?? []),
        }}
        priceMin={catalog.priceMin}
        priceMax={catalog.priceMax}
        currency={catalog.currency}
        onChange={update}
        onReset={() => navigate({ search: {} })}
      />
    </StoreLayout>
  );
}
