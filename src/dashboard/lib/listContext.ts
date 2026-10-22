const lists = new Map<string, string>();

/** Per-tab memory only: never persists customer names or search terms to disk. */
export function rememberDashboardList(path: string, search: string) {
  if (!path.startsWith("/dashboard/")) return;
  const query = new URLSearchParams(search).toString();
  lists.set(path, `${path}${query ? `?${query}` : ""}`);
}
export function dashboardListHref(path: string) {
  return lists.get(path) ?? path;
}
