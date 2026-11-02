export function safeStoreHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || raw.length > 2048) return null;

  // A leading slash followed by a backslash is interpreted by browsers as
  // a protocol-relative cross-origin URL. Reject path separators/control
  // characters that URL parsers can silently normalize into another origin.
  if (/[\\\u0000-\u001F\u007F]/u.test(raw) || /%(?:5c|0[0ad]|7f)/i.test(raw)) return null;

  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  if (raw.startsWith("#")) return raw;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function safeHttpsUrl(value: unknown): string | null {
  const href = safeStoreHref(value);
  if (!href || href.startsWith("/") || href.startsWith("#")) return null;
  try {
    const parsed = new URL(href);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
