import { Outlet, createFileRoute } from "@tanstack/react-router";

import { DashboardShell } from "@/components/admin/DashboardShell";
import { DashboardLanguageProvider } from "@/lib/dashboardI18n";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Space Call Dashboard" },
      {
        name: "description",
        content: "Private Space Call dashboard for store and content management.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <DashboardLanguageProvider>
      <DashboardShell>
        <Outlet />
      </DashboardShell>
    </DashboardLanguageProvider>
  );
}
