import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/InfoPage";
import { infoPageHead } from "@/lib/infoPages";
import { shopPoliciesQueryOptions } from "@/lib/queries";
export const Route = createFileRoute("/privacy")({
  loader: async ({ context }) => {
    return context.queryClient.ensureQueryData(shopPoliciesQueryOptions());
  },
  head: () => infoPageHead("privacy"),
  component: PolicyPage,
});

function PolicyPage() {
  const policies = Route.useLoaderData();
  return <InfoPage page="privacy" initialPolicies={policies} />;
}
