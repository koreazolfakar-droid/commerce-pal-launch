import { cdnImage, cdnSrcSet } from "@/lib/image";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useState } from "react";

/**
 * Shared product image area for every normal product card.
 * Product media sits on the shared semantic image stage so catalogue artwork
 * stays consistent while light and dark themes can tune the surrounding contrast.
 * The stage intentionally has no inner border or rounded frame; the parent card
 * owns clipping/radius while the product artwork stays centred and uncropped.
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
        "relative isolate aspect-square w-full overflow-hidden !rounded-none !border-0 !bg-image-stage",
        className,
      )}
    >
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
            "absolute inset-0 z-10 h-full w-full select-none bg-image-stage object-contain object-center p-[5%] transition-transform duration-500 sm:p-[6%]",
            imageClassName,
          )}
        />
      ) : (
        <span className="absolute inset-0 z-10 grid place-items-center bg-image-stage px-3 text-center text-xs text-neutral-500">
          {t("galleryEmpty")}
        </span>
      )}
    </div>
  );
}
