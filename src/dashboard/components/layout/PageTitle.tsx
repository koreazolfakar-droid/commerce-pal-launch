import type { ReactNode } from "react";
import { useLanguage } from "@/dashboard/i18n";

/** Shared title block so every dashboard page header reads the same way. */
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
    <>
      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
        <span className="size-1.5 rounded-full bg-[#6a70e7]" />
        {t(eyebrow)}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="text-[24px] font-black tracking-[-.04em] text-[#14203a] sm:text-[30px] sm:tracking-[-.05em]">
          {t(title)}
        </h1>
        {badge}
      </div>
      {description ? (
        <p className="mt-1.5 max-w-2xl text-[12px] leading-5 text-slate-500">{t(description)}</p>
      ) : null}
    </>
  );
}
