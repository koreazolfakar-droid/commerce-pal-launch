// This code executes in the Edge runtime with access to private services.
// Never fetch a customer/CMS-supplied URL unless it is a first-party public
// object URL. Header MIME types and Content-Length are untrusted.
export const MAX_HERO_SOURCE_BYTES = 12 * 1024 * 1024;
export const HERO_SOURCE_TIMEOUT_MS = 8_000;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "image/avif", "image/heic", "image/heif",
]);

export function validateHeroSourceUrl(raw: string, projectUrl: string): URL {
  let asset: URL;
  let project: URL;
  try {
    asset = new URL(raw);
    project = new URL(projectUrl);
  } catch {
    throw new Error("hero_source_url_invalid");
  }

  // An exact origin match avoids suffix tricks (supabase.co.attacker.test),
  // localhost/metadata service fetches, credential URLs, custom ports and
  // server-side DNS rebinding through arbitrary external domains.
  if (
    asset.protocol !== "https:" ||
    project.protocol !== "https:" ||
    asset.origin !== project.origin ||
    asset.username || asset.password ||
    asset.search || asset.hash ||
    asset.pathname.includes("%") ||
    !asset.pathname.startsWith("/storage/v1/object/public/cms-media/")
  ) {
    throw new Error("hero_source_not_trusted_storage");
  }
  const objectPath = asset.pathname.slice("/storage/v1/object/public/cms-media/".length);
  if (!objectPath || objectPath.includes("//") || objectPath.split("/").some((p) => p === "." || p === "..")) {
    throw new Error("hero_source_not_trusted_storage");
  }
  return asset;
}

function hasRasterSignature(bytes: Uint8Array, type: string): boolean {
  if (bytes.length < 12) return false;
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));
  switch (type) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return [137, 80, 78, 71, 13, 10, 26, 10].every((x, i) => bytes[i] === x);
    case "image/gif":
      return ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a";
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP";
    case "image/avif":
      return ascii(4, 4) === "ftyp" && ["avif", "avis"].includes(ascii(8, 4));
    case "image/heic":
    case "image/heif":
      return ascii(4, 4) === "ftyp" &&
        ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(ascii(8, 4));
    default:
      return false;
  }
}

export async function fetchTrustedHeroImage(
  source: string,
  projectUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<{ blob: Blob; type: string }> {
  // Validate before any outbound network request, not after redirects.
  const destination = validateHeroSourceUrl(source, projectUrl);
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), HERO_SOURCE_TIMEOUT_MS);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  try {
    const response = await fetcher(destination, {
      method: "GET",
      redirect: "manual", // never follow a 30x to an internal or attacker host
      signal: abort.signal,
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/heic,image/heif" },
    });
    if (response.status >= 300 && response.status < 400) {
      throw new Error("hero_source_redirect_rejected");
    }
    if (response.status !== 200) throw new Error("hero_source_http_error");

    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(type)) throw new Error("hero_source_unsafe_image_type");

    const claimedBytes = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(claimedBytes) && claimedBytes > MAX_HERO_SOURCE_BYTES) {
      throw new Error("hero_source_too_large");
    }

    if (!response.body) throw new Error("hero_source_body_missing");
    reader = response.body.getReader();
    const parts: Uint8Array<ArrayBuffer>[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      total += value.byteLength;
      if (total > MAX_HERO_SOURCE_BYTES) throw new Error("hero_source_too_large");
      // Copy the returned chunk so the stored bytes cannot be mutated by
      // a reused streaming buffer while another chunk is being read.
      const copy = new Uint8Array(value.byteLength);
      copy.set(value);
      parts.push(copy);
    }
    if (total === 0) throw new Error("hero_source_empty");

    const signature = new Uint8Array(Math.min(total, 32));
    let signatureBytes = 0;
    for (const part of parts) {
      const n = Math.min(part.length, signature.length - signatureBytes);
      signature.set(part.subarray(0, n), signatureBytes);
      signatureBytes += n;
      if (signatureBytes >= signature.length) break;
    }
    if (!hasRasterSignature(signature, type)) throw new Error("hero_source_bad_signature");

    return { blob: new Blob(parts, { type }), type };
  } finally {
    clearTimeout(timer);
    if (reader) {
      // This releases the stream on both success and failure; rejected cancel
      // promises are ignored to avoid masking the original security error.
      try { await reader.cancel(); } catch { /* already finished/cancelled */ }
    }
    abort.abort();
  }
}
