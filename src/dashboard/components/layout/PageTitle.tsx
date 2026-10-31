import type { ReactNode } from "react";
import { useLanguage } from "@/dashboard/i18n";

/** One consistent, theme-aware page heading across dashboard workspaces. */
export function PageTitle({
  eyebrow,
  title,
  description,
  badge,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  badge?: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="dashboard-page-heading min-w-0">
      <div className="dashboard-page-eyebrow mb-2 flex items-center gap-2">
        <span aria-hidden="true" className="dashboard-heading-marker" />
        <span>{t(eyebrow)}</span>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <h1 className="dashboard-page-title min-w-0 break-words text-foreground">
          {t(title)}
        </h1>
        {badge}
      </div>
      {description ? (
        <p className="dashboard-page-description mt-2">{t(description)}</p>
      ) : null}
    </div>
  );
}
