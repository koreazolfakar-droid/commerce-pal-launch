import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";

import { CatalogView } from "@/components/CatalogView";
import { StoreLayout } from "@/components/StoreLayout";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { buildCatalogIndex } from "@/lib/taxonomy";
import { ProductImage } from "@/components/ProductImage";
import { useMemo } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchCollectionByHandle } from "@/lib/shopify";
import { absoluteUrl, breadcrumbJsonLd, canonicalLink, itemListJsonLd, jsonLd } from "@/lib/seo";
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
    const title = `${loaderData.collection.title} — ${STORE_NAME}`;
    const description =
      loaderData.collection.description?.slice(0, 155) ||
      `Shop ${loaderData.collection.title} at ${STORE_NAME} with secure checkout.`;
    const image = loaderData.collection.image?.url;
    const path = `/collections/${params.handle}`;
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
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [canonicalLink(path)],
      scripts: [
        jsonLd(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Collections", path: "/collections" },
            { name: loaderData.collection.title, path },
          ]),
        ),
        jsonLd(itemListJsonLd(loaderData.collection.title, loaderData.products)),
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
        header={
          <section className="mb-7 grid items-center gap-6 overflow-hidden rounded-3xl border bg-surface p-5 sm:p-8 md:grid-cols-2">
            <div className="min-w-0">
              <h1 className="break-words text-3xl font-extrabold leading-tight">
                {collection.title}
              </h1>
              {collection.description && (
                <p className="mt-3 break-words leading-relaxed text-muted-foreground">
                  {collection.description}
                </p>
              )}
            </div>
            {collection.image && (
              <ProductImage
                url={collection.image.url}
                alt={collection.image.altText ?? collection.title}
                eager
                className="max-h-64 rounded-2xl"
                size={900}
                imageClassName="p-3"
              />
            )}
          </section>
        }
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
