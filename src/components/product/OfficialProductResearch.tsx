import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Globe2, Loader2, Sparkles } from "lucide-react";

import { enrichProductFromOfficialSource } from "@/lib/productResearch.functions";

function ProductContext({
  title,
  vendor,
}: {
  title: string;
  vendor: string | null | undefined;
}) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {title} in Lebanon
      </h3>
      <p className="mt-3 text-sm leading-7 text-foreground/80">
        {vendor ? `${title} by ${vendor}` : title} is listed in the live Space Call catalogue for
        shoppers in Lebanon. Product options, pricing and availability are kept with the storefront
        listing so you can check the exact configuration before ordering. Review the specifications,
        selected variant and current stock status on this page, then complete checkout securely or
        contact Space Call for order support.
      </p>
    </div>
  );
}

export function OfficialProductResearch({
  title,
  vendor,
}: {
  title: string;
  vendor?: string | null;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["official-product-research", vendor ?? "", title],
    queryFn: () => enrichProductFromOfficialSource({ data: { title, vendor: vendor ?? null } }),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <section
        className="rounded-[1.5rem] border bg-card p-5 shadow-card sm:p-6"
        aria-live="polite"
      >
        <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr] lg:items-start">
          <ProductContext title={title} vendor={vendor} />
          <div className="flex items-center gap-3 rounded-2xl border bg-muted/20 p-4 text-sm font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p>Verifying official product information</p>
              <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                Checking the manufacturer&apos;s official source…
              </p>
            </div>
            <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
          </div>
        </div>
      </section>
    );
  }

  if (!data || (!data.summary && !data.promotionalImages.length && !data.specifications.length)) {
    return (
      <section className="rounded-[1.5rem] border bg-card p-5 shadow-card sm:p-6">
        <ProductContext title={title} vendor={vendor} />
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[1.5rem] border bg-card shadow-card">
      <div className="border-b bg-muted/25 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              <Globe2 className="h-3.5 w-3.5" />
              Official source research
            </div>
            <h2 className="mt-3 text-xl font-extrabold tracking-tight">
              Verified product information
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Product facts are matched against the manufacturer&apos;s official website.
            </p>
          </div>
          {data.officialProductUrl && (
            <a
              href={data.officialProductUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors hover:border-primary hover:text-primary"
            >
              Manufacturer page
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {data.promotionalImages.length > 0 && (
        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
          {data.promotionalImages.slice(0, 6).map((image, index) => (
            <a
              key={image}
              href={image}
              target="_blank"
              rel="noreferrer"
              className="group overflow-hidden rounded-2xl border bg-image-stage"
              aria-label={`Official promotional image ${index + 1}`}
            >
              <img
                src={image}
                alt={`${title} official promotional image ${index + 1}`}
                loading="lazy"
                decoding="async"
                width={900}
                height={900}
                className="aspect-square h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-[1.025]"
              />
            </a>
          ))}
        </div>
      )}

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.05fr_.95fr]">
        <div className="space-y-6">
          <ProductContext title={title} vendor={vendor} />
          {data.summary && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
                About this product
              </h3>
              <p className="mt-3 text-sm leading-7 text-foreground/80">{data.summary}</p>
              {data.highlights.length > 0 && (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {data.highlights.slice(0, 8).map((item) => (
                    <li
                      key={item}
                      className="rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium leading-5"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {data.specifications.length > 0 && (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Official specifications
            </h3>
            <dl className="mt-3 divide-y rounded-2xl border">
              {data.specifications.slice(0, 12).map((spec) => (
                <div
                  key={`${spec.label}-${spec.value}`}
                  className="grid grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)] gap-4 px-3 py-2.5 text-xs"
                >
                  <dt className="font-semibold text-muted-foreground">{spec.label}</dt>
                  <dd className="font-medium text-foreground">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      {data.sourceUrls.length > 0 && (
        <div className="border-t px-5 py-3 text-[11px] text-muted-foreground sm:px-6">
          Source: {data.sourceUrls[0]}
        </div>
      )}
    </section>
  );
}
