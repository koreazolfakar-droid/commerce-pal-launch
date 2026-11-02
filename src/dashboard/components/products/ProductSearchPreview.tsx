import { useLanguage } from "@/dashboard/i18n";
import { productSearchPreview } from "@/dashboard/lib/productSearchPreview";

export default function ProductSearchPreview(props: Parameters<typeof productSearchPreview>[0]) {
  const { t } = useLanguage();
  const preview = productSearchPreview(props);
  return (
    <section
      aria-label={t("Search engine preview")}
      className="min-w-0 rounded-lg border border-border bg-muted/25 p-4"
    >
      <h3 className="mb-3 text-xs font-semibold text-muted-foreground">
        {t("Search engine preview")}
      </h3>
      <p dir="ltr" className="break-all text-xs text-muted-foreground">
        {preview.url}
      </p>
      <p className="mt-1 break-words text-base font-medium text-primary">
        {preview.title || t("Product title")}
      </p>
      <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
        {preview.description.slice(0, 320)}
      </p>
      {!props.handle ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("The product URL is generated when you save.")}
        </p>
      ) : null}
    </section>
  );
}
