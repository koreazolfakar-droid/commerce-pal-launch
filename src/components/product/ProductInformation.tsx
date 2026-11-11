import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import type { ContentSection, SpecGroup } from "@/lib/productContent";
import { ProseSections } from "./ProseSection";
import { SpecSheet } from "./SpecSheet";

export function ProductInformation({
  overview,
  specifications,
  box,
  shipping,
  language,
}: {
  overview: ContentSection[];
  specifications: SpecGroup[];
  box: ContentSection[];
  shipping: ContentSection[];
  language: "ar" | "en";
}) {
  const ar = language === "ar";
  const sections = [
    {
      key: "description",
      label: ar ? "الوصف" : "Description",
      content: overview.length ? (
        <ProseSections sections={overview} plain language={language} />
      ) : null,
    },
    {
      key: "specifications",
      label: ar ? "المواصفات التقنية" : "Specifications",
      content: specifications.length ? (
        <SpecSheet groups={specifications} language={language} />
      ) : null,
    },
    {
      key: "box",
      label: ar ? "محتويات العلبة" : "What's in the box",
      content: box.length ? <ProseSections sections={box} plain language={language} /> : null,
    },
    {
      key: "delivery",
      label: ar ? "التوصيل والضمان والإرجاع" : "Delivery, warranty & returns",
      content: (
        <div className="grid gap-4">
          <ProseSections sections={shipping} plain language={language} />
          <p className="text-sm leading-6 text-muted-foreground">
            {ar
              ? "اطّلع على سياسات المتجر لمعرفة التفاصيل والشروط."
              : "See our store policies for details and conditions."}
          </p>
          <nav
            aria-label={ar ? "سياسات المتجر" : "Store policies"}
            className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-primary"
          >
            <Link to="/shipping" className="inline-flex min-h-11 items-center hover:underline">
              {ar ? "التوصيل" : "Shipping"}
            </Link>
            <Link to="/warranty" className="inline-flex min-h-11 items-center hover:underline">
              {ar ? "الضمان" : "Warranty"}
            </Link>
            <Link to="/returns" className="inline-flex min-h-11 items-center hover:underline">
              {ar ? "الإرجاع" : "Returns"}
            </Link>
          </nav>
        </div>
      ),
    },
  ].filter((section) => section.content !== null);

  return (
    <section
      data-testid="product-information"
      className="mt-8 min-w-0 border-t border-border/60 pt-6 sm:mt-12 sm:pt-8"
      aria-label={ar ? "معلومات المنتج" : "Product details"}
    >
      <h2 className="mb-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {ar ? "معلومات المنتج" : "Product information"}
      </h2>
      <div className="divide-y divide-border/60">
        {sections.map((section, index) => (
          <details
            key={section.key}
            data-product-detail={section.key}
            open={index === 0 && section.key !== "delivery"}
            className="group min-w-0"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold text-foreground outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
              <span>{section.label}</span>
              <ChevronDown
                aria-hidden
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <div className="min-w-0 pb-5 sm:pb-6">{section.content}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
