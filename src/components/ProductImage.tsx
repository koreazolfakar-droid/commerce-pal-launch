import { cdnImage, cdnSrcSet } from "@/lib/image";
import { cn } from "@/lib/utils";

/**
 * Shared product image area for every normal product card.
 * Guarantees a fixed square container, pure white backdrop, centred product,
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
  url?: string;
  alt: string;
  size?: number;
  sizes?: string;
  eager?: boolean;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden bg-white",
        className,
      )}
    >
      {url ? (
        <img
          src={cdnImage(url, size)}
          srcSet={cdnSrcSet(url, size)}
          sizes={sizes}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          width={size}
          height={size}
          className={cn(
            "absolute inset-0 m-auto max-h-[82%] max-w-[82%] object-contain transition-transform duration-500",
            imageClassName,
          )}
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-xs text-neutral-400">
          No image
        </span>
      )}
    </div>
  );
}
