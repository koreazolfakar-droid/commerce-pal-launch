import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChevronDown, ClipboardList, FileText, PackageOpen, Truck } from "lucide-react";
import type { ContentSection, SpecGroup } from "@/lib/productContent";
import { ProseSections } from "./ProseSection";
import { SpecSheet } from "./SpecSheet";

export function ProductInformation({
  overview,
  specifications,
  box,
  shipping,
  headingAction,
  language,
}: {
  overview: ContentSection[];
  specifications: SpecGroup[];
  box: ContentSection[];
  shipping: ContentSection[];
  headingAction?: ReactNode;
  language: "ar" | "en";
}) {
  const ar = language === "ar";
  const sections = [
    {
      key: "description",
      icon: FileText,
      label: ar ? "الوصف" : "Description",
      content: overview.length ? (
        <ProseSections sections={overview} plain language={language} />
      ) : null,
    },
    {
      key: "specifications",
      icon: ClipboardList,
      label: ar ? "المواصفات التقنية" : "Specifications",
      content: specifications.length ? (
        <SpecSheet groups={specifications} language={language} />
      ) : null,
    },
    {
      key: "box",
      icon: PackageOpen,
      label: ar ? "محتويات العلبة" : "What's in the box",
      content: box.length ? <ProseSections sections={box} plain language={language} /> : null,
    },
    {
      key: "delivery",
      icon: Truck,
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
            className="flex flex-wrap gap-2 text-sm font-semibold text-primary"
          >
            <Link
              to="/shipping"
              className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 hover:underline"
            >
              {ar ? "التوصيل" : "Shipping"}
            </Link>
            <Link
              to="/warranty"
              className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 hover:underline"
            >
              {ar ? "الضمان" : "Warranty"}
            </Link>
            <Link
              to="/returns"
              className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 hover:underline"
            >
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
      className="product-information"
      aria-label={ar ? "معلومات المنتج" : "Product details"}
    >
      <h2 className="product-section-title">{ar ? "معلومات المنتج" : "Product information"}</h2>
      <div className="min-w-0 divide-y divide-border rounded-2xl border border-border bg-card px-4 sm:px-6">
        {sections.map((section, index) => (
          <details
            key={section.key}
            id={section.key === "specifications" ? "product-specifications" : undefined}
            data-product-detail={section.key}
            open={index === 0 && section.key !== "delivery"}
            className="group min-w-0 scroll-mt-24"
          >
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 rounded-lg py-3 text-sm font-semibold text-foreground outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:text-base [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-primary">
                  <section.icon aria-hidden className="size-[1.125rem]" strokeWidth={1.65} />
                </span>
                {section.label}
              </span>
              <ChevronDown
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
                strokeWidth={1.65}
              />
            </summary>
            <div className="min-w-0 pb-5 sm:pb-6">{section.content}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
