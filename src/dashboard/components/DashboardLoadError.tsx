import { AlertTriangle, RefreshCw } from "lucide-react";
import { useLanguage } from "@/dashboard/i18n";

export default function DashboardLoadError({
  message,
  onRetry,
  busy = false,
}: {
  message: string;
  onRetry: () => void;
  busy?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div role="alert" className="dashboard-load-error">
      <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <strong>{t("Unable to refresh this section")}</strong>
        <p className="break-words">{message}</p>
        <p>
          {t(
            "Your existing data and unsaved edits are kept. Try again when the connection is available.",
          )}
        </p>
      </div>
      <button type="button" className="dashboard-button shrink-0" onClick={onRetry} disabled={busy}>
        <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
        {t("Try again")}
      </button>
    </div>
  );
}
