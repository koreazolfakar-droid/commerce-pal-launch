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
      className="fixed inset-0 z-[97] grid place-items-end bg-slate-950/45 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-4"
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
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-[18px] font-black tracking-[-.03em] text-[#14203a]">
              {t(title)}
            </h2>
            <p className="mt-1 text-[10px] leading-4 text-slate-400">{t(subtitle)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close dialog")}
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-400"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
