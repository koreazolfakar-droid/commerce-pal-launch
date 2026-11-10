import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/InfoPage";
import { infoPageHead } from "@/lib/infoPages";
import { shopPoliciesQueryOptions } from "@/lib/queries";
export const Route = createFileRoute("/shipping")({
  loader: async ({ context }) => {
    return context.queryClient.ensureQueryData(shopPoliciesQueryOptions());
  },
  head: () => infoPageHead("shipping"),
  component: PolicyPage,
});

function PolicyPage() {
  const policies = Route.useLoaderData();
  return <InfoPage page="shipping" initialPolicies={policies} />;
}
