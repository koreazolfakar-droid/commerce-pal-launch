import { createFileRoute } from "@tanstack/react-router";

import { TablerDashboardOverview } from "@/dashboard/components/TablerDashboardOverview";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardPage,
});

function DashboardPage() {
  return <TablerDashboardOverview />;
}
