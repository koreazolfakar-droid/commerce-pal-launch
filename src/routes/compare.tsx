import { createFileRoute, redirect } from "@tanstack/react-router";

/** The standalone comparison page is no longer part of the storefront UI. */
export const Route = createFileRoute("/compare")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true, statusCode: 308 });
  },
});
