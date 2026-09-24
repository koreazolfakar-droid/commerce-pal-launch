import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { BottomNav } from "@/components/BottomNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { collectionsQueryOptions } from "@/lib/queries";
import { absoluteUrl, breadcrumbJsonLd, canonicalLink, jsonLd, socialMeta } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";

export const Route = createFileRoute("/collections/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(collectionsQueryOptions()),
  head: ({ loaderData }) => {
    const title = `Electronics Collections in Lebanon | ${STORE_NAME}`;
    const description = `Browse ${STORE_NAME} electronics collections in Lebanon across smartphones, tablets, audio, chargers, cases and accessories.`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        {
          name: "robots",
          content: "index, follow, max-image-preview:large, max-snippet:-1",
        },
        ...socialMeta({ title, description, path: "/collections" }),
      ],
      links: [canonicalLink("/collections")],
      scripts: [
        jsonLd(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Collections", path: "/collections" },
          ]),
        ),
        ...(loaderData
          ? [
              jsonLd({
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: `${STORE_NAME} collections`,
                numberOfItems: loaderData.length,
                itemListElement: loaderData.map((collection, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: collection.title,
                  url: absoluteUrl(`/collections/${encodeURIComponent(collection.handle)}`),
                })),
              }),
            ]
          : []),
      ],
    };
  },
  component: CollectionsIndex,
});

function CollectionsIndex() {
  const { data: collections } = useSuspenseQuery(collectionsQueryOptions());

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">All collections</h1>
        <p className="mt-2 text-muted-foreground">
          Every active collection published in the Space Call store.
        </p>

        {!collections || collections.length === 0 ? (
          <p className="py-16 text-muted-foreground">No collections published yet.</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                to="/collections/$handle"
                params={{ handle: collection.handle }}
                className="flex flex-col overflow-hidden rounded-lg border bg-card shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="aspect-4/3 bg-surface">
                  {collection.image && (
                    <img
                      src={collection.image.url}
                      alt={collection.image.altText ?? collection.title}
                      loading="lazy"
                      decoding="async"
                      width={480}
                      height={360}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="p-4">
                  <h2 className="truncate text-sm font-semibold">{collection.title}</h2>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
