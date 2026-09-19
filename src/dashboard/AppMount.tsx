import { lazy, Suspense, useEffect, useState } from "react";
import Auth0DashboardSecurity from "@/dashboard/security/Auth0DashboardSecurity";
import { ThemeProvider } from "@/dashboard/contexts/ThemeContext";

const App = lazy(() => import("./App"));

export default function AppMount() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="min-h-screen bg-background" />;
  return (
    <ThemeProvider defaultTheme="light" switchable>
      <Auth0DashboardSecurity>
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <App />
        </Suspense>
      </Auth0DashboardSecurity>
    </ThemeProvider>
  );
}
