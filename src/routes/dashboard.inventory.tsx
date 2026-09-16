import { createFileRoute } from "@tanstack/react-router";

import { InventoryEditor } from "@/components/admin/InventoryEditor";

export const Route = createFileRoute("/dashboard/inventory")({
  component: InventoryDashboardPage,
});

function InventoryDashboardPage() {
  return <InventoryEditor />;
}
