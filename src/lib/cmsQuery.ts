import { queryOptions } from "@tanstack/react-query";
import { EMPTY_CMS, fetchCmsSnapshot } from "@/lib/cms";

export const cmsQueryOptions = () =>
  queryOptions({
    queryKey: ["storefront", "public-cms"],
    queryFn: fetchCmsSnapshot,
    placeholderData: EMPTY_CMS,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    // Keep a short in-memory freshness window while ensuring dashboard edits appear quickly.
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  });
