import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

import { cdnImage, cdnSrcSet } from "@/lib/image";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  url: string;
  altText: string | null;
}

/**
 * Product image stage + thumbnail rail + lightbox.
 * Images are always the real Shopify media, rendered on a fixed square stage
 * with object-contain so nothing is cropped or stretched.
 */
export function ProductGallery({
  images,
  title,
  activeIndex,
  onSelect,
  badge,
}: {
  images: GalleryImage[];
  title: string;
  activeIndex: number;
  onSelect: (index: number) => void;
  badge?: React.ReactNode;
}) {
  const [zoomed, setZoomed] = useState(false);
  const index = images.length > 0 ? Math.min(activeIndex, images.length - 1) : 0;
  const image = images[index];

  const step = (delta: number) => {
    if (images.length < 2) return;
    onSelect((index + delta + images.length) % images.length);
  };

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomed(false);
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomed, index, images.length]);

  return (
    <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <div className="group relative aspect-square overflow-hidden rounded-3xl border bg-white shadow-card">
        {image ? (
          <img
            src={cdnImage(image.url, 900)}
            srcSet={cdnSrcSet(image.url, 900)}
            sizes="(min-width: 1024px) 560px, 92vw"
            alt={image.altText ?? title}
            fetchPriority="high"
            decoding="async"
            width={900}
            height={900}
            className="h-full w-full object-contain p-6 sm:p-10"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            No image available
          </div>
        )}

        {badge}

        {image && (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label="Zoom image"
            className="press absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full border border-border bg-card/90 text-foreground shadow-card backdrop-blur transition-opacity"
          >
            <Expand className="h-4 w-4" />
          </button>
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous image"
              className="press absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-card/90 text-foreground shadow-card backdrop-blur"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next image"
              className="press absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-card/90 text-foreground shadow-card backdrop-blur"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="scroll-rail mt-3 flex gap-2.5 overflow-x-auto" role="tablist" aria-label="Product images">
          {images.map((thumb, thumbIndex) => (
            <button
              key={`${thumb.url}-${thumbIndex}`}
              type="button"
              role="tab"
              aria-selected={thumbIndex === index}
              aria-label={`View image ${thumbIndex + 1} of ${images.length}`}
              onClick={() => onSelect(thumbIndex)}
              className={cn(
                "press h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 bg-white transition-colors sm:h-20 sm:w-20",
                thumbIndex === index ? "border-primary" : "border-border hover:border-primary/50",
              )}
            >
              <img
                src={cdnImage(thumb.url, 160)}
                alt=""
                loading="lazy"
                decoding="async"
                width={80}
                height={80}
                className="h-full w-full object-contain p-1.5"
              />
            </button>
          ))}
        </div>
      )}

      {zoomed && image && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} enlarged image`}
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/80 p-4 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
        >
          <div
            className="relative max-h-full w-full max-w-3xl overflow-hidden rounded-3xl border bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={cdnImage(image.url, 1400)}
              alt={image.altText ?? title}
              className="mx-auto max-h-[80vh] w-full object-contain p-6"
            />
            <button
              type="button"
              onClick={() => setZoomed(false)}
              aria-label="Close zoom"
              className="press absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground shadow-card"
            >
              <X className="h-4 w-4" />
            </button>
            {images.length > 1 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
                {images.map((dot, dotIndex) => (
                  <span
                    key={`${dot.url}-dot-${dotIndex}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      dotIndex === index ? "w-6 bg-primary" : "w-1.5 bg-border",
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
