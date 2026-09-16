import { Outlet, createFileRoute } from "@tanstack/react-router";

import { DashboardShell } from "@/components/admin/DashboardShell";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "لوحة تحكم Space Call" },
      { name: "description", content: "لوحة تحكم داخلية لإدارة محتوى متجر Space Call." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}
