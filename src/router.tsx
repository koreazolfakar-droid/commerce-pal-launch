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
    // Only resolved Query data crosses the SSR boundary. The QueryClient instance
    // itself contains Symbols and other runtime-only values that Seroval cannot
    // serialize, so normalize the dehydrated cache to plain JSON first.
    dehydrate: () => ({
      queryClientState: toRouterJson(
        dehydrate(queryClient, {
          shouldDehydrateQuery: (query) => query.state.status === "success",
        }),
      ),
    }),
    hydrate: (dehydrated) => {
      hydrate(
        queryClient,
        dehydrated.queryClientState as unknown as DehydratedState,
      );
    },
    // Preload route chunks/data only when the user signals navigation intent
    // (hover/focus/touch). This keeps initial loading lean while making the next
    // page feel immediate once a user starts interacting with a link.
    defaultPreload: "intent",
    // Avoid re-running the same route preload immediately when a user taps a link
    // right after hover/touch intent. Product/query freshness is still governed by
    // React Query's shorter data stale times.
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
