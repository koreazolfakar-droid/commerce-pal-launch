import { useLanguage } from "@/lib/i18n";
import { useEffect, useRef, useState, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

import { cdnImage, cdnSrcSet } from "@/lib/image";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  url: string;
  altText: string | null;
}

/**
 * Product image stage + thumbnail rail + lightbox.
 * Images are always the real Shopify media, rendered with object-contain so
 * nothing is cropped or stretched. Mobile uses a slightly shorter stage to
 * surface purchasing controls earlier while keeping the product visually large.
 */
export function ProductGallery({
  images,
  title,
  activeIndex,
  onSelect,
  badge,
  compact = false,
}: {
  images: GalleryImage[];
  title: string;
  activeIndex: number;
  onSelect: (index: number) => void;
  badge?: React.ReactNode;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const [zoomed, setZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const index = images.length > 0 ? Math.min(activeIndex, images.length - 1) : 0;
  const image = images[index];

  const step = (delta: number) => {
    if (images.length < 2) return;
    onSelect((index + delta + images.length) % images.length);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start == null || end == null || images.length < 2) return;
    const distance = start - end;
    if (Math.abs(distance) < 48) return;
    step(distance > 0 ? 1 : -1);
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
    <div
      className={cn(
        "min-w-0",
        !compact && "lg:sticky lg:top-24 lg:self-start",
        !compact && images.length > 1 && "lg:grid lg:grid-cols-[5.25rem_minmax(0,1fr)] lg:gap-3",
      )}
    >
      <div
        className="group relative aspect-square touch-pan-y overflow-hidden rounded-2xl bg-image-stage/60 sm:rounded-[1.25rem] sm:bg-image-stage lg:order-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
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
            draggable={false}
            className="h-full w-full select-none object-contain p-1.5 transition-transform duration-300 sm:p-4 lg:p-8"
          />
        ) : (
          <div className="grid h-full place-items-center px-4 text-center text-sm text-muted-foreground">
            {t("galleryEmpty")}
          </div>
        )}

        {badge}

        {image && !compact && (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label={t("galleryZoom")}
            className="press absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-xl border border-border/60 bg-background/85 text-foreground shadow-sm backdrop-blur transition-[border-color,background-color] hover:border-primary/40 hover:bg-background sm:bottom-4 sm:right-4 sm:h-11 sm:w-11"
          >
            <Expand className="h-4 w-4" />
          </button>
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={t("galleryPrevious")}
              className="press absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-xl border border-border/60 bg-background/85 text-foreground shadow-sm backdrop-blur transition-[border-color,background-color] hover:border-primary/40 hover:bg-background sm:grid"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={t("galleryNext")}
              className="press absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-xl border border-border/60 bg-background/85 text-foreground shadow-sm backdrop-blur transition-[border-color,background-color] hover:border-primary/40 hover:bg-background sm:grid"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && !compact && (
        <div
          className="mt-3 flex items-center justify-center gap-1.5 sm:hidden"
          role="group"
          aria-label={t("galleryImages")}
        >
          {images.map((dot, dotIndex) => (
            <button
              key={`${dot.url}-mobile-dot-${dotIndex}`}
              type="button"
              onClick={() => onSelect(dotIndex)}
              aria-label={`${t("galleryImage")} ${dotIndex + 1} ${t("ofLabel")} ${images.length}`}
              aria-current={dotIndex === index ? "true" : undefined}
              className={cn(
                "h-2 rounded-full transition-[width,background-color]",
                dotIndex === index ? "w-5 bg-primary" : "w-2 bg-border",
              )}
            />
          ))}
        </div>
      )}

      {images.length > 1 && (
        <div
          className={cn(
            "scroll-rail mt-3 gap-2 overflow-x-auto",
            compact ? "flex" : "hidden sm:flex",
            !compact && "lg:order-1 lg:mt-0 lg:flex-col lg:overflow-visible",
          )}
          role="group"
          aria-label={t("galleryImages")}
        >
          {images.map((thumb, thumbIndex) => (
            <button
              key={`${thumb.url}-${thumbIndex}`}
              type="button"
              aria-pressed={thumbIndex === index}
              aria-label={`${t("galleryImage")} ${thumbIndex + 1} ${t("ofLabel")} ${images.length}`}
              onClick={() => onSelect(thumbIndex)}
              className={cn(
                "press h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 bg-image-stage transition-[border-color,box-shadow] sm:h-20 sm:w-20",
                thumbIndex === index
                  ? "border-primary shadow-sm"
                  : "border-border hover:border-primary/50",
              )}
            >
              <img
                src={cdnImage(thumb.url, 160)}
                alt=""
                loading="lazy"
                decoding="async"
                width={80}
                height={80}
                draggable={false}
                className="h-full w-full select-none object-contain p-1.5"
              />
            </button>
          ))}
        </div>
      )}

      {zoomed && image && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — ${t("galleryEnlarged")}`}
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/80 p-4 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
        >
          <div
            className="relative max-h-full w-full max-w-4xl overflow-hidden rounded-lg border bg-image-stage shadow-float"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={cdnImage(image.url, 1400)}
              alt={image.altText ?? title}
              draggable={false}
              className="mx-auto max-h-[84vh] w-full select-none object-contain p-4 sm:p-6"
            />
            <button
              type="button"
              onClick={() => setZoomed(false)}
              aria-label={t("galleryClose")}
              className="press absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-card transition-colors hover:border-primary/40 sm:right-4 sm:top-4"
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
