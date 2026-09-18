import { fetchCollectionByHandle, fetchCollections } from "@/lib/storefrontData";

export interface ShowcaseCollection {
  handle: string;
  title: string;
  description: string;
  image: { url: string; altText: string | null } | null;
  productCount: number;
}

/** Dashboard-managed Supabase collections are the merchandising source of truth. */
export async function fetchShowcaseCollections(): Promise<ShowcaseCollection[]> {
  const collections = (await fetchCollections(500)).filter((collection) =>
    collection.handle.startsWith("showcase-"),
  );
  const withCounts = await Promise.all(
    collections.map(async (collection) => {
      const detail = await fetchCollectionByHandle(collection.handle, 500);
      return {
        ...collection,
        productCount: detail?.products.length ?? 0,
      };
    }),
  );
  return withCounts;
}
