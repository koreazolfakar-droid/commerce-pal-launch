import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/dashboard/i18n";

class RouteErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Keep the workspace navigation available when a single section cannot render. */
export default function ErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  return (
    <RouteErrorBoundary
      fallback={
        <section className="dashboard-panel dashboard-empty-state" role="alert">
          <AlertTriangle className="size-8 text-amber-600" />
          <h1 className="text-xl font-bold text-foreground">
            {t("This section could not be opened.")}
          </h1>
          <p>{t("Reload this section or return to the dashboard to continue.")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="dashboard-button dashboard-button-primary"
              onClick={() => window.location.reload()}
            >
              <RotateCcw className="size-4" />
              {t("Reload section")}
            </button>
            <Link href="/dashboard" className="dashboard-button">
              {t("Back to dashboard")}
            </Link>
          </div>
        </section>
      }
    >
      {children}
    </RouteErrorBoundary>
  );
}
