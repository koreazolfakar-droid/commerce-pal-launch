export const PRODUCT_IMAGE_RESOLUTIONS = [
  { value: "1080", label: "1080 px" },
  { value: "1440", label: "1440 px" },
  { value: "1920", label: "1920 px" },
  { value: "2560", label: "2560 px" },
  { value: "3840", label: "3840 px (4K)" },
  { value: "original", label: "Original dimensions" },
] as const;

export type ProductImageResolution = (typeof PRODUCT_IMAGE_RESOLUTIONS)[number]["value"];

const STORAGE_KEY = "spacecall-product-image-resolution";
const COMPRESSION_STORAGE_KEY = "spacecall-image-compression-preset";
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_CANVAS_EDGE = 8192;

export const IMAGE_COMPRESSION_PRESETS = [
  { value: "light", label: "Light compression · 92% quality", quality: 0.92, description: "Best visual quality, larger file." },
  { value: "balanced", label: "Balanced · 86% quality", quality: 0.86, description: "Recommended for most storefront images." },
  { value: "strong", label: "Strong compression · 76% quality", quality: 0.76, description: "Smaller files with modest quality loss." },
  { value: "maximum", label: "Maximum compression · 65% quality", quality: 0.65, description: "Smallest file for non-critical artwork." },
] as const;

export type ImageCompressionPreset = (typeof IMAGE_COMPRESSION_PRESETS)[number]["value"];

export type ImageBackgroundRemovalOptions = {
  enabled: boolean;
  tolerance: number;
};

export const DEFAULT_LOGO_BACKGROUND_REMOVAL: Readonly<ImageBackgroundRemovalOptions> = {
  enabled: true,
  tolerance: 18,
};

function normalizeBackgroundRemovalOptions(
  value?: ImageBackgroundRemovalOptions,
): ImageBackgroundRemovalOptions {
  return {
    enabled: Boolean(value?.enabled),
    tolerance: Math.min(60, Math.max(4, Math.round(value?.tolerance ?? 18))),
  };
}

const conversionCache = new WeakMap<File, Map<string, Promise<ProductImageConversionResult>>>();

export function getProductImageResolution(): ProductImageResolution {
  if (typeof window === "undefined") return "1920";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return PRODUCT_IMAGE_RESOLUTIONS.some((option) => option.value === saved)
    ? (saved as ProductImageResolution)
    : "1920";
}

export function setProductImageResolution(value: ProductImageResolution) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, value);
}

export function getImageCompressionPreset(): ImageCompressionPreset {
  if (typeof window === "undefined") return "balanced";
  const saved = window.localStorage.getItem(COMPRESSION_STORAGE_KEY);
  return IMAGE_COMPRESSION_PRESETS.some((option) => option.value === saved)
    ? (saved as ImageCompressionPreset)
    : "balanced";
}

export const IMAGE_COMPRESSION_CHANGE_EVENT = "spacecall-image-compression-change";

export function setImageCompressionPreset(value: ImageCompressionPreset) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(COMPRESSION_STORAGE_KEY, value);
    window.dispatchEvent(
      new CustomEvent<ImageCompressionPreset>(IMAGE_COMPRESSION_CHANGE_EVENT, { detail: value }),
    );
  }
}

export function imageCompressionQuality(value: ImageCompressionPreset) {
  return IMAGE_COMPRESSION_PRESETS.find((option) => option.value === value)?.quality ?? 0.86;
}

export function formatImageBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected image could not be decoded."));
    };
    image.src = url;
  });
}

function removeEdgeConnectedWhiteBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  tolerance: number,
) {
  if (width <= 0 || height <= 0) return;

  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  const threshold = Math.max(180, 255 - tolerance);
  let head = 0;
  let tail = 0;

  const isBackgroundCandidate = (pixelIndex: number) => {
    const offset = pixelIndex * 4;
    // Already-transparent artwork does not need cleanup. Treat transparent
    // pixels as a hard boundary so genuine white marks on transparent PNGs
    // are never reached and erased by the flood fill.
    if (data[offset + 3] < 240) return false;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const minChannel = Math.min(red, green, blue);
    const maxChannel = Math.max(red, green, blue);
    return minChannel >= threshold && maxChannel - minChannel <= 24;
  };

  const enqueue = (pixelIndex: number) => {
    if (pixelIndex < 0 || pixelIndex >= pixelCount || visited[pixelIndex]) return;
    if (!isBackgroundCandidate(pixelIndex)) return;
    visited[pixelIndex] = 1;
    queue[tail++] = pixelIndex;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const pixelIndex = queue[head++];
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    if (x > 0) enqueue(pixelIndex - 1);
    if (x + 1 < width) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - width);
    if (y + 1 < height) enqueue(pixelIndex + width);
  }

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (visited[pixelIndex]) data[pixelIndex * 4 + 3] = 0;
  }

  // Fade one anti-aliased ring around the removed background. This avoids the
  // pale rectangle/halo common around JPG logos without erasing interior whites.
  const featherFloor = Math.max(160, threshold - 24);
  const soften = (pixelIndex: number) => {
    if (pixelIndex < 0 || pixelIndex >= pixelCount || visited[pixelIndex]) return;
    const offset = pixelIndex * 4;
    const alpha = data[offset + 3];
    if (alpha === 0) return;

    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const minChannel = Math.min(red, green, blue);
    const maxChannel = Math.max(red, green, blue);
    if (minChannel < featherFloor || maxChannel - minChannel > 28) return;

    const whiteness = Math.min(
      1,
      Math.max(0, (minChannel - featherFloor) / Math.max(1, threshold - featherFloor)),
    );
    data[offset + 3] = Math.round(alpha * (1 - whiteness * 0.85));
  };

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (!visited[pixelIndex]) continue;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    if (x > 0) soften(pixelIndex - 1);
    if (x + 1 < width) soften(pixelIndex + 1);
    if (y > 0) soften(pixelIndex - width);
    if (y + 1 < height) soften(pixelIndex + width);
  }

  context.putImageData(imageData, 0, 0);
}

function webpName(name: string) {
  const stem = name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return `${stem || "product-image"}.webp`;
}

export type ProductImageSourceInfo = {
  name: string;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
};

export type ProductImageConversionResult = {
  file: File;
  source: ProductImageSourceInfo;
  output: ProductImageSourceInfo;
};

export async function inspectProductImageSource(source: File): Promise<ProductImageSourceInfo> {
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
  if (!allowed.has(source.type)) throw new Error("Use JPG, PNG, WebP or AVIF images.");
  if (source.size <= 0) throw new Error("The selected image is empty.");
  if (source.size > MAX_SOURCE_BYTES) throw new Error("Image must be 20 MB or smaller.");

  const image = await loadImage(source);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) throw new Error("Invalid image dimensions.");

  return {
    name: source.name,
    mimeType: source.type,
    width,
    height,
    bytes: source.size,
  };
}

async function performProductImageConversion(
  source: File,
  resolution: ProductImageResolution,
  compression: ImageCompressionPreset,
  backgroundRemoval?: ImageBackgroundRemovalOptions,
): Promise<ProductImageConversionResult> {
  const sourceInfo = await inspectProductImageSource(source);
  const sourceWidth = sourceInfo.width;
  const sourceHeight = sourceInfo.height;
  const image = await loadImage(source);

  const requested =
    resolution === "original" ? Math.max(sourceWidth, sourceHeight) : Number(resolution);
  const maxEdge = Math.min(requested, MAX_CANVAS_EDGE);
  const longest = Math.max(sourceWidth, sourceHeight);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Image conversion is not supported in this browser.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  const normalizedBackgroundRemoval = normalizeBackgroundRemovalOptions(backgroundRemoval);
  if (normalizedBackgroundRemoval.enabled) {
    removeEdgeConnectedWhiteBackground(
      context,
      width,
      height,
      normalizedBackgroundRemoval.tolerance,
    );
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", imageCompressionQuality(compression)),
  );
  if (!blob) throw new Error("WebP conversion failed.");

  const file = new File([blob], webpName(source.name), {
    type: "image/webp",
    lastModified: Date.now(),
  });

  return {
    file,
    source: sourceInfo,
    output: {
      name: file.name,
      mimeType: file.type,
      width,
      height,
      bytes: file.size,
    },
  };
}

export async function convertProductImageToWebp(
  source: File,
  resolution: ProductImageResolution,
  compression: ImageCompressionPreset = getImageCompressionPreset(),
  backgroundRemoval?: ImageBackgroundRemovalOptions,
): Promise<ProductImageConversionResult> {
  let fileCache = conversionCache.get(source);
  if (!fileCache) {
    fileCache = new Map();
    conversionCache.set(source, fileCache);
  }

  const normalizedBackgroundRemoval = normalizeBackgroundRemovalOptions(backgroundRemoval);
  const backgroundKey = normalizedBackgroundRemoval.enabled
    ? `bg:${normalizedBackgroundRemoval.tolerance}`
    : "bg:none";
  const key = `${resolution}:${compression}:${backgroundKey}`;
  const cached = fileCache.get(key);
  if (cached) return cached;

  const conversion = performProductImageConversion(
    source,
    resolution,
    compression,
    normalizedBackgroundRemoval,
  );
  fileCache.set(key, conversion);
  try {
    return await conversion;
  } catch (error) {
    fileCache.delete(key);
    throw error;
  }
}
