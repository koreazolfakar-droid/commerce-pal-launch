import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchCollections } from "@/lib/shopify";

export const Route = createFileRoute("/collections/")({
  head: () => ({
    meta: [
      { title: "All Collections — Space Cell" },
      {
        name: "description",
        content:
          "Browse every Space Cell collection: smartphones, tablets, audio, chargers, cases and more.",
      },
      { property: "og:title", content: "All Collections — Space Cell" },
      {
        property: "og:description",
        content: "Browse every Space Cell collection across phones, tablets, audio and accessories.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CollectionsIndex,
});

function CollectionsIndex() {
  const { data: collections, isLoading } = useQuery({
    queryKey: ["shopify-collections"],
    queryFn: () => fetchCollections(50),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">All collections</h1>
        <p className="mt-2 text-muted-foreground">
          Every collection published in the store, straight from Shopify.
        </p>

        {isLoading ? (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="h-40 animate-pulse rounded-lg bg-surface" />
            ))}
          </div>
        ) : !collections || collections.length === 0 ? (
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
    </div>
  );
}
