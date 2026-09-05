import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";

import { CatalogView } from "@/components/CatalogView";
import { StoreLayout } from "@/components/StoreLayout";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import { categoryDefinition, displayCollections, productsInCategory } from "@/lib/taxonomy";
import { absoluteUrl, breadcrumbJsonLd, canonicalLink, itemListJsonLd, jsonLd } from "@/lib/seo";

export const Route = createFileRoute("/category/$slug")({
  validateSearch: parseProductSearch,
  loader: async ({ context, params }) => {
    const definition = categoryDefinition(params.slug);
    if (!definition) throw notFound();
    const catalog = await context.queryClient.ensureQueryData(catalogQueryOptions());
    context.queryClient.prefetchQuery(collectionsQueryOptions());
    return { label: definition.label, products: productsInCategory(catalog, params.slug) };
  },
  head: ({ params, loaderData }) => {
    const label = loaderData?.label ?? categoryDefinition(params.slug)?.label ?? "Category";
    const description = `Shop ${label.toLowerCase()} at Space Cell with live pricing, stock and secure checkout.`;
    const path = `/category/${params.slug}`;
    return {
      meta: [
        { title: `${label} — Space Cell` },
        { name: "description", content: description },
        { property: "og:title", content: `${label} — Space Cell` },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: absoluteUrl(path) },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [canonicalLink(path)],
      scripts: loaderData
        ? [
            jsonLd(breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: label, path }])),
            jsonLd(itemListJsonLd(label, loaderData.products)),
          ]
        : [],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const { data: collections } = useQuery(collectionsQueryOptions());
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const definition = categoryDefinition(slug);
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
        title={definition?.label ?? slug}
        description={`${inCategory.length} product${inCategory.length === 1 ? "" : "s"} in this category, matched automatically from Shopify product data.`}
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
