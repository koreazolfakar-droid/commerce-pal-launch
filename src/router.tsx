import {
  QueryClient,
  dehydrate,
  hydrate,
  type DehydratedState,
} from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

type RouterJson =
  | string
  | number
  | boolean
  | null
  | RouterJson[]
  | { [key: string]: RouterJson };

function toRouterJson(value: unknown): RouterJson {
  return JSON.parse(JSON.stringify(value)) as RouterJson;
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Serialize only successful queries whose data is transport-safe.
    // Derived catalog queries contain Maps and Lucide components and are rebuilt
    // from serializable product data on the client instead of crossing SSR.
    dehydrate: () => ({
      queryClientState: toRouterJson(
        dehydrate(queryClient, {
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" &&
            query.meta?.["ssrSerializable"] !== false,
        }),
      ),
    }),
    hydrate: (dehydrated) => {
      hydrate(
        queryClient,
        dehydrated.queryClientState as unknown as DehydratedState,
      );
    },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
