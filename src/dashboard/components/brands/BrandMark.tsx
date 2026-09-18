import { Building2 } from "lucide-react";
import type { CatalogBrand } from "@/dashboard/data/brands";

export default function BrandMark({
  brand,
  className = "size-11",
}: {
  brand: CatalogBrand;
  className?: string;
}) {
  const initials = brand.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span
      className={
        "grid shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-100 bg-white text-[10px] font-black text-slate-600 shadow-sm " +
        className
      }
    >
      {brand.logo ? (
        <img src={brand.logo} alt="" className="size-full object-contain p-1.5" />
      ) : initials ? (
        initials
      ) : (
        <Building2 className="size-4" />
      )}
    </span>
  );
}
