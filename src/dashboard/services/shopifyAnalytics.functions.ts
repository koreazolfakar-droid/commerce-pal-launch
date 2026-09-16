import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ShopifyAnalyticsSnapshot } from "@/dashboard/types/shopifyAnalytics";

const analyticsInput = z.object({
  accessToken: z.string().min(20),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const shopifyAdminAnalyticsFn = createServerFn({ method: "POST" })
  .validator(analyticsInput)
  .handler(async ({ data }): Promise<ShopifyAnalyticsSnapshot> => {
    const [{ requireDashboardStaff }, { loadShopifyAdminAnalytics }] = await Promise.all([
      import("@/dashboard/services/dashboardStaffAuth.server"),
      import("@/dashboard/services/shopifyAdminRead.server"),
    ]);

    await requireDashboardStaff(data.accessToken);
    return loadShopifyAdminAnalytics({ start: data.start, end: data.end });
  });

/**
 * Browser-safe entry point. The only credential sent from the browser is the
 * caller's short-lived Supabase session token, which is re-validated server-side.
 */
export async function getShopifyAdminAnalytics(input: {
  accessToken: string;
  start: string;
  end: string;
}) {
  return shopifyAdminAnalyticsFn({ data: input });
}
