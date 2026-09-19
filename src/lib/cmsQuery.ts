import { queryOptions } from "@tanstack/react-query";
import { EMPTY_CMS, fetchCmsSnapshot } from "@/lib/cms";

export const cmsQueryOptions = () =>
  queryOptions({
    queryKey: ["storefront", "public-cms"],
    queryFn: fetchCmsSnapshot,
    placeholderData: EMPTY_CMS,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    // Revalidate only when the cached CMS snapshot is stale; avoid a duplicate request on every mount.
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  });
