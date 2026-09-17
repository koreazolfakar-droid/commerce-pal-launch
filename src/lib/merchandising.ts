import { storefrontApiRequest } from "@/lib/shopify";
import { SHOWCASE_COLLECTIONS_QUERY } from "@/lib/storefrontDocuments";

export interface ShowcaseCollection {
  handle: string;
  title: string;
  description: string;
  image: { url: string; altText: string | null } | null;
  productCount: number;
}
interface ShowcaseNode extends Omit<ShowcaseCollection, "productCount"> {
  sortOrder?: { value: string } | null;
  products?: { nodes: Array<{ id: string }> };
}
interface ShowcaseResponse {
  data?: {
    collections: {
      nodes: ShowcaseNode[];
    };
  };
}

export async function fetchShowcaseCollections(): Promise<ShowcaseCollection[]> {
  try {
    const response = (await storefrontApiRequest(
      SHOWCASE_COLLECTIONS_QUERY,
    )) as ShowcaseResponse;
    const nodes = (response.data?.collections.nodes ?? []).filter((collection) =>
      collection.handle.startsWith("showcase-"),
    );
    const order = (collection: ShowcaseNode) => {
      const raw = collection.sortOrder?.value.trim();
      const value = raw ? Number(raw) : Number.NaN;
      return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
    };
    nodes.sort(
      (a, b) =>
        order(a) - order(b) ||
        a.title.localeCompare(b.title, "en", { numeric: true }) ||
        a.handle.localeCompare(b.handle),
    );
    return nodes.map(({ sortOrder: _sortOrder, products, ...collection }) => ({
      ...collection,
      productCount: products?.nodes.length ?? 0,
    }));
  } catch {
    // This optional merchandising layer must not prevent the catalogue from rendering.
    return [];
  }
}
