import { lazy, Suspense, useEffect, useState } from "react";
import Auth0DashboardSecurity from "@/dashboard/security/Auth0DashboardSecurity";

const App = lazy(() => import("./App"));

export default function AppMount() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="min-h-screen bg-[#f7f9fc]" />;
  return (
    <Auth0DashboardSecurity>
      <Suspense fallback={<div className="min-h-screen bg-[#f7f9fc]" />}>
        <App />
      </Suspense>
    </Auth0DashboardSecurity>
  );
}
