import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { CatalogView } from "@/components/CatalogView";
import { StoreLayout } from "@/components/StoreLayout";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { catalogQueryOptions } from "@/lib/queries";

export const Route = createFileRoute("/brand/$slug")({
  validateSearch: parseProductSearch,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQueryOptions());
  },
  head: ({ params }) => {
    const label = params.slug.replace(/-/g, " ");
    const description = `Shop ${label} devices and accessories at Space Cell with live Shopify pricing and stock.`;
    return {
      meta: [
        { title: `${label} products — Space Cell` },
        { name: "description", content: description },
        { property: "og:title", content: `${label} products — Space Cell` },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: BrandPage,
});

function BrandPage() {
  const { slug } = Route.useParams();
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const brand = catalog.brands.find((entry) => entry.slug === slug);
  const inBrand = catalog.products.filter(
    (product) => catalog.brandOf.get(product.node.handle)?.slug === slug,
  );
  const products = applyFilters(inBrand, catalog, filters);

  const categories = catalog.categories.filter((category) =>
    inBrand.some((product) =>
      (catalog.categoryOf.get(product.node.handle) ?? []).includes(category.slug),
    ),
  );

  return (
    <StoreLayout>
      <CatalogView
        title={brand?.label ?? slug}
        description={`${inBrand.length} product${inBrand.length === 1 ? "" : "s"} from this brand, resolved automatically from Shopify vendor and product data.`}
        products={products}
        total={inBrand.length}
        filters={filters}
        facets={{ categories }}
        priceMin={catalog.priceMin}
        priceMax={catalog.priceMax}
        currency={catalog.currency}
        onChange={(patch: Partial<ProductFilters>) =>
          navigate({ search: (prev: ProductFilters) => ({ ...prev, ...patch }) })
        }
        onReset={() => navigate({ search: {} })}
      />
    </StoreLayout>
  );
}
