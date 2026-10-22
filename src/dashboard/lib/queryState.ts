export type QueryValue = string | number | boolean;

export function readQueryValue<T extends QueryValue>(
  params: URLSearchParams,
  key: string,
  fallback: T,
  allowed?: readonly T[],
): T {
  const raw = params.get(key);
  if (raw == null || raw.length > 500) return fallback;
  let value: QueryValue = raw;
  if (typeof fallback === "number") {
    value = Number(raw);
    if (
      !raw.trim() ||
      !Number.isSafeInteger(value) ||
      value < (key === "page" ? 1 : 0) ||
      value > 1_000_000
    )
      return fallback;
  } else if (typeof fallback === "boolean") {
    if (!["1", "0", "true", "false"].includes(raw)) return fallback;
    value = raw === "1" || raw === "true";
  }
  return !allowed || allowed.includes(value as T) ? (value as T) : fallback;
}

export function writeQueryValue<T extends QueryValue>(
  params: URLSearchParams,
  key: string,
  value: T,
  fallback: T,
) {
  const next = new URLSearchParams(params);
  if (value === fallback) next.delete(key);
  else next.set(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  if (key !== "page") next.delete("page");
  return next;
}
