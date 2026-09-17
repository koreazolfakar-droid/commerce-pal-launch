import {
  adminJson,
  adminPreflight,
  authorizeAdminRequest,
  shopifyAdminRequest,
} from "@/lib/adminApi";
import { createFileRoute } from "@tanstack/react-router";

const ADMIN_ORDERS_QUERY = `#graphql
  query AdminOrders($first: Int!, $after: String) {
    orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        name
        createdAt
        cancelledAt
        displayFinancialStatus
        displayFulfillmentStatus
        phone
        paymentGatewayNames
        currentSubtotalLineItemsQuantity
        tags
        customer {
          displayName
          defaultPhoneNumber {
            phoneNumber
          }
        }
        currentTotalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

type AdminOrdersData = {
  orders: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: Array<{
      id: string;
      name: string;
      createdAt: string;
      cancelledAt: string | null;
      displayFinancialStatus: string | null;
      displayFulfillmentStatus: string;
      phone: string | null;
      paymentGatewayNames: string[];
      currentSubtotalLineItemsQuantity: number;
      tags: string[];
      customer: {
        displayName: string;
        defaultPhoneNumber: { phoneNumber: string } | null;
      } | null;
      currentTotalPriceSet: {
        shopMoney: { amount: string; currencyCode: string };
      };
    }>;
  };
};

type DashboardOrderStatus = "NEW" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";

function dashboardStatus(order: AdminOrdersData["orders"]["nodes"][number]): DashboardOrderStatus {
  if (order.cancelledAt) return "CANCELLED";

  const tags = order.tags.map((tag) => tag.trim().toLowerCase());
  if (tags.some((tag) => tag === "ready" || tag === "ready-for-delivery" || tag === "جاهز")) return "READY";

  if (order.displayFulfillmentStatus === "FULFILLED") return "DELIVERED";
  if (["PARTIALLY_FULFILLED", "IN_PROGRESS", "PENDING_FULFILLMENT"].includes(order.displayFulfillmentStatus)) {
    return "PREPARING";
  }

  if (["PAID", "PARTIALLY_PAID"].includes(order.displayFinancialStatus || "")) return "CONFIRMED";
  return "NEW";
}

export const Route = createFileRoute("/api/admin/orders")({
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
          const data = await shopifyAdminRequest<AdminOrdersData>(ADMIN_ORDERS_QUERY, { first, after });

          const orders = data.orders.nodes.map((order) => ({
            id: order.id,
            name: order.name,
            customer: order.customer?.displayName || "Guest",
            phone: order.phone || order.customer?.defaultPhoneNumber?.phoneNumber || "—",
            total: Number(order.currentTotalPriceSet.shopMoney.amount),
            currencyCode: order.currentTotalPriceSet.shopMoney.currencyCode,
            payment: order.paymentGatewayNames[0] || order.displayFinancialStatus || "—",
            status: dashboardStatus(order),
            financialStatus: order.displayFinancialStatus,
            fulfillmentStatus: order.displayFulfillmentStatus,
            createdAt: order.createdAt,
            items: order.currentSubtotalLineItemsQuantity,
          }));

          return adminJson(request, {
            ok: true,
            orders,
            pageInfo: data.orders.pageInfo,
          });
        } catch (error) {
          console.error("Admin orders API failed", error);
          return adminJson(
            request,
            { error: error instanceof Error ? error.message : "Unable to load orders" },
            502,
          );
        }
      },
    },
  },
});
