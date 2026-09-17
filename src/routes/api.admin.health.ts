import {
  adminConfiguration,
  adminJson,
  adminPreflight,
  authorizeAdminRequest,
} from "@/lib/adminApi";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/health")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => adminPreflight(request),
      GET: async ({ request }) => {
        const unauthorized = authorizeAdminRequest(request);
        if (unauthorized) return unauthorized;

        return adminJson(request, {
          ok: true,
          service: "space-call-admin-api",
          timestamp: new Date().toISOString(),
          config: adminConfiguration(),
        });
      },
    },
  },
});
