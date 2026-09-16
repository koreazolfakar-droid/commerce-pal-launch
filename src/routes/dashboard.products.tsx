import { createFileRoute } from "@tanstack/react-router";

import { NativeCatalogManager } from "@/components/admin/NativeCatalogManager";

export const Route = createFileRoute("/dashboard/products")({
  component: ProductsDashboardPage,
});

function ProductsDashboardPage() {
  return <NativeCatalogManager />;
}
