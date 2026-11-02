type PreviewInput = {
  title: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  handle?: string;
  origin?: string;
};

export function productSearchPreview(input: PreviewInput) {
  const plain = (value: string) =>
    value
      .replace(/<[^>]*>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return {
    title: plain(input.seoTitle?.trim() || input.title),
    description: plain(input.seoDescription?.trim() || input.description || ""),
    url: `${(input.origin || "https://www.spacecallapp.store").replace(/\/+$/, "")}/product/${input.handle ? encodeURIComponent(input.handle) : "…"}`,
  };
}
