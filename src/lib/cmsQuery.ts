import { queryOptions } from "@tanstack/react-query";
import { fetchCmsSnapshot } from "@/lib/cms";

export const cmsQueryOptions = () =>
  queryOptions({
    queryKey: ["cms", "snapshot"],
    queryFn: fetchCmsSnapshot,
    staleTime: 30_000,
    retry: false,
  });
