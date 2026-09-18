import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";

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
    // Preload route chunks/data only when the user signals navigation intent
    // (hover/focus/touch). This keeps initial loading lean while making the next
    // page feel immediate once a user starts interacting with a link.
    defaultPreload: "intent",
    // Avoid re-running the same route preload immediately when a user taps a link
    // right after hover/touch intent. Product/query freshness is still governed by
    // React Query's shorter data stale times.
    defaultPreloadStaleTime: 30_000,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
    // CatalogIndex intentionally contains runtime-only Maps and React icon
    // components. Queries marked meta.ssr=false stay out of the hydration payload.
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        query.meta?.ssr !== false && query.meta?.ssrSerializable !== false,
    },
    // RootComponent already owns QueryClientProvider.
    wrapQueryClient: false,
  });

  return router;
};
