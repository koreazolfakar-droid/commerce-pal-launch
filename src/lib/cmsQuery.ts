import { queryOptions } from "@tanstack/react-query";
import { EMPTY_CMS, fetchCmsSnapshot } from "@/lib/cms";

export const cmsQueryOptions = () =>
  queryOptions({
    queryKey: ["cms", "snapshot"],
    queryFn: fetchCmsSnapshot,
    // Show safe defaults while the live CMS request is in flight without writing
    // an empty snapshot into the query cache as if it were real persisted data.
    placeholderData: EMPTY_CMS,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: false,
  });
