import { CheckCircle2, Circle } from "lucide-react";
import { useLanguage } from "@/dashboard/i18n";

export default function ProductFormMap({
  sections,
  dirty,
}: {
  sections: { id: string; label: string; complete: boolean }[];
  dirty: boolean;
}) {
  const { t } = useLanguage();
  return (
    <section className="dashboard-form-map" aria-label={t("Product form overview")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{t("Product form overview")}</h2>
        <span role="status" className="text-xs text-muted-foreground">
          {t(dirty ? "Unsaved changes" : "No unsaved changes")} ·{" "}
          <bdi dir="ltr">
            {sections.filter((item) => item.complete).length} / {sections.length}
          </bdi>{" "}
          {t("sections prepared")}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("Jump to a section to review it. Optional content does not prevent saving a draft.")}
      </p>
      <nav aria-label={t("Product sections")}>
        {sections.map((section) => (
          <button
            type="button"
            key={section.id}
            className="dashboard-button text-xs"
            data-complete={section.complete}
            onClick={() => {
              const target = document.getElementById(section.id);
              target?.scrollIntoView({
                block: "start",
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
              });
              target?.focus({ preventScroll: true });
            }}
          >
            {section.complete ? (
              <CheckCircle2 className="size-3.5 text-primary" />
            ) : (
              <Circle className="size-3.5 text-muted-foreground" />
            )}
            {t(section.label)}
          </button>
        ))}
      </nav>
    </section>
  );
}
