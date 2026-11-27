import { useLanguage } from "@/dashboard/i18n";
import { Loader2, X } from "lucide-react";
import { useId } from "react";
import { useDashboardModal } from "@/dashboard/hooks/useDashboardModal";

type DashboardConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel?: string;
  pending?: boolean;
  destructive?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DashboardConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel = "Working...",
  pending = false,
  destructive = false,
  onClose,
  onConfirm,
}: DashboardConfirmDialogProps) {
  const { t } = useLanguage();
  const dialogRef = useDashboardModal(() => {
    if (!pending) onClose();
  }, open);
  const titleId = useId();
  const descriptionId = useId();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] grid place-items-end bg-slate-950/45 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-[18px] font-black tracking-[-.03em] text-[#14203a]">
              {t(title)}
            </h2>
            <p id={descriptionId} className="mt-2 text-[11px] leading-5 text-slate-500">
              {t(description)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label={t("Close confirmation")}
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending}
            className={
              "flex h-10 items-center gap-2 rounded-xl px-4 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 " +
              (destructive ? "bg-rose-600" : "bg-[#5968ea]")
            }
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t(pending ? pendingLabel : confirmLabel)}
          </button>
        </div>
      </div>
    </div>
  );
}
