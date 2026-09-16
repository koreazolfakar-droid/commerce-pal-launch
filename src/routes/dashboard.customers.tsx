import { createFileRoute } from "@tanstack/react-router";

import { CustomersEditor } from "@/components/admin/CustomersEditor";

export const Route = createFileRoute("/dashboard/customers")({
  component: CustomersDashboardPage,
});

function CustomersDashboardPage() {
  return <CustomersEditor />;
}
