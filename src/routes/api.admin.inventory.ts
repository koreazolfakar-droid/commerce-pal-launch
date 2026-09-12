import {
  adminJson,
  adminPreflight,
  authorizeAdminRequest,
  shopifyAdminRequest,
} from "@/lib/adminApi";
import { createFileRoute } from "@tanstack/react-router";

const INVENTORY_LOCATIONS_QUERY = `#graphql
  query AdminInventoryLocations {
    locations(first: 50) {
      nodes {
        id
        name
        isActive
      }
    }
  }
`;

const INVENTORY_VARIANT_QUERY = `#graphql
  query AdminInventoryVariant($id: ID!) {
    node(id: $id) {
      ... on ProductVariant {
        id
        title
        product {
          id
          title
        }
        inventoryItem {
          id
          tracked
        }
      }
    }
  }
`;

const INVENTORY_ADJUST_MUTATION = `#graphql
  mutation AdminInventoryAdjust(
    $input: InventoryAdjustQuantitiesInput!
    $idempotencyKey: String!
  ) {
    inventoryAdjustQuantities(input: $input) @idempotent(key: $idempotencyKey) {
      inventoryAdjustmentGroup {
        createdAt
        reason
        referenceDocumentUri
        changes {
          name
          delta
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

type LocationsData = {
  locations: {
    nodes: Array<{ id: string; name: string; isActive: boolean }>;
  };
};

type VariantData = {
  node: null | {
    id: string;
    title: string;
    product: { id: string; title: string };
    inventoryItem: { id: string; tracked: boolean } | null;
  };
};

type AdjustmentData = {
  inventoryAdjustQuantities: {
    inventoryAdjustmentGroup: null | {
      createdAt: string;
      reason: string;
      referenceDocumentUri: string | null;
      changes: Array<{ name: string; delta: number }>;
    };
    userErrors: Array<{ field?: string[] | null; message: string }>;
  };
};

type ReceiveBody = {
  variantId?: unknown;
  locationId?: unknown;
  quantity?: unknown;
  reference?: unknown;
};

function userErrorMessage(errors: AdjustmentData["inventoryAdjustQuantities"]["userErrors"]) {
  return errors
    .map((error) => `${error.field?.length ? `${error.field.join(".")}: ` : ""}${error.message}`)
    .join(", ");
}

export const Route = createFileRoute("/api/admin/inventory")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => adminPreflight(request),
      GET: async ({ request }) => {
        const unauthorized = authorizeAdminRequest(request);
        if (unauthorized) return unauthorized;

        try {
          const data = await shopifyAdminRequest<LocationsData>(INVENTORY_LOCATIONS_QUERY);
          return adminJson(request, {
            ok: true,
            locations: data.locations.nodes.filter((location) => location.isActive),
          });
        } catch (error) {
          console.error("Admin inventory locations failed", error);
          return adminJson(
            request,
            { error: error instanceof Error ? error.message : "Unable to load inventory locations" },
            502,
          );
        }
      },
      POST: async ({ request }) => {
        const unauthorized = authorizeAdminRequest(request);
        if (unauthorized) return unauthorized;

        try {
          if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
            return adminJson(request, { error: "Content-Type must be application/json" }, 400);
          }

          const body = (await request.json()) as ReceiveBody;
          const variantId = typeof body.variantId === "string" ? body.variantId.trim() : "";
          const locationId = typeof body.locationId === "string" ? body.locationId.trim() : "";
          const quantity = Number(body.quantity);
          const reference = typeof body.reference === "string" ? body.reference.trim() : "";

          if (!variantId || !locationId) {
            return adminJson(request, { error: "Variant and location are required" }, 400);
          }
          if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100000) {
            return adminJson(request, { error: "Quantity must be an integer between 1 and 100000" }, 400);
          }

          const variantData = await shopifyAdminRequest<VariantData>(INVENTORY_VARIANT_QUERY, { id: variantId });
          const variant = variantData.node;
          if (!variant?.inventoryItem) {
            return adminJson(request, { error: "Inventory item was not found for this variant" }, 404);
          }
          if (!variant.inventoryItem.tracked) {
            return adminJson(request, { error: "Inventory tracking is disabled for this variant in Shopify" }, 422);
          }

          const idempotencyKey = crypto.randomUUID();
          const referenceSlug = encodeURIComponent(reference || idempotencyKey);
          const referenceDocumentUri = `spacecall://inventory/receiving/${referenceSlug}`;
          const result = await shopifyAdminRequest<AdjustmentData>(INVENTORY_ADJUST_MUTATION, {
            idempotencyKey,
            input: {
              reason: "correction",
              name: "available",
              referenceDocumentUri,
              changes: [
                {
                  delta: quantity,
                  inventoryItemId: variant.inventoryItem.id,
                  locationId,
                },
              ],
            },
          });

          const payload = result.inventoryAdjustQuantities;
          if (payload.userErrors.length) {
            return adminJson(request, { error: userErrorMessage(payload.userErrors) }, 422);
          }
          if (!payload.inventoryAdjustmentGroup) {
            return adminJson(request, { error: "Shopify did not return an inventory adjustment" }, 502);
          }

          return adminJson(request, {
            ok: true,
            receipt: {
              product: variant.product.title,
              variant: variant.title,
              quantity,
              locationId,
              reference: reference || null,
              createdAt: payload.inventoryAdjustmentGroup.createdAt,
              referenceDocumentUri: payload.inventoryAdjustmentGroup.referenceDocumentUri,
            },
          }, 201);
        } catch (error) {
          console.error("Admin inventory receive failed", error);
          return adminJson(
            request,
            { error: error instanceof Error ? error.message : "Unable to receive inventory" },
            502,
          );
        }
      },
    },
  },
});