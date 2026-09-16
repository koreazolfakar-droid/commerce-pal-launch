import { createFileRoute } from "@tanstack/react-router";

import { OrdersEditor } from "@/components/admin/OrdersEditor";

export const Route = createFileRoute("/dashboard/orders")({
  component: OrdersDashboardPage,
});

function OrdersDashboardPage() {
  return <OrdersEditor />;
}
