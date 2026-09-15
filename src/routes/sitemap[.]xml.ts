import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { storefrontApiRequest, type ShopifyCollection, type ShopifyProduct } from "@/lib/shopify";
import { COLLECTIONS_QUERY, PRODUCTS_QUERY } from "@/lib/shopifyDocuments";
import { absoluteUrl } from "@/lib/seo";
import { buildCatalogIndex, displayCollections } from "@/lib/taxonomy";

interface SitemapEntry {
  path: string;
  lastmod?: string | undefined;
}

const PAGE_SIZE = 100;
const MAX_PRODUCT_PAGES = 490;
const MAX_COLLECTION_PAGES = 100;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function fetchAllProductsForSitemap(): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  let after: string | null = null;

  for (let page = 0; page < MAX_PRODUCT_PAGES; page += 1) {
    const response = await storefrontApiRequest(PRODUCTS_QUERY, {
      first: PAGE_SIZE,
      after,
    });
    const connection = response?.data?.products;
    const edges = Array.isArray(connection?.edges) ? connection.edges : [];
    products.push(...edges);

    const nextCursor = connection?.pageInfo?.hasNextPage ? connection.pageInfo.endCursor : null;
    if (!nextCursor) break;
    after = nextCursor;
  }

  return products;
}

async function fetchAllCollectionsForSitemap(): Promise<ShopifyCollection[]> {
  const collections: ShopifyCollection[] = [];
  let after: string | null = null;

  for (let page = 0; page < MAX_COLLECTION_PAGES; page += 1) {
    const response = await storefrontApiRequest(COLLECTIONS_QUERY, {
      first: PAGE_SIZE,
      after,
    });
    const connection = response?.data?.collections;
    const edges = Array.isArray(connection?.edges) ? connection.edges : [];
    collections.push(...edges.map((edge: { node: ShopifyCollection }) => edge.node));

    const nextCursor = connection?.pageInfo?.hasNextPage ? connection.pageInfo.endCursor : null;
    if (!nextCursor) break;
    after = nextCursor;
  }

  return collections;
}

function isIndexableProduct(product: ShopifyProduct) {
  const title = product.node.title?.trim();
  const handle = product.node.handle?.trim();
  const price = Number(product.node.priceRange?.minVariantPrice?.amount);
  return Boolean(title && handle && Number.isFinite(price) && price > 0);
}

function productLastmod(product: ShopifyProduct) {
  const node = product.node as ShopifyProduct["node"] & { updatedAt?: string };
  return (node.updatedAt || node.createdAt)?.slice(0, 10);
}

function collectionLastmod(collection: ShopifyCollection) {
  return (collection as ShopifyCollection & { updatedAt?: string }).updatedAt?.slice(0, 10);
}

function latestLastmod(values: Array<string | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
}

function buildStaticEntries(): SitemapEntry[] {
  return [
    { path: "/" },
    { path: "/ar" },
    { path: "/shop" },
    { path: "/categories" },
    { path: "/brands" },
    { path: "/used-phones" },
    { path: "/collections" },
    ...[
      "help",
      "contact",
      "shipping",
      "returns",
      "warranty",
      "faq",
      "about",
      "privacy",
      "terms",
    ].map((path) => ({ path: `/${path}` })),
  ];
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [productsResult, collectionsResult] = await Promise.allSettled([
          fetchAllProductsForSitemap(),
          fetchAllCollectionsForSitemap(),
        ]);

        const products = productsResult.status === "fulfilled" ? productsResult.value : [];
        const collections = collectionsResult.status === "fulfilled" ? collectionsResult.value : [];
        const indexableProducts = products.filter(isIndexableProduct);

        let dynamicEntries: SitemapEntry[] = [];
        let catalogLastmod: string | undefined;
        let collectionsLastmod: string | undefined;

        try {
          const catalog = buildCatalogIndex(indexableProducts);
          const categoryLastmods = new Map<string, string>();
          const brandLastmods = new Map<string, string>();

          for (const product of indexableProducts) {
            const lastmod = productLastmod(product);
            if (!lastmod) continue;

            for (const categorySlug of catalog.categoryOf.get(product.node.handle) ?? []) {
              const current = categoryLastmods.get(categorySlug);
              if (!current || lastmod > current) categoryLastmods.set(categorySlug, lastmod);
            }

            const brandSlug = catalog.brandOf.get(product.node.handle)?.slug;
            if (brandSlug) {
              const current = brandLastmods.get(brandSlug);
              if (!current || lastmod > current) brandLastmods.set(brandSlug, lastmod);
            }
          }

          catalogLastmod = latestLastmod(indexableProducts.map(productLastmod));
          collectionsLastmod = latestLastmod(collections.map(collectionLastmod));

          dynamicEntries = [
            ...catalog.categories
              .filter((category) => category.count > 0)
              .map((category) => ({
                path: `/category/${encodeURIComponent(category.slug)}`,
                lastmod: categoryLastmods.get(category.slug),
              })),
            ...catalog.brands
              .filter((brand) => brand.count > 0)
              .map((brand) => ({
                path: `/brand/${encodeURIComponent(brand.slug)}`,
                lastmod: brandLastmods.get(brand.slug),
              })),
            ...displayCollections(collections).map((collection) => ({
              path: `/collections/${encodeURIComponent(collection.handle)}`,
              lastmod: collectionLastmod(collection),
            })),
            ...indexableProducts.map((product) => ({
              path: `/product/${encodeURIComponent(product.node.handle)}`,
              lastmod: productLastmod(product),
            })),
          ];
        } catch {
          dynamicEntries = [];
        }

        const staticEntries = buildStaticEntries().map((entry) => {
          if (catalogLastmod && ["/shop", "/categories", "/brands"].includes(entry.path)) {
            return { ...entry, lastmod: catalogLastmod };
          }
          if (collectionsLastmod && entry.path === "/collections") {
            return { ...entry, lastmod: collectionsLastmod };
          }
          return entry;
        });

        const entries: SitemapEntry[] = [...staticEntries, ...dynamicEntries];
        const seen = new Set<string>();
        const urls = entries
          .filter((entry) => !seen.has(entry.path) && seen.add(entry.path))
          .map((entry) =>
            [
              "  <url>",
              `    <loc>${escapeXml(absoluteUrl(entry.path))}</loc>`,
              entry.lastmod ? `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : null,
              "  </url>",
            ]
              .filter(Boolean)
              .join("\n"),
          );

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls,
          "</urlset>",
        ].join("\n");

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
            "X-Robots-Tag": "noindex, follow",
          },
        });
      },
    },
  },
});
