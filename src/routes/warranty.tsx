import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/InfoPage";
import { infoPageHead } from "@/lib/infoPages";
import { shopPoliciesQueryOptions } from "@/lib/queries";
export const Route = createFileRoute("/warranty")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(shopPoliciesQueryOptions());
  },
  head: () => infoPageHead("warranty"),
  component: () => <InfoPage page="warranty" />,
});
