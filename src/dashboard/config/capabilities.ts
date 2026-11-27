// These routes explain planned tools; they have no connected workflow yet.
// Keep them reachable directly without promoting them as working primary actions.
export const unavailableDashboardRoutes = new Set([
  "/dashboard/promotions",
  "/dashboard/marketing",
  "/dashboard/coupons",
  "/dashboard/reviews",
  "/dashboard/messages",
]);
