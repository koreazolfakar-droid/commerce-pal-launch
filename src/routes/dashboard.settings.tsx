import { createFileRoute } from "@tanstack/react-router";

import { SettingsWorkspace } from "@/components/admin/SettingsWorkspace";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return <SettingsWorkspace />;
}
