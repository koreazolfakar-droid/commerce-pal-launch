import { useLanguage } from "@/dashboard/i18n";

type Props = {
  title: string;
  brand: string;
  price: string;
  compareAt: string;
  stock: string;
  imageUrl: string;
  color?: string;
  storage?: string;
  status?: string;
};

function money(value: number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

/** Live, private preview of the storefront card while a new product is still unsaved. */
export default function ProductCreatePreview({
  title,
  brand,
  price,
  compareAt,
  stock,
  imageUrl,
  color,
  storage,
  status,
}: Props) {
  const { t } = useLanguage();
  const priceValue = Number(price);
  const compareValue = Number(compareAt);
  const hasPrice = price.trim() !== "" && Number.isFinite(priceValue) && priceValue > 0;
  const hasDiscount = hasPrice && compareAt.trim() !== "" && compareValue > priceValue;
  const discount = hasDiscount ? Math.round((1 - priceValue / compareValue) * 100) : 0;
  const inStock = Number(stock) > 0;
  const safeImage = /^(https:\/\/|blob:https?:\/\/)/i.test(imageUrl.trim()) ? imageUrl.trim() : "";

  return (
    <section
      aria-label={t("Live preview")}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h2 className="text-[13px] font-bold text-[#14203a]">{t("Live preview")}</h2>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          {t(status ?? "Unpublished")}
        </span>
      </div>
      <div className="p-5">
        <div className="mx-auto max-w-[220px] overflow-hidden rounded-xl border border-slate-100">
          <div className="relative grid aspect-square place-items-center bg-slate-50">
            {safeImage ? (
              <img
                src={safeImage}
                alt={title || t("Product image")}
                className="size-full object-contain"
              />
            ) : (
              <span className="text-[11px] text-slate-400">{t("No image yet")}</span>
            )}
            {hasDiscount ? (
              <span className="absolute start-2 top-2 rounded-md bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                -{discount}%
              </span>
            ) : null}
          </div>
          <div className="space-y-1 p-3">
            {brand ? (
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {brand}
              </div>
            ) : null}
            <div className="line-clamp-2 min-h-[2.5em] text-[12px] font-semibold text-[#14203a]">
              {title.trim() || t("Product name")}
            </div>
            {color || storage ? (
              <div className="text-xs text-slate-500">
                {[color, storage].filter(Boolean).join(" · ")}
              </div>
            ) : null}
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-bold text-[#14203a]">
                {hasPrice ? money(priceValue) : "—"}
              </span>
              {hasDiscount ? (
                <span className="text-[11px] text-slate-400 line-through">
                  {money(compareValue)}
                </span>
              ) : null}
            </div>
            <div
              className={`text-[10px] font-bold ${inStock ? "text-emerald-600" : "text-slate-400"}`}
            >
              {inStock ? t("In stock") : t("Out of stock")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
