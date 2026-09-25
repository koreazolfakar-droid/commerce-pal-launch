import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";

import { CatalogView } from "@/components/CatalogView";
import { StoreLayout } from "@/components/StoreLayout";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { buildCatalogIndex } from "@/lib/taxonomy";
import { useMemo } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchCollectionByHandle } from "@/lib/storefrontData";
import { breadcrumbJsonLd, canonicalLink, itemListJsonLd, jsonLd, socialMeta } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";

export const Route = createFileRoute("/collections/$handle")({
  validateSearch: parseProductSearch,
  loader: async ({ params }) => {
    const result = await fetchCollectionByHandle(params.handle);
    if (!result) throw notFound();
    return result;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: `Collection unavailable — ${STORE_NAME}` },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const collectionName = loaderData.collection.title;
    const title = `${collectionName} in Lebanon | ${STORE_NAME}`;
    const rawDescription = loaderData.collection.description?.trim() ?? "";
    const description =
      rawDescription.length >= 90
        ? rawDescription.slice(0, 155)
        : `Shop ${collectionName} in Lebanon at ${STORE_NAME} with live prices, current availability and direct Space Call checkout.`;
    const image = loaderData.collection.image?.url;
    const path = `/collections/${params.handle}`;
    const hasProducts = loaderData.products.length > 0;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        {
          name: "robots",
          content: hasProducts
            ? "index, follow, max-image-preview:large, max-snippet:-1"
            : "noindex, follow",
        },
        ...socialMeta({ title, description, path, ...(image ? { image } : {}) }),
      ],
      links: [canonicalLink(path)],
      scripts: [
        jsonLd(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Collections", path: "/collections" },
            { name: collectionName, path },
          ]),
        ),
        jsonLd(itemListJsonLd(collectionName, loaderData.products)),
      ],
    };
  },
  component: CollectionPage,
  errorComponent: CollectionError,
  notFoundComponent: CollectionNotFound,
});

function CollectionPage() {
  const { collection, products: allProducts } = Route.useLoaderData();
  const catalog = useMemo(() => buildCatalogIndex(allProducts), [allProducts]);
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const products = applyFilters(allProducts, catalog, filters);
  return (
    <StoreLayout>
      <CatalogView
        title={collection.title}
        description={collection.description}
        products={products}
        total={allProducts.length}
        filters={filters}
        facets={{ categories: catalog.categories, brands: catalog.brands }}
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

function CollectionNotFound() {
  const { handle } = Route.useParams();
  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Collection not found</h1>
        <p className="mt-3 text-muted-foreground">
          There's no collection called “{handle}” in the store yet.
        </p>
        <Link to="/collections" className="mt-6 inline-block font-medium text-primary">
          Browse all collections
        </Link>
      </div>
    </div>
  );
}

function CollectionError() {
  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">We couldn't load this collection</h1>
        <Link to="/" className="mt-6 inline-block font-medium text-primary">
          Go home
        </Link>
      </div>
    </div>
  );
}
