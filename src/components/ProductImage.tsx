import { cdnImage, cdnSrcSet } from "@/lib/image";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useState } from "react";

/**
 * Shared product image area for every normal product card.
 * Guarantees a fixed square container, theme-aware image-stage backdrop, centred product,
 * preserved aspect ratio (object-contain) and a normalized visual scale so
 * source images with different canvas sizes still look the same size.
 */
export function ProductImage({
  url,
  alt,
  size = 480,
  sizes,
  eager = false,
  className,
  imageClassName,
}: {
  url?: string | undefined;
  alt: string;
  size?: number;
  sizes?: string;
  eager?: boolean;
  className?: string;
  imageClassName?: string;
}) {
  const { t } = useLanguage();
  const [failedUrl, setFailedUrl] = useState<string>();
  return (
    <div className={cn("relative isolate aspect-square w-full overflow-hidden bg-image-stage", className)}>
      {url && failedUrl !== url ? (
        <img
          src={cdnImage(url, size)}
          srcSet={cdnSrcSet(url, size)}
          sizes={sizes}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          width={size}
          height={size}
          draggable={false}
          onError={() => setFailedUrl(url)}
          className={cn(
            "absolute inset-0 h-full w-full select-none object-contain p-[8%] transition-transform duration-500 sm:p-[9%]",
            imageClassName,
          )}
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center px-3 text-center text-xs text-neutral-400">
          {t("galleryEmpty")}
        </span>
      )}
    </div>
  );
}
