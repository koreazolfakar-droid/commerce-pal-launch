import { Check, ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import type { ContentSection } from "@/lib/productContent";
import { cn } from "@/lib/utils";

type ProseSectionsProps = {
  sections: ContentSection[];
  plain?: boolean;
  language?: "ar" | "en";
};

/** Merchant-authored content, with a compact style for product information cards. */
export function ProseSections({ sections, plain = false, language = "en" }: ProseSectionsProps) {
  if (sections.length === 0) return null;
  return (
    <div className={cn("grid min-w-0 gap-4", !plain && "gap-5")}>
      {sections.map((section, index) => (
        <DescriptionSection
          key={`${section.title ?? "section"}-${index}`}
          section={section}
          plain={plain}
          language={language}
        />
      ))}
    </div>
  );
}

function DescriptionSection({
  section,
  plain,
  language,
}: {
  section: ContentSection;
  plain: boolean;
  language: "ar" | "en";
}) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const long =
    section.paragraphs.join(" ").length > 320 ||
    section.paragraphs.length > 2 ||
    section.bullets.length > 6;
  return (
    <section
      className={cn(
        "min-w-0 max-w-4xl",
        !plain && "rounded-2xl border border-border/70 bg-card p-4 sm:p-5",
      )}
    >
      {section.title && (
        <h3 className="mb-3 text-base font-semibold tracking-tight text-foreground">
          {section.title}
        </h3>
      )}
      <div
        id={contentId}
        className={cn("relative min-w-0 overflow-hidden", long && !expanded ? "max-h-32" : "")}
      >
        {section.paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className="mb-3 break-words text-sm leading-7 text-foreground/80 last:mb-0 sm:text-[15px]"
          >
            {paragraph}
          </p>
        ))}
        {section.bullets.length > 0 && (
          <ul className="mt-2 grid gap-2.5 sm:grid-cols-2">
            {section.bullets.map((bullet, index) => (
              <li key={index} className="flex min-w-0 gap-2.5 text-sm leading-6">
                <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 break-words text-foreground/80">{bullet}</span>
              </li>
            ))}
          </ul>
        )}
        {long && !expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
        )}
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={contentId}
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {expanded
            ? language === "ar"
              ? "عرض أقل"
              : "Show less"
            : language === "ar"
              ? "قراءة الوصف بالكامل"
              : "Read full description"}
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </section>
  );
}
