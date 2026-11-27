const normalize = (value: string) =>
  value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();

/** User-provided text is traceable input, not an independently verified web source. */
export function suppliedEvidenceQuote(sourceText: string, quote: string, value: string) {
  const source = normalize(sourceText);
  const evidence = normalize(quote);
  const candidate = normalize(value);
  if (
    !source ||
    evidence.length < 4 ||
    quote.length > 1200 ||
    !candidate ||
    !source.includes(evidence)
  )
    return "";
  const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Do not accept 8 GB as evidence extracted from 128 GB, or a fragment of a model name.
  const literalValue = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "u");
  return literalValue.test(evidence) ? quote.trim() : "";
}
