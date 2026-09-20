import { cdnImage, cdnSrcSet } from "@/lib/image";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useState } from "react";

/**
 * Shared product image area for every normal product card.
 * Product media always sits on a pure white, edge-to-edge stage in both light
 * and dark themes so transparent Shopify artwork stays visually consistent.
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
  const [responsiveFailedUrl, setResponsiveFailedUrl] = useState<string>();
  const responsiveSrcSet = responsiveFailedUrl === url ? undefined : cdnSrcSet(url, size);

  return (
    <div
      className={cn(
        "relative isolate aspect-square w-full overflow-hidden !rounded-none !border-0 !bg-white",
        className,
      )}
    >
      {url && failedUrl !== url ? (
        <img
          key={`${url}:${responsiveFailedUrl === url ? "original" : "responsive"}`}
          src={cdnImage(url, size)}
          srcSet={responsiveSrcSet}
          sizes={sizes}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "low"}
          decoding="async"
          width={size}
          height={size}
          draggable={false}
          onError={() => {
            if (responsiveSrcSet) {
              setResponsiveFailedUrl(url);
              return;
            }
            setFailedUrl(url);
          }}
          className={cn(
            "absolute inset-0 z-10 h-full w-full select-none bg-white object-contain p-[7%] transition-transform duration-500 sm:p-[8%]",
            imageClassName,
          )}
        />
      ) : (
        <span className="absolute inset-0 z-10 grid place-items-center bg-white px-3 text-center text-xs text-neutral-500">
          {t("galleryEmpty")}
        </span>
      )}
    </div>
  );
}
