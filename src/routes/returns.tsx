import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/InfoPage";
import { infoPageHead } from "@/lib/infoPages";
import { shopPoliciesQueryOptions } from "@/lib/queries";
export const Route = createFileRoute("/returns")({
  loader: async ({ context }) => {
    return context.queryClient.ensureQueryData(shopPoliciesQueryOptions());
  },
  head: () => infoPageHead("returns"),
  component: PolicyPage,
});

function PolicyPage() {
  const policies = Route.useLoaderData();
  return <InfoPage page="returns" initialPolicies={policies} />;
}
