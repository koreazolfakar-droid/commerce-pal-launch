import { readFile } from "node:fs/promises";

const shellFiles = [
  "../../src/dashboard/App.tsx",
  "../../src/dashboard/components/layout/DashboardSidebar.tsx",
  "../../src/dashboard/components/layout/DashboardHeader.tsx",
  "../../src/dashboard/components/layout/DashboardMobileNav.tsx",
  "../../src/dashboard/components/layout/DashboardRouteFallback.tsx",
];

/** Inspect every shell module after decomposition; do not couple tests to one giant App file. */
export async function readDashboardShellSource() {
  const sources = await Promise.all(
    shellFiles.map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );
  return sources.join("\n");
}
