import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

import type { ContentSection } from "@/lib/productContent";
import { cn } from "@/lib/utils";

/** Readable, well-spaced rendering of the merchant's own description blocks. */
export function ProseSections({ sections }: { sections: ContentSection[] }) {
  if (sections.length === 0) return null;
  return (
    <div className="grid gap-7">
      {sections.map((section, index) => (
        <DescriptionSection key={`${section.title ?? "section"}-${index}`} section={section} />
      ))}
    </div>
  );
}

function DescriptionSection({ section }: { section: ContentSection }) {
  const [expanded, setExpanded] = useState(false);
  const long = section.paragraphs.length > 2 || section.bullets.length > 6;
  return (
    <section className="max-w-3xl rounded-lg border bg-surface/40 p-4 sm:p-5">
      {section.title && (
        <h3 className="mb-3 text-base font-bold tracking-tight text-foreground">{section.title}</h3>
      )}
      <div
        className={cn(
          "relative overflow-hidden",
          long && !expanded ? "max-h-44" : "max-h-[5000px]",
        )}
      >
        {section.paragraphs.map((paragraph, paragraphIndex) => (
          <p
            key={paragraphIndex}
            className="mb-3 text-[15px] leading-7 text-muted-foreground last:mb-0"
          >
            {paragraph}
          </p>
        ))}
        {section.bullets.length > 0 && (
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {section.bullets.map((bullet, bulletIndex) => (
              <li key={bulletIndex} className="flex gap-2.5 text-[14px] leading-6">
                <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 text-muted-foreground">{bullet}</span>
              </li>
            ))}
          </ul>
        )}
        {long && !expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-surface/95 to-transparent" />
        )}
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary"
        >
          {expanded ? "Show less" : "Read full description"}
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </section>
  );
}
