import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { useDashboardModal } from "@/dashboard/hooks/useDashboardModal";
import { useLanguage } from "@/dashboard/i18n";

export default function DashboardModal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useDashboardModal(onClose);
  const titleId = useId();
  const { t } = useLanguage();
  return (
    <div
      className="dashboard-modal-backdrop fixed inset-0 z-[97] grid place-items-end bg-slate-950/50 p-0 backdrop-blur-[3px] sm:place-items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="dashboard-modal-surface max-h-[min(94dvh,850px)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl sm:rounded-2xl sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-border pb-4">
          <div className="min-w-0">
            <h2 id={titleId} className="break-words text-lg font-semibold tracking-tight text-foreground">
              {t(title)}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(subtitle)}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close dialog")}
            className="dashboard-icon-button grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-[18px]" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
