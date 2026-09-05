import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { ProductCard } from "@/components/ProductCard";
import { BottomNav } from "@/components/BottomNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchCollectionByHandle, type ShopifyProduct } from "@/lib/shopify";
import { absoluteUrl, breadcrumbJsonLd, canonicalLink, itemListJsonLd, jsonLd } from "@/lib/seo";

export const Route = createFileRoute("/collections/$handle")({
  loader: async ({ params }) => {
    const result = await fetchCollectionByHandle(params.handle);
    if (!result) throw notFound();
    return result;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Collection unavailable — Space Cell" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.collection.title} — Space Cell`;
    const description =
      loaderData.collection.description?.slice(0, 155) ||
      `Shop ${loaderData.collection.title} at Space Cell with secure checkout.`;
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
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [canonicalLink(path)],
      scripts: [
        jsonLd(breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Collections", path: "/collections" }, { name: loaderData.collection.title, path }])),
        jsonLd(itemListJsonLd(loaderData.collection.title, loaderData.products)),
      ],
    };
  },
  component: CollectionPage,
  errorComponent: CollectionError,
  notFoundComponent: CollectionNotFound,
});

function CollectionPage() {
  const { collection, products } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <section className="border-b bg-promo">
          <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Collection
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              {collection.title}
            </h1>
            {collection.description && (
              <p className="mt-3 max-w-2xl text-muted-foreground">{collection.description}</p>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10">
          {products.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">
              No products in this collection yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product: ShopifyProduct) => (
                <ProductCard key={product.node.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
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
