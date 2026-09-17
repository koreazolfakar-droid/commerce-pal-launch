import { createFileRoute } from "@tanstack/react-router";

import { CatalogWorkspace } from "@/components/admin/CatalogWorkspace";

export const Route = createFileRoute("/dashboard/products")({
  component: ProductsDashboardPage,
});

function ProductsDashboardPage() {
  return <CatalogWorkspace />;
}
