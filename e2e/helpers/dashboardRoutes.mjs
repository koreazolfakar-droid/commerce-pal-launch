import { createServer } from "vite";

// Load the actual route registry through Vite so path aliases and TSX resolve
// exactly as they do in the application.
let routeRequest;

export function loadDashboardRoutes() {
  routeRequest ??= load();
  return routeRequest;
}

async function load() {
  const server = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  try {
    const module = await server.ssrLoadModule("/src/dashboard/config/routes.tsx");
    return module.dashboardRouteDefinitions;
  } finally {
    await server.close();
  }
}
