import { createFileRoute } from "@tanstack/react-router";
import AppMount from "@/dashboard/AppMount";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Space Call · Admin Dashboard" },
      {
        name: "description",
        content: "Space Call store administration dashboard.",
      },
      { property: "og:title", content: "Space Call · Admin Dashboard" },
      {
        property: "og:description",
        content: "Manage orders, products, inventory and store content.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AppMount,
});
