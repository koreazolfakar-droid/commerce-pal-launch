import { cdnImage, cdnSrcSet } from "@/lib/image";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useState } from "react";

/**
 * Shared product image area for every normal product card.
 * Uses one consistent soft-square/squircle stage so product artwork never looks
 * trapped in a harsh box or mismatched against the rounded storefront controls.
 * Product artwork stays centred, uncropped and visually balanced across cards.
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
    <div
      className={cn(
        "relative isolate aspect-square w-full overflow-hidden rounded-[1.35rem] border border-border/55 bg-image-stage",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[5%] rounded-[1.1rem] bg-surface/35"
      />

      {url && failedUrl !== url ? (
        <img
          src={cdnImage(url, size)}
          srcSet={cdnSrcSet(url, size)}
          sizes={sizes}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "low"}
          decoding="async"
          width={size}
          height={size}
          draggable={false}
          onError={() => setFailedUrl(url)}
          className={cn(
            "absolute inset-0 z-10 h-full w-full select-none object-contain p-[7%] transition-transform duration-500 sm:p-[8%]",
            imageClassName,
          )}
        />
      ) : (
        <span className="absolute inset-0 z-10 grid place-items-center px-3 text-center text-xs text-neutral-400">
          {t("galleryEmpty")}
        </span>
      )}
    </div>
  );
}
