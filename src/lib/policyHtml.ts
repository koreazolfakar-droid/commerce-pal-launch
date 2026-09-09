import sanitizeHtml from "sanitize-html";

/** An allowlist parser, shared by SSR and server functions. No regex-only HTML filtering. */
export function sanitizePolicyHtml(body: string): string {
  return sanitizeHtml(body, {
    allowedTags: [
      "h2",
      "h3",
      "h4",
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "blockquote",
      "a",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ],
    allowedAttributes: {
      a: ["href", "title"],
      th: ["scope", "colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowProtocolRelative: false,
    transformTags: { h1: "h2" },
  });
}
