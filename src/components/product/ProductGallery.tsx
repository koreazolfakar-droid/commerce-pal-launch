import { useLanguage } from "@/lib/i18n";
import { useRef, useState, type ImgHTMLAttributes, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

import { productImageSource } from "@/lib/image";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  url: string;
  thumbnailUrl?: string;
  altText: string | null;
}

function GalleryMedia({
  url,
  fallbackUrl,
  placeholder,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & {
  url?: string;
  fallbackUrl?: string;
  placeholder?: string;
}) {
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const source = productImageSource(url, fallbackUrl, failedUrls);
  const markFailed = () => {
    if (source)
      setFailedUrls((current) => (current.includes(source) ? current : [...current, source]));
  };

  return source ? (
    <img
      {...props}
      key={source}
      src={source}
      draggable={false}
      decoding="async"
      ref={(element) => {
        if (element?.complete && element.naturalWidth === 0) markFailed();
      }}
      onError={markFailed}
    />
  ) : placeholder ? (
    <span className="grid h-full min-h-32 place-items-center px-4 text-center text-sm text-muted-foreground">
      {placeholder}
    </span>
  ) : null;
}

/**
 * Product image stage + thumbnail rail + lightbox.
 * Images are always the real catalog media, rendered with object-contain so
 * nothing is cropped or stretched. Product pages use swipe plus a compact
 * thumbnail filmstrip on mobile, while desktop keeps a vertical thumbnail rail.
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
  const { t, direction } = useLanguage();
  const [zoomed, setZoomed] = useState(false);
  const zoomDialog = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const nextDirection = direction === "rtl" ? -1 : 1;
  const index = images.length > 0 ? Math.min(activeIndex, images.length - 1) : 0;
  const image = images[index];

  const step = (delta: number) => {
    if (images.length < 2) return;
    onSelect((index + delta + images.length) % images.length);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStart.current = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    const end = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !end || images.length < 2) return;
    const distance = start.x - end.clientX;
    if (Math.abs(distance) < 48 || Math.abs(distance) <= Math.abs(start.y - end.clientY)) return;
    step(Math.sign(distance) * nextDirection);
  };

  return (
    <div
      className={cn(
        "min-w-0",
        !compact && "lg:sticky lg:top-24 lg:self-start",
        !compact && images.length > 1 && "lg:grid lg:grid-cols-[4.75rem_minmax(0,1fr)] lg:gap-4",
      )}
    >
      <div
        className={cn(
          "relative aspect-[1/0.82] touch-pan-y overflow-hidden rounded-xl bg-image-stage sm:aspect-square sm:rounded-2xl lg:order-2",
          !compact && "border border-border/70 max-sm:aspect-[4/3]",
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          touchStart.current = null;
        }}
      >
        <GalleryMedia
          url={image?.url}
          fallbackUrl={image?.thumbnailUrl}
          placeholder={t("galleryEmpty")}
          alt={image?.altText || title}
          fetchPriority={compact ? "auto" : "high"}
          width={900}
          height={900}
          className="h-full w-full select-none object-contain p-2 transition-transform duration-300 sm:p-4 lg:p-7"
        />

        {badge}

        {images.length > 1 && !compact && (
          <div
            data-testid="product-gallery-counter"
            className="pointer-events-none absolute end-3 top-3 rounded-lg border border-border/50 bg-background/88 px-2 py-1 text-[11px] font-semibold tabular-nums text-foreground shadow-sm backdrop-blur sm:end-4 sm:top-4"
            dir="ltr"
          >
            {index + 1} / {images.length}
          </div>
        )}

        {image && !compact && (
          <button
            type="button"
            onClick={() => {
              zoomDialog.current?.showModal();
              setZoomed(true);
            }}
            aria-label={t("galleryZoom")}
            className="press absolute bottom-3 end-3 grid h-11 w-11 place-items-center rounded-xl border border-border/60 bg-background/85 text-foreground shadow-sm backdrop-blur transition-[border-color,background-color] hover:border-primary/40 hover:bg-background sm:bottom-4 sm:end-4"
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
              className="press absolute start-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-xl border border-border/60 bg-background/85 text-foreground shadow-sm backdrop-blur transition-[border-color,background-color] hover:border-primary/40 hover:bg-background sm:grid"
            >
              <ChevronLeft aria-hidden className="h-4 w-4 rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={t("galleryNext")}
              className="press absolute end-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-xl border border-border/60 bg-background/85 text-foreground shadow-sm backdrop-blur transition-[border-color,background-color] hover:border-primary/40 hover:bg-background sm:grid"
            >
              <ChevronRight aria-hidden className="h-4 w-4 rtl:rotate-180" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div
          data-testid={compact ? undefined : "product-gallery-thumbnails"}
          className={cn(
            "scroll-rail mt-3 flex snap-x gap-2 overflow-x-auto pb-1",
            compact ? "" : "px-0.5 sm:mt-3",
            !compact &&
              "lg:order-1 lg:mt-0 lg:max-h-[34rem] lg:snap-none lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:px-0 lg:pb-0",
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
              data-gallery-index={thumbIndex}
              className={cn(
                "press h-14 w-14 shrink-0 snap-center overflow-hidden rounded-lg border bg-image-stage transition-[border-color,box-shadow,opacity] sm:h-16 sm:w-16 lg:h-[4.75rem] lg:w-[4.75rem]",
                thumbIndex === index
                  ? "border-primary ring-1 ring-primary/20 opacity-100"
                  : "border-border/60 opacity-70 hover:border-primary/40 hover:opacity-100",
              )}
            >
              <GalleryMedia
                url={thumb.thumbnailUrl ?? thumb.url}
                fallbackUrl={thumb.url}
                alt=""
                loading="lazy"
                fetchPriority="low"
                width={80}
                height={80}
                className="h-full w-full select-none object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}

      {!compact && image && (
        <dialog
          ref={zoomDialog}
          aria-label={`${title} — ${t("galleryEnlarged")}`}
          className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl overflow-auto rounded-xl border border-border bg-image-stage p-0 shadow-float backdrop:bg-black/75"
          onClose={() => setZoomed(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) event.currentTarget.close();
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") step(nextDirection);
            if (event.key === "ArrowLeft") step(-nextDirection);
          }}
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => zoomDialog.current?.close()}
              aria-label={t("galleryClose")}
              className="press absolute end-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-xl border border-border bg-card text-foreground transition-colors hover:border-primary/40"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
            {zoomed && (
              <GalleryMedia
                url={image.url}
                fallbackUrl={image.thumbnailUrl}
                placeholder={t("galleryEmpty")}
                alt={image.altText || title}
                className="mx-auto max-h-[calc(100dvh-2rem)] w-full select-none object-contain p-4 sm:p-6"
              />
            )}
            {images.length > 1 && (
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label={t("galleryPrevious")}
                  className="press grid h-11 w-11 place-items-center rounded-xl border border-border bg-card text-foreground"
                >
                  <ChevronLeft aria-hidden className="h-4 w-4 rtl:rotate-180" />
                </button>
                <span
                  dir="ltr"
                  aria-live="polite"
                  className="rounded-lg bg-card px-3 py-2 text-xs tabular-nums text-foreground"
                >
                  {index + 1} / {images.length}
                </span>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label={t("galleryNext")}
                  className="press grid h-11 w-11 place-items-center rounded-xl border border-border bg-card text-foreground"
                >
                  <ChevronRight aria-hidden className="h-4 w-4 rtl:rotate-180" />
                </button>
              </div>
            )}
          </div>
        </dialog>
      )}
    </div>
  );
}
