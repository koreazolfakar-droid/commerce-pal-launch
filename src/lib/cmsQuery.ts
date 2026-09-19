import { queryOptions } from "@tanstack/react-query";
import { EMPTY_CMS, fetchCmsSnapshot } from "@/lib/cms";

export const cmsQueryOptions = () =>
  queryOptions({
    queryKey: ["storefront", "public-cms"],
    queryFn: fetchCmsSnapshot,
    placeholderData: EMPTY_CMS,
    staleTime: 5_000,
    gcTime: 5 * 60_000,
    // Revalidate after hydration so a transient SSR CMS miss can never pin an old hero.
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  });
