import { queryOptions } from "@tanstack/react-query";
import { EMPTY_CMS, fetchCmsSnapshot } from "@/lib/cms";

export const cmsQueryOptions = () =>
  queryOptions({
    queryKey: ["cms", "snapshot"],
    queryFn: fetchCmsSnapshot,
    initialData: EMPTY_CMS,
    initialDataUpdatedAt: 0,
    staleTime: 60_000,
    refetchOnMount: true,
    retry: false,
  });
