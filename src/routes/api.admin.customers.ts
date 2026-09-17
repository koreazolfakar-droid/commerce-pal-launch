import {
  adminJson,
  adminPreflight,
  authorizeAdminRequest,
  shopifyAdminRequest,
} from "@/lib/adminApi";
import { createFileRoute } from "@tanstack/react-router";

const ADMIN_CUSTOMERS_QUERY = `#graphql
  query AdminCustomers($first: Int!, $after: String) {
    customers(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        displayName
        createdAt
        updatedAt
        numberOfOrders
        defaultPhoneNumber {
          phoneNumber
        }
        amountSpent {
          amount
          currencyCode
        }
        lastOrder {
          createdAt
        }
      }
    }
  }
`;

type AdminCustomersData = {
  customers: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: Array<{
      id: string;
      displayName: string;
      createdAt: string;
      updatedAt: string;
      numberOfOrders: number | string;
      defaultPhoneNumber: { phoneNumber: string } | null;
      amountSpent: { amount: string; currencyCode: string };
      lastOrder: { createdAt: string } | null;
    }>;
  };
};

type CustomerSegment = "VIP" | "RETURNING" | "NEW";

function customerSegment(orders: number, totalSpent: number): CustomerSegment {
  if (orders >= 5 || totalSpent >= 2000) return "VIP";
  if (orders >= 2) return "RETURNING";
  return "NEW";
}

export const Route = createFileRoute("/api/admin/customers")({
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
          const data = await shopifyAdminRequest<AdminCustomersData>(ADMIN_CUSTOMERS_QUERY, { first, after });

          const customers = data.customers.nodes.map((customer) => {
            const orders = Number(customer.numberOfOrders || 0);
            const totalSpent = Number(customer.amountSpent.amount || 0);
            return {
              id: customer.id,
              name: customer.displayName,
              phone: customer.defaultPhoneNumber?.phoneNumber || "—",
              orders,
              totalSpent,
              currencyCode: customer.amountSpent.currencyCode,
              segment: customerSegment(orders, totalSpent),
              lastOrder: customer.lastOrder?.createdAt || customer.createdAt,
              updatedAt: customer.updatedAt,
            };
          });

          return adminJson(request, {
            ok: true,
            customers,
            pageInfo: data.customers.pageInfo,
          });
        } catch (error) {
          console.error("Admin customers API failed", error);
          return adminJson(
            request,
            { error: error instanceof Error ? error.message : "Unable to load customers" },
            502,
          );
        }
      },
    },
  },
});
