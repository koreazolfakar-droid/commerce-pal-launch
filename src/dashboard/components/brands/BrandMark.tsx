import { Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { CatalogBrand } from "@/dashboard/data/brands";

export default function BrandMark({
  brand,
  className = "size-11",
}: {
  brand: CatalogBrand;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageShape, setImageShape] = useState<"square" | "wide" | "tall">("square");

  useEffect(() => {
    setImageFailed(false);
    setImageShape("square");
  }, [brand.logo]);
  const initials = brand.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span
      className={
        "grid shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-100 bg-white text-[12px] font-black text-slate-600 shadow-sm sm:text-[11px] " +
        className
      }
    >
      {brand.logo && !imageFailed ? (
        <img
          src={brand.logo}
          alt={`${brand.name} logo`}
          className={
            "object-contain transition-transform " +
            (imageShape === "wide"
              ? "max-h-[52%] max-w-[90%]"
              : imageShape === "tall"
                ? "max-h-[82%] max-w-[62%]"
                : "max-h-[76%] max-w-[76%]")
          }
          onLoad={(event) => {
            const image = event.currentTarget;
            const ratio = image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : 1;
            setImageShape(ratio >= 1.8 ? "wide" : ratio <= 0.78 ? "tall" : "square");
          }}
          onError={() => setImageFailed(true)}
        />
      ) : initials ? (
        initials
      ) : (
        <Building2 className="size-4" />
      )}
    </span>
  );
}
