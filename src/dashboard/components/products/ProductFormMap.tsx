import { useState } from "react";
import { CheckCircle2, ChevronDown, Circle } from "lucide-react";
import { useLanguage } from "@/dashboard/i18n";

type FormSection = { id: string; label: string; complete: boolean };

const FORM_GROUPS = [
  {
    id: "essentials",
    en: "Start here",
    ar: "ابدأ من هنا",
    hintEn: "Product details, price and stock",
    hintAr: "المعلومات والسعر والمخزون",
    ids: ["product-information", "product-pricing", "product-inventory"],
  },
  {
    id: "presentation",
    en: "Product details",
    ar: "تفاصيل المنتج",
    hintEn: "Images, variants and specifications",
    hintAr: "الصور والنسخ والمواصفات",
    ids: ["product-media", "product-variants", "product-specifications"],
  },
  {
    id: "discovery",
    en: "Store organization",
    ar: "تنظيم المتجر",
    hintEn: "Collections, search and discovery",
    hintAr: "المجموعات والبحث والظهور",
    ids: ["product-collections", "product-organization", "product-seo"],
  },
  {
    id: "review",
    en: "Review & settings",
    ar: "المراجعة والإعدادات",
    hintEn: "Visibility, delivery and advanced details",
    hintAr: "النشر والتوصيل والإعدادات",
    ids: ["product-publishing", "product-shipping", "product-advanced"],
  },
] as const;

export default function ProductFormMap({
  sections,
  dirty,
}: {
  sections: FormSection[];
  dirty: boolean;
}) {
  const { t, lang } = useLanguage();
  const ar = lang === "ar";
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(["essentials", "presentation"]),
  );
  const prepared = sections.filter((section) => section.complete).length;

  const jumpTo = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    if (target instanceof HTMLDetailsElement) target.open = true;
    const parentDetails = target.closest("details");
    if (parentDetails) parentDetails.open = true;
    target.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    target.focus({ preventScroll: true });
  };

  return (
    <section className="dashboard-form-map" aria-label={t("Product form overview")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">
            {ar ? "خريطة تعبئة المنتج" : "Product setup guide"}
          </h2>
          <p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">
            {ar
              ? "ابدأ بالمعلومات الأساسية، ثم الصور والمواصفات. باقي الأقسام اختيارية ويمكنك الرجوع إليها لاحقاً."
              : "Start with the essentials, then images and specifications. You can finish the other sections later."}
          </p>
        </div>
        <span role="status" className="inline-flex items-center rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground">
          {t(dirty ? "Unsaved changes" : "No unsaved changes")}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-foreground">
          {ar ? "الأقسام المجهّزة" : "Sections prepared"}
        </span>
        <span className="font-semibold tabular-nums text-foreground" dir="ltr">{prepared} / {sections.length}</span>
      </div>
      <div
        role="progressbar"
        aria-label={ar ? "تقدم تعبئة أقسام المنتج" : "Product setup progress"}
        aria-valuemin={0}
        aria-valuemax={sections.length}
        aria-valuenow={prepared}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${sections.length ? prepared / sections.length * 100 : 0}%` }}
        />
      </div>
      <nav className="dashboard-form-map-steps" aria-label={t("Product sections")}>
        {FORM_GROUPS.map((group) => {
          const groupSections = group.ids
            .map((id) => sections.find((section) => section.id === id))
            .filter((section): section is FormSection => Boolean(section));
          if (!groupSections.length) return null;
          const count = groupSections.filter((section) => section.complete).length;
          const isOpen = expanded.has(group.id);
          return (
            <div key={group.id} className="dashboard-form-map-group">
              <button
                type="button"
                className="dashboard-form-map-group-toggle"
                aria-expanded={isOpen}
                aria-controls={`product-form-group-${group.id}`}
                onClick={() => {
                  setExpanded((current) => {
                    const next = new Set(current);
                    if (next.has(group.id)) next.delete(group.id);
                    else next.add(group.id);
                    return next;
                  });
                }}
              >
                <span className="min-w-0 flex-1 text-start">
                  <span className="block text-xs font-semibold text-foreground">
                    {ar ? group.ar : group.en}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                    {ar ? group.hintAr : group.hintEn}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground" dir="ltr">
                  {count}/{groupSections.length}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div
                id={`product-form-group-${group.id}`}
                hidden={!isOpen}
                className="dashboard-form-map-links"
              >
                {groupSections.map((section) => (
                  <button
                    type="button"
                    key={section.id}
                    data-complete={section.complete}
                    onClick={() => jumpTo(section.id)}
                    className="dashboard-form-map-link"
                  >
                    {section.complete
                      ? <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-primary" />
                      : <Circle aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />}
                    <span className="min-w-0 flex-1 text-start">{t(section.label)}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
        {ar
          ? "عدد الأقسام المجهّزة للإرشاد فقط، وليس شرطاً لنشر المنتج. احفظ المسودة في أي وقت."
          : "Section progress is a guide, not a publishing requirement. You can save a draft at any time."}
      </p>
    </section>
  );
}
