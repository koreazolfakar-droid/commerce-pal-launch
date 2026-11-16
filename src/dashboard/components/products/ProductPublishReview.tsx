import { AlertCircle, CheckCircle2, ChevronDown, CircleAlert, ExternalLink } from "lucide-react";
import { useLanguage } from "@/dashboard/i18n";
import type { ProductReviewIssue, ProductReviewResult } from "@/dashboard/lib/productPublishReadiness";

export default function ProductPublishReview({
  result,
  expanded,
  busy,
  onToggle,
  onJump,
  onConfirm,
}: {
  result: ProductReviewResult;
  expanded: boolean;
  busy: boolean;
  onToggle: () => void;
  onJump: (issue: ProductReviewIssue) => void;
  onConfirm: () => void;
}) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const title = (issue: ProductReviewIssue) => ar ? issue.titleAr : issue.titleEn;
  const detail = (issue: ProductReviewIssue) => ar ? issue.detailAr : issue.detailEn;
  return (
    <section
      id="product-publish-review"
      tabIndex={-1}
      aria-labelledby="product-review-heading"
      className="mb-4 min-w-0 scroll-mt-28 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 id="product-review-heading" className="text-sm font-semibold text-foreground">
            {ar ? "مراجعة المنتج قبل النشر" : "Review before publishing"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {ar
              ? "الشروط اللازمة منفصلة عن التحسينات الاختيارية. حفظ المسودة متاح بدون اكتمال كل الأقسام."
              : "Publish blockers are separate from optional improvements. You can save a draft without finishing every section."}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="product-publish-review-content"
          onClick={onToggle}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
        >
          {ar ? "عرض المراجعة" : "View checklist"}
          <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>
      <div className="grid gap-3 border-t border-border bg-muted/20 px-4 py-3 sm:grid-cols-3 sm:px-5">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <CheckCircle2 aria-hidden="true" className="size-4 text-primary" />
          <span>{ar ? "شروط تم التحقق منها" : "Checks passed"}</span>
          <strong className="ms-auto tabular-nums" dir="ltr">{result.checksPassed}/{result.checksTotal}</strong>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <AlertCircle aria-hidden="true" className="size-4 text-rose-600 dark:text-rose-400" />
          <span>{ar ? "أخطاء تمنع النشر" : "Publish blockers"}</span>
          <strong className="ms-auto tabular-nums">{result.blockers.length}</strong>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <CircleAlert aria-hidden="true" className="size-4 text-amber-600 dark:text-amber-400" />
          <span>{ar ? "تحسينات اختيارية" : "Optional suggestions"}</span>
          <strong className="ms-auto tabular-nums">{result.recommendations.length}</strong>
        </div>
      </div>
      <div className="px-4 pb-3 sm:px-5">
        <div
          role="progressbar"
          aria-label={ar ? "فحوص الجاهزية الفعلية للنشر" : "Actual publish readiness checks"}
          aria-valuemin={0}
          aria-valuemax={result.checksTotal}
          aria-valuenow={result.checksPassed}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${result.checksTotal ? result.checksPassed / result.checksTotal * 100 : 100}%` }}
          />
        </div>
      </div>
      {expanded ? (
        <div id="product-publish-review-content" className="space-y-4 border-t border-border p-4 sm:p-5">
          <div aria-live="polite" className="text-sm font-semibold text-foreground">
            {result.canPublish
              ? (ar ? "لا توجد أخطاء تمنع النشر. راجع الاقتراحات ثم أكّد النشر." : "No publish blockers. Review suggestions, then confirm.")
              : (ar ? "أصلح الأخطاء التالية قبل النشر." : "Fix these issues before publishing.")}
          </div>
          {result.blockers.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                {ar ? "مطلوب إصلاحه" : "Must fix"} ({result.blockers.length})
              </h3>
              {result.blockers.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => onJump(issue)}
                  className="flex min-h-11 w-full items-start gap-3 rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-start text-foreground transition hover:bg-rose-100/70 focus-visible:outline-2 focus-visible:outline-primary dark:border-rose-900/60 dark:bg-rose-950/20"
                >
                  <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-300" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold">{title(issue)}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail(issue)}</span>
                  </span>
                  <ExternalLink aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : null}
          {result.recommendations.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                {ar ? "تحسينات غير إلزامية" : "Optional improvements"} ({result.recommendations.length})
              </h3>
              {result.recommendations.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => onJump(issue)}
                  className="flex min-h-11 w-full items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 text-start text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold">{title(issue)}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail(issue)}</span>
                  </span>
                  <ExternalLink aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="max-w-md text-xs leading-5 text-muted-foreground">
              {ar
                ? "التوصيات اختيارية. تأكيد النشر يحفظ بيانات المنتج الفعلية فقط، وليس الأمثلة الظاهرة في الخانات."
                : "Suggestions are optional. Confirmation saves only actual product data, not example placeholders."}
            </p>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy || !result.canPublish}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ar ? "تأكيد نشر المنتج" : "Confirm publish"}
            </button>
          </div>
        </div>
      ) : (
        <div id="product-publish-review-content" hidden />
      )}
    </section>
  );
}
