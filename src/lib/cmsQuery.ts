import { queryOptions } from "@tanstack/react-query";
import { EMPTY_CMS } from "@/lib/cms";

/**
 * Compatibility query for storefront components that still accept optional CMS
 * overrides. The public store is Shopify-only, so this never performs a network
 * request and always resolves to the empty snapshot.
 */
export const cmsQueryOptions = () =>
  queryOptions({
    queryKey: ["storefront", "dashboard-disconnected"],
    queryFn: async () => EMPTY_CMS,
    initialData: EMPTY_CMS,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
  });
