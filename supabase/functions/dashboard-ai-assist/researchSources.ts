import { modelIdentifiers } from "./modelIdentity.ts";

export type OfficialPage = { title: string; url: string; content: string };
const domains = [
  "samsung.com", "apple.com", "hihonor.com", "honor.com", "mi.com",
  "xiaomi.com", "google.com", "motorola.com", "sony.com", "asus.com",
  "lenovo.com", "oneplus.com", "oppo.com", "vivo.com", "realme.com",
  "huawei.com", "nokia.com", "hmd.com", "hp.com", "dell.com", "acer.com",
  "microsoft.com", "nintendo.com", "playstation.com",
];

function safeOfficialUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase().replace(/\.$/, "");
    if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return "";
    if (!domains.some((d) => host === d || host.endsWith("." + d))) return "";
    u.hash = "";
    return u.toString();
  } catch { return ""; }
}
function matchesModel(query: string, candidate: string): boolean {
  const expected = modelIdentifiers(query);
  const actual = modelIdentifiers(candidate);
  return expected.length > 0 && expected.every((id) => actual.includes(id));
}
function deHtml(html: string) {
  return html
    .replace(/<(script|style|noscript|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|amp|quot|lt|gt);/gi, " ")
    .replace(/\s+/g, " ").trim();
}
async function readHtml(url: string, fetcher: typeof fetch): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const r = await fetcher(url, {
      method: "GET",
      redirect: "manual", // Do not follow to a private address.
      signal: controller.signal,
      headers: { Accept: "text/html" },
    });
    if (!r.ok || !/text\/html/i.test(r.headers.get("content-type") ?? "")) return "";
    if (Number(r.headers.get("content-length") ?? 0) > 500000 || !r.body) return "";
    const reader = r.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > 500000) { await reader.cancel(); return ""; }
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(length);
    let cursor = 0;
    for (const chunk of chunks) { bytes.set(chunk, cursor); cursor += chunk.byteLength; }
    return new TextDecoder().decode(bytes);
  } finally { clearTimeout(timeout); }
}

/** Optional free/paid search-provider key; never exposed to browser. */
async function discover(query: string, apiKey: string, fetcher: typeof fetch): Promise<string[]> {
  if (!apiKey) return [];
  const brand: Record<string, string> = {
    samsung: "samsung.com", honor: "hihonor.com", xiaomi: "mi.com",
    redmi: "mi.com", apple: "apple.com", google: "google.com",
    sony: "sony.com", huawei: "huawei.com",
  };
  const firstWord = query.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  const site = brand[firstWord] ? " site:" + brand[firstWord] : " official manufacturer";
  const endpoint = "https://api.search.brave.com/res/v1/web/search?" +
    new URLSearchParams({ q: query.slice(0, 150) + site, count: "5" });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const r = await fetcher(endpoint, {
      signal: controller.signal,
      headers: { "X-Subscription-Token": apiKey, Accept: "application/json" },
    });
    if (!r.ok) return [];
    const json = await r.json() as { web?: { results?: Array<{ title?: string; url?: string }> } };
    return (json.web?.results ?? [])
      .filter((item) => matchesModel(query, (item.title ?? "") + " " + (item.url ?? "")))
      .map((item) => safeOfficialUrl(item.url ?? "")).filter(Boolean).slice(0, 3);
  } catch { return []; }
  finally { clearTimeout(timeout); }
}

/** Only independently fetched, model-matched official pages are returned. */
export async function officialProductResearch(args: {
  query: string;
  referenceUrls: string[];
  braveKey?: string;
  fetcher?: typeof fetch;
}): Promise<OfficialPage[]> {
  if (!modelIdentifiers(args.query).length) return [];
  const fetcher = args.fetcher ?? fetch;
  const discovered = await discover(args.query, args.braveKey ?? "", fetcher);
  const targets = [...new Set([...args.referenceUrls, ...discovered]
    .map(safeOfficialUrl).filter(Boolean))].slice(0, 3);
  const pages: OfficialPage[] = [];
  for (const url of targets) {
    try {
      const html = await readHtml(url, fetcher);
      if (!html) continue;
      const title = deHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
      if (!matchesModel(args.query, title + " " + new URL(url).pathname)) continue;
      const description = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)/i)?.[1] ?? "";
      const content = [title, description, deHtml(html)].join("\n").slice(0, 14000);
      pages.push({ title: title.slice(0, 240), url, content });
      if (pages.length === 2) break;
    } catch { /* no verified source on retrieval failure */ }
  }
  return pages;
}

export function sourceContainsExactValue(source: string, value: string): boolean {
  const v = value.normalize("NFKC").trim().toLowerCase();
  if (v.length < 3 || v.length > 300) return false;
  const escaped = v.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
  return new RegExp("(^|[^\\p{L}\\p{N}])" + escaped + "(?=$|[^\\p{L}\\p{N}])", "iu")
    .test(source.normalize("NFKC").toLowerCase());
}
