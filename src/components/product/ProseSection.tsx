import { Check } from "lucide-react";

import type { ContentSection } from "@/lib/productContent";

/** Readable, well-spaced rendering of the merchant's own description blocks. */
export function ProseSections({ sections }: { sections: ContentSection[] }) {
  if (sections.length === 0) return null;
  return (
    <div className="grid gap-7">
      {sections.map((section, index) => (
        <section key={`${section.title ?? "section"}-${index}`} className="max-w-3xl">
          {section.title && (
            <h3 className="mb-2.5 text-base font-bold tracking-tight text-foreground">
              {section.title}
            </h3>
          )}
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
        </section>
      ))}
    </div>
  );
}
