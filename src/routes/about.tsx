import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/InfoPage";
import { infoPageHead } from "@/lib/infoPages";
import { shopPoliciesQueryOptions } from "@/lib/queries";
export const Route = createFileRoute("/about")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(shopPoliciesQueryOptions());
  },
  head: () => infoPageHead("about"),
  component: () => <InfoPage page="about" />,
});
