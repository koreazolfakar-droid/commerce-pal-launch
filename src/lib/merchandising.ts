import {
  fetchCollectionByHandle,
  fetchCollections,
} from "@/lib/storefrontFacade";

export interface ShowcaseCollection {
  handle: string;
  title: string;
  description: string;
  image: { url: string; altText: string | null } | null;
  productCount: number;
}

export async function fetchShowcaseCollections(): Promise<ShowcaseCollection[]> {
  try {
    const collections = (await fetchCollections(100)).filter((collection) =>
      collection.handle.startsWith("showcase-"),
    );

    return Promise.all(
      collections.map(async (collection) => {
        const detail = await fetchCollectionByHandle(collection.handle, 100);
        return {
          ...collection,
          productCount: detail?.products.length ?? 0,
        };
      }),
    );
  } catch {
    // Optional merchandising must never prevent the catalogue from rendering.
    return [];
  }
}
