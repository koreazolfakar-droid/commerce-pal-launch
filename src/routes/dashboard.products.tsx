import { createFileRoute } from "@tanstack/react-router";

import { ProductEditor } from "@/components/admin/ProductEditor";

export const Route = createFileRoute("/dashboard/products")({
  component: ProductsDashboardPage,
});

function ProductsDashboardPage() {
  return <ProductEditor />;
}
