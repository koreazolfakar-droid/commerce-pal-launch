import { createFileRoute } from "@tanstack/react-router";

import { SettingsEditor } from "@/components/admin/SettingsEditor";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return <SettingsEditor />;
}
