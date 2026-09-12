import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BadgeCheck,
  CircleCheck,
  CircleX,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Fragment, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import {
  researchPhoneComparison,
  type PhoneComparisonResult,
} from "@/lib/phoneComparison.functions";
import type { ShopifyProduct } from "@/lib/shopify";
import { cn } from "@/lib/utils";

function sourceLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function titleForHandle(products: ShopifyProduct[], handle: string) {
  return products.find((product) => product.node.handle === handle)?.node.title ?? handle;
}

function ResearchResult({
  result,
  products,
  onRefresh,
  refreshing,
}: {
  result: PhoneComparisonResult;
  products: ShopifyProduct[];
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const groups = useMemo(() => {
    const grouped = new Map<string, PhoneComparisonResult["rows"]>();
    result.rows.forEach((row) => {
      const current = grouped.get(row.category) ?? [];
      current.push(row);
      grouped.set(row.category, current);
    });
    return [...grouped.entries()];
  }, [result.rows]);

  const winnerTitle = result.overallWinnerHandle
    ? titleForHandle(products, result.overallWinnerHandle)
    : "No universal winner";

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border bg-card shadow-card">
        <div className="border-b bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                  <Sparkles className="h-3.5 w-3.5" /> AI expert research
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  <Search className="h-3.5 w-3.5" /> Live web research
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  <BadgeCheck className="h-3.5 w-3.5 text-success" /> Source-checked
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {result.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                {result.summary}
              </p>
            </div>
            <Button
              variant="outline"
              className="shrink-0 rounded-xl"
              onClick={onRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Research again
            </Button>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[0.9fr_2.1fr]">
          <div className="border-b p-5 lg:border-b-0 lg:border-e lg:p-6">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
              Overall verdict
            </p>
            <div className="mt-3 flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Trophy className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-extrabold leading-snug">{winnerTitle}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {result.winnerReason}
                </p>
              </div>
            </div>
          </div>
          <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-2">
            {products.map((product) => {
              const assessment = result.productAssessments.find(
                (item) => item.handle === product.node.handle,
              );
              if (!assessment) return null;
              return (
                <div key={product.node.handle} className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-extrabold">{product.node.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Balanced expert score</p>
                    </div>
                    <span className="shrink-0 rounded-xl bg-surface px-3 py-2 text-lg font-extrabold">
                      {assessment.score.toFixed(1)}<span className="text-xs text-muted-foreground">/10</span>
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{assessment.verdict}</p>
                  {assessment.bestFor.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {assessment.bestFor.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border bg-background px-2.5 py-1 text-[11px] font-semibold"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {result.rows.length > 0 && (
        <section aria-labelledby="ai-spec-table-title">
          <div className="mb-4">
            <h3 id="ai-spec-table-title" className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Researched specification table
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Verified specifications with an expert explanation of what each difference means in practice.
            </p>
          </div>

          <div className="space-y-4 lg:hidden">
            {groups.map(([group, rows]) => (
              <div key={group} className="overflow-hidden rounded-2xl border bg-card shadow-card">
                <div className="border-b bg-surface/75 px-4 py-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                    {group}
                  </h4>
                </div>
                <div className="divide-y">
                  {rows.map((row) => (
                    <div key={`${group}-${row.spec}`} className="p-4">
                      <h5 className="font-bold">{row.spec}</h5>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {products.map((product) => {
                          const value = row.values.find((item) => item.handle === product.node.handle)?.value ?? "—";
                          const winner = row.winnerHandle === product.node.handle;
                          return (
                            <div
                              key={product.node.handle}
                              className={cn(
                                "min-w-0 rounded-xl border bg-background p-3",
                                winner && "border-primary/40 bg-primary/5",
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                  {product.node.title}
                                </p>
                                {winner && (
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                    <Trophy className="h-3 w-3" /> Edge
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 break-words text-sm font-semibold leading-5">{value}</p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 rounded-xl bg-surface/70 p-3 text-xs leading-5 text-muted-foreground">
                        <span className="font-bold text-foreground">Expert take: </span>
                        {row.expertNote}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-card lg:block">
            <div className="overflow-x-auto">
              <table
                className="w-full border-collapse text-start text-sm"
                style={{ minWidth: `${230 + products.length * 260 + 330}px` }}
              >
                <thead>
                  <tr className="border-b bg-surface/85">
                    <th className="sticky start-0 z-20 w-[230px] min-w-[230px] border-e bg-surface p-4 text-start font-extrabold">
                      Specification
                    </th>
                    {products.map((product) => (
                      <th
                        key={product.node.handle}
                        className="min-w-[260px] border-e p-4 text-start font-extrabold"
                      >
                        {product.node.title}
                      </th>
                    ))}
                    <th className="min-w-[330px] p-4 text-start font-extrabold">Expert take</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(([group, rows]) => (
                    <Fragment key={group}>
                      <tr className="border-b bg-muted/35">
                        <th
                          colSpan={products.length + 2}
                          className="px-4 py-2.5 text-start text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground"
                        >
                          {group}
                        </th>
                      </tr>
                      {rows.map((row) => (
                        <tr key={`${group}-${row.spec}`} className="border-b last:border-b-0 hover:bg-surface/40">
                          <th className="sticky start-0 z-10 w-[230px] min-w-[230px] border-e bg-card p-4 text-start font-semibold">
                            {row.spec}
                          </th>
                          {products.map((product) => {
                            const value = row.values.find((item) => item.handle === product.node.handle)?.value ?? "—";
                            const winner = row.winnerHandle === product.node.handle;
                            return (
                              <td
                                key={product.node.handle}
                                className={cn(
                                  "min-w-[260px] border-e p-4 align-top leading-6",
                                  winner && "bg-primary/5",
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <span className="break-words">{value}</span>
                                  {winner && (
                                    <Trophy className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" aria-label="Advantage" />
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="min-w-[330px] p-4 align-top leading-6 text-muted-foreground">
                            {row.expertNote}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {result.keyDifferences.length > 0 && (
        <section>
          <h3 className="text-xl font-extrabold tracking-tight sm:text-2xl">Biggest real-world differences</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {result.keyDifferences.map((difference) => (
              <article key={difference.title} className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-extrabold">{difference.title}</h4>
                  {difference.advantageHandle && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                      {titleForHandle(products, difference.advantageHandle)}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{difference.detail}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        {products.map((product) => {
          const assessment = result.productAssessments.find(
            (item) => item.handle === product.node.handle,
          );
          if (!assessment) return null;
          return (
            <article key={product.node.handle} className="overflow-hidden rounded-2xl border bg-card shadow-card">
              <div className="border-b bg-surface/65 px-5 py-4">
                <h3 className="font-extrabold">{product.node.title}</h3>
              </div>
              <div className="grid gap-5 p-5 sm:grid-cols-2">
                <div>
                  <p className="flex items-center gap-2 text-sm font-extrabold text-success">
                    <CircleCheck className="h-4 w-4" /> Advantages
                  </p>
                  <ul className="mt-3 space-y-2.5 text-sm leading-6">
                    {assessment.pros.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="flex items-center gap-2 text-sm font-extrabold text-destructive">
                    <CircleX className="h-4 w-4" /> Drawbacks
                  </p>
                  <ul className="mt-3 space-y-2.5 text-sm leading-6">
                    {assessment.cons.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {result.recommendations.length > 0 && (
        <section className="rounded-2xl border bg-card p-5 shadow-card sm:p-6">
          <h3 className="text-xl font-extrabold tracking-tight">Which one should you buy?</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {result.recommendations.map((recommendation) => (
              <div key={`${recommendation.useCase}-${recommendation.handle}`} className="rounded-xl border bg-background p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {recommendation.useCase}
                </p>
                <p className="mt-1 font-extrabold">{titleForHandle(products, recommendation.handle)}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{recommendation.reason}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {(result.caveats.length > 0 || result.sources.length > 0) && (
        <section className="rounded-2xl border bg-card p-5 shadow-card sm:p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="font-extrabold">Research notes</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Regional variants and conflicting source claims are called out instead of being guessed.
              </p>
              {result.caveats.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                  {result.caveats.map((item) => (
                    <li key={item} className="flex gap-2">
                      <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="font-extrabold">Sources used</h3>
              {result.sources.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.sources.map((source, index) => (
                    <a
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-semibold hover:border-primary/40 hover:text-primary"
                      title={source.title}
                    >
                      <span className="truncate">{index + 1}. {source.title || sourceLabel(source.url)}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No source links were returned for this run.</p>
              )}
            </div>
          </div>
          <p className="mt-5 border-t pt-4 text-[11px] leading-5 text-muted-foreground">
            Expert scores use a balanced weighting of performance, cameras, display, battery/charging,
            software support, build quality and current store value. Research refreshed {new Date(result.researchedAt).toLocaleString()}.
          </p>
        </section>
      )}
    </div>
  );
}

export function AIPhoneComparison({
  products,
  active,
}: {
  products: ShopifyProduct[];
  active: boolean;
}) {
  const { language } = useLanguage();
  const handles = useMemo(() => products.map((product) => product.node.handle), [products]);
  const key = handles.join("|");
  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ["ai-phone-comparison", language, key],
    queryFn: () => researchPhoneComparison({ data: { handles, language } }),
    enabled: active && handles.length >= 2,
    staleTime: 15 * 60 * 1000,
    retry: false,
  });

  if (!active || handles.length < 2) return null;

  if (isPending) {
    return (
      <section id="ai-expert-comparison" className="mt-6 rounded-3xl border bg-card p-8 text-center shadow-card sm:mt-8 sm:p-12">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Search className="h-6 w-6 animate-pulse" />
        </span>
        <h2 className="mt-5 text-xl font-extrabold sm:text-2xl">Researching both phones on the web…</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          The AI is checking official specifications, trusted technical sources, regional variants and the current store price before building the expert comparison.
        </p>
        <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Evidence-first comparison in progress
        </div>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section id="ai-expert-comparison" className="mt-6 rounded-3xl border bg-card p-8 text-center shadow-card sm:mt-8">
        <AlertTriangle className="mx-auto h-9 w-9 text-destructive" />
        <h2 className="mt-4 text-xl font-extrabold">AI comparison could not be loaded</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your normal product comparison is still available below.</p>
        <Button className="mt-5 rounded-xl" onClick={() => void refetch()}>
          <RefreshCw className="h-4 w-4" /> Try again
        </Button>
      </section>
    );
  }

  if (!data.ok) {
    return (
      <section id="ai-expert-comparison" className="mt-6 rounded-3xl border bg-card p-8 text-center shadow-card sm:mt-8">
        <AlertTriangle className="mx-auto h-9 w-9 text-destructive" />
        <h2 className="mt-4 text-xl font-extrabold">AI research was not completed</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{data.message}</p>
        <Button className="mt-5 rounded-xl" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Retry research
        </Button>
      </section>
    );
  }

  return (
    <section id="ai-expert-comparison" className="mt-6 sm:mt-8" aria-label="AI expert phone comparison">
      <ResearchResult
        result={data.result}
        products={products}
        onRefresh={() => void refetch()}
        refreshing={isFetching}
      />
    </section>
  );
}
