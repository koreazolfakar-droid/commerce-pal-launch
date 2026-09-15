import { createFileRoute } from "@tanstack/react-router";

import { SettingsEditor } from "@/components/admin/SettingsEditor";

export const Route = createFileRoute("/dashboard/settings" as never)({
  component: DashboardSettings,
});

function DashboardSettings() {
  return <SettingsEditor />;
}
