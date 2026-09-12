import {
  adminJson,
  adminPreflight,
  authorizeAdminRequest,
  shopifyAdminRequest,
} from "@/lib/adminApi";
import { createFileRoute } from "@tanstack/react-router";

const ADMIN_PRODUCTS_QUERY = `#graphql
  query AdminProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        handle
        status
        vendor
        productType
        updatedAt
        totalInventory
        variants(first: 20) {
          nodes {
            id
            title
            sku
            barcode
            price
            inventoryQuantity
          }
        }
      }
    }
  }
`;

type AdminProductsData = {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: Array<{
      id: string;
      title: string;
      handle: string;
      status: string;
      vendor: string;
      productType: string;
      updatedAt: string;
      totalInventory: number | null;
      variants: {
        nodes: Array<{
          id: string;
          title: string;
          sku: string | null;
          barcode: string | null;
          price: string;
          inventoryQuantity: number | null;
        }>;
      };
    }>;
  };
};

export const Route = createFileRoute("/api/admin/products")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => adminPreflight(request),
      GET: async ({ request }) => {
        const unauthorized = authorizeAdminRequest(request);
        if (unauthorized) return unauthorized;

        try {
          const url = new URL(request.url);
          const requestedFirst = Number(url.searchParams.get("first") || 50);
          const first = Math.min(Math.max(Number.isFinite(requestedFirst) ? requestedFirst : 50, 1), 100);
          const after = url.searchParams.get("after") || null;
          const data = await shopifyAdminRequest<AdminProductsData>(ADMIN_PRODUCTS_QUERY, {
            first,
            after,
          });

          const products = data.products.nodes.map((product) => {
            const prices = product.variants.nodes
              .map((variant) => Number(variant.price))
              .filter(Number.isFinite);
            return {
              ...product,
              minPrice: prices.length ? Math.min(...prices) : null,
              maxPrice: prices.length ? Math.max(...prices) : null,
              variantsCount: product.variants.nodes.length,
            };
          });

          return adminJson(request, {
            ok: true,
            products,
            pageInfo: data.products.pageInfo,
          });
        } catch (error) {
          console.error("Admin products API failed", error);
          return adminJson(
            request,
            { error: error instanceof Error ? error.message : "Unable to load products" },
            502,
          );
        }
      },
    },
  },
});
