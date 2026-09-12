import {
  adminJson,
  adminPreflight,
  authorizeAdminRequest,
  shopifyAdminRequest,
} from "@/lib/adminApi";
import { createFileRoute } from "@tanstack/react-router";

const PRODUCT_FIELDS = `
  id
  title
  handle
  status
  vendor
  productType
  descriptionHtml
  tags
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
`;

const ADMIN_PRODUCTS_QUERY = `#graphql
  query AdminProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ${PRODUCT_FIELDS}
      }
    }
  }
`;

const ADMIN_PRODUCT_CREATE = `#graphql
  mutation AdminProductCreate($product: ProductCreateInput!) {
    productCreate(product: $product) {
      product {
        ${PRODUCT_FIELDS}
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const ADMIN_PRODUCT_UPDATE = `#graphql
  mutation AdminProductUpdate($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product {
        ${PRODUCT_FIELDS}
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const ADMIN_VARIANT_UPDATE = `#graphql
  mutation AdminVariantUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      product {
        ${PRODUCT_FIELDS}
      }
      userErrors {
        field
        message
      }
    }
  }
`;

type ShopifyVariant = {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: string;
  inventoryQuantity: number | null;
};

type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  productType: string;
  descriptionHtml: string;
  tags: string[];
  updatedAt: string;
  totalInventory: number | null;
  variants: { nodes: ShopifyVariant[] };
};

type UserError = {
  field?: string[] | null;
  message: string;
};

type AdminProductsData = {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: ShopifyProduct[];
  };
};

type ProductMutationData = {
  productCreate: {
    product: ShopifyProduct | null;
    userErrors: UserError[];
  };
};

type ProductUpdateMutationData = {
  productUpdate: {
    product: ShopifyProduct | null;
    userErrors: UserError[];
  };
};

type VariantMutationData = {
  productVariantsBulkUpdate: {
    product: ShopifyProduct | null;
    userErrors: UserError[];
  };
};

type ProductWriteBody = {
  id?: unknown;
  variantId?: unknown;
  title?: unknown;
  vendor?: unknown;
  productType?: unknown;
  status?: unknown;
  descriptionHtml?: unknown;
  tags?: unknown;
  price?: unknown;
  sku?: unknown;
  barcode?: unknown;
};

const PRODUCT_STATUSES = new Set(["ACTIVE", "DRAFT", "ARCHIVED"]);

function normalizeProduct(product: ShopifyProduct) {
  const prices = product.variants.nodes
    .map((variant) => Number(variant.price))
    .filter(Number.isFinite);
  return {
    ...product,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    variantsCount: product.variants.nodes.length,
  };
}

function mutationError(errors: UserError[]) {
  if (!errors.length) return "Shopify rejected the product change";
  return errors
    .map((error) => `${error.field?.length ? `${error.field.join(".")}: ` : ""}${error.message}`)
    .join(", ");
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function normalizedTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  }
  return undefined;
}

function productInput(body: ProductWriteBody, includeId = false) {
  const input: Record<string, unknown> = {};
  if (includeId && typeof body.id === "string") input.id = body.id;
  if (typeof body.title === "string") input.title = body.title.trim();
  if (typeof body.vendor === "string") input.vendor = body.vendor.trim();
  if (typeof body.productType === "string") input.productType = body.productType.trim();
  if (typeof body.descriptionHtml === "string") input.descriptionHtml = body.descriptionHtml;
  if (typeof body.status === "string" && PRODUCT_STATUSES.has(body.status)) input.status = body.status;
  const tags = normalizedTags(body.tags);
  if (tags) input.tags = tags;
  return input;
}

async function updatePrimaryVariant(product: ShopifyProduct, body: ProductWriteBody) {
  const variantId =
    optionalString(body.variantId) || product.variants.nodes[0]?.id || "";
  if (!variantId) return product;

  const variant: Record<string, unknown> = { id: variantId };
  let changed = false;

  if (body.price !== undefined && body.price !== null && body.price !== "") {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) throw new Error("Price must be a valid positive number");
    variant.price = price;
    changed = true;
  }
  if (typeof body.sku === "string") {
    variant.inventoryItem = { sku: body.sku.trim() };
    changed = true;
  }
  if (typeof body.barcode === "string") {
    variant.barcode = body.barcode.trim();
    changed = true;
  }

  if (!changed) return product;

  const result = await shopifyAdminRequest<VariantMutationData>(ADMIN_VARIANT_UPDATE, {
    productId: product.id,
    variants: [variant],
  });
  if (result.productVariantsBulkUpdate.userErrors.length) {
    throw new Error(mutationError(result.productVariantsBulkUpdate.userErrors));
  }
  return result.productVariantsBulkUpdate.product || product;
}

async function readBody(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }
  const body = (await request.json()) as ProductWriteBody;
  if (!body || typeof body !== "object") throw new Error("Invalid request body");
  return body;
}

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

          return adminJson(request, {
            ok: true,
            products: data.products.nodes.map(normalizeProduct),
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
      POST: async ({ request }) => {
        const unauthorized = authorizeAdminRequest(request);
        if (unauthorized) return unauthorized;

        try {
          const body = await readBody(request);
          const title = optionalString(body.title);
          if (!title) return adminJson(request, { error: "Product title is required" }, 400);

          const result = await shopifyAdminRequest<ProductMutationData>(ADMIN_PRODUCT_CREATE, {
            product: productInput(body),
          });
          if (result.productCreate.userErrors.length) {
            return adminJson(request, { error: mutationError(result.productCreate.userErrors) }, 422);
          }
          if (!result.productCreate.product) {
            return adminJson(request, { error: "Shopify did not return the created product" }, 502);
          }

          const product = await updatePrimaryVariant(result.productCreate.product, body);
          return adminJson(request, { ok: true, product: normalizeProduct(product) }, 201);
        } catch (error) {
          console.error("Admin product create failed", error);
          const message = error instanceof Error ? error.message : "Unable to create product";
          const status = message.startsWith("Content-Type") || message.startsWith("Invalid") || message.startsWith("Price") ? 400 : 502;
          return adminJson(request, { error: message }, status);
        }
      },
      PATCH: async ({ request }) => {
        const unauthorized = authorizeAdminRequest(request);
        if (unauthorized) return unauthorized;

        try {
          const body = await readBody(request);
          const id = optionalString(body.id);
          if (!id) return adminJson(request, { error: "Product id is required" }, 400);
          if (typeof body.status === "string" && !PRODUCT_STATUSES.has(body.status)) {
            return adminJson(request, { error: "Invalid product status" }, 400);
          }

          const result = await shopifyAdminRequest<ProductUpdateMutationData>(ADMIN_PRODUCT_UPDATE, {
            product: productInput(body, true),
          });
          if (result.productUpdate.userErrors.length) {
            return adminJson(request, { error: mutationError(result.productUpdate.userErrors) }, 422);
          }
          if (!result.productUpdate.product) {
            return adminJson(request, { error: "Shopify did not return the updated product" }, 502);
          }

          const product = await updatePrimaryVariant(result.productUpdate.product, body);
          return adminJson(request, { ok: true, product: normalizeProduct(product) });
        } catch (error) {
          console.error("Admin product update failed", error);
          const message = error instanceof Error ? error.message : "Unable to update product";
          const status = message.startsWith("Content-Type") || message.startsWith("Invalid") || message.startsWith("Price") ? 400 : 502;
          return adminJson(request, { error: message }, status);
        }
      },
    },
  },
});