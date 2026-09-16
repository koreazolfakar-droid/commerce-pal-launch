import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Headphones, Smartphone, Watch } from "lucide-react";

import { DashboardCard } from "@/dashboard/components/DashboardCard";
import type { BrandPerformance, InventorySummary, ProductPerformance } from "@/dashboard/types/dashboard";
import { formatPrice } from "@/lib/productPricing";

export function TopSellingProductsCard({
  products,
  currency,
  language,
}: {
  products: ProductPerformance[];
  currency: string;
  language: "ar" | "en";
}) {
  return (
    <DashboardCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3.5">
        <h2 className="text-[13px] font-black">{language === "ar" ? "المنتجات الأكثر مبيعاً" : "Top Selling Products"}</h2>
        <Link to="/dashboard/products" className="text-[10px] font-bold text-primary hover:underline">{language === "ar" ? "عرض الكل ←" : "View All →"}</Link>
      </div>
      <div className="divide-y divide-border/50">
        {products.length ? products.map((product, index) => (
          <div key={product.id} className="grid grid-cols-[20px_38px_minmax(0,1fr)_auto] items-center gap-2.5 px-4 py-2.5">
            <span className="text-center text-[10px] font-black text-muted-foreground">{index + 1}</span>
            <span className="grid size-9 place-items-center overflow-hidden rounded-lg border border-border/60 bg-white p-1.5">
              {product.imageUrl ? <img src={product.imageUrl} alt="" className="size-full object-contain" loading="lazy" /> : <Smartphone className="size-4 text-slate-400" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold">{product.name}</p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">{product.unitsSold} {language === "ar" ? "مباع" : "sold"}</p>
            </div>
            <span className="text-[11px] font-black">{formatPrice(product.price, currency)}</span>
          </div>
        )) : (
          <div className="p-8 text-center text-xs text-muted-foreground">{language === "ar" ? "لا توجد مبيعات بعد." : "No sales yet."}</div>
        )}
      </div>
    </DashboardCard>
  );
}

export function TopBrandsCard({ brands, language }: { brands: BrandPerformance[]; language: "ar" | "en" }) {
  return (
    <DashboardCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3.5">
        <h2 className="text-[13px] font-black">{language === "ar" ? "أفضل البراندات" : "Top Brands"}</h2>
        <Link to="/dashboard/brands" className="text-[10px] font-bold text-primary hover:underline">{language === "ar" ? "عرض الكل ←" : "View All →"}</Link>
      </div>
      <div className="divide-y divide-border/50">
        {brands.length ? brands.map((brand, index) => (
          <div key={brand.id} className="grid grid-cols-[18px_28px_minmax(0,1fr)_auto] items-center gap-2 px-4 py-2.5">
            <span className="text-center text-[10px] font-black text-muted-foreground">{index + 1}</span>
            <span className="grid size-7 place-items-center overflow-hidden rounded-md border border-border/50 bg-white p-1">
              {brand.logoUrl ? <img src={brand.logoUrl} alt="" className="size-full object-contain" loading="lazy" /> : <span className="text-[8px] font-black text-slate-500">{brand.name.slice(0, 2).toUpperCase()}</span>}
            </span>
            <span className="truncate text-[10px] font-semibold">{brand.name}</span>
            <span className="text-[10px] font-black">{brand.share.toFixed(1)}%</span>
          </div>
        )) : (
          <div className="p-8 text-center text-xs text-muted-foreground">{language === "ar" ? "لا توجد بيانات براندات بعد." : "No brand data yet."}</div>
        )}
      </div>
    </DashboardCard>
  );
}

const INVENTORY_META = {
  in_stock: { en: "In Stock", ar: "متوفر", color: "bg-emerald-500" },
  low_stock: { en: "Low Stock", ar: "مخزون منخفض", color: "bg-amber-500" },
  out_of_stock: { en: "Out of Stock", ar: "غير متوفر", color: "bg-rose-500" },
  on_order: { en: "On Order", ar: "قيد الطلب", color: "bg-blue-500" },
} as const;

export function InventoryStatusCard({ inventory, language }: { inventory: InventorySummary[]; language: "ar" | "en" }) {
  return (
    <DashboardCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3.5">
        <h2 className="text-[13px] font-black">{language === "ar" ? "حالة المخزون" : "Inventory Status"}</h2>
        <Link to="/dashboard/inventory" className="text-[10px] font-bold text-primary hover:underline">{language === "ar" ? "عرض الكل ←" : "View All →"}</Link>
      </div>
      <div className="divide-y divide-border/50">
        {inventory.map((item) => {
          const meta = INVENTORY_META[item.key];
          return (
            <div key={item.key} className="grid grid-cols-[minmax(0,1fr)_44px_48px] items-center gap-2 px-4 py-2.5 text-[10px]">
              <span className="flex min-w-0 items-center gap-2 font-semibold text-muted-foreground"><span className={`size-2 shrink-0 rounded-full ${meta.color}`} /> <span className="truncate">{meta[language]}</span></span>
              <span className="text-end font-black">{item.count}</span>
              <span className="text-end font-semibold text-muted-foreground">{item.percentage.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

export function DashboardPromoBanner({ language }: { language: "ar" | "en" }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(100deg,#2537d7_0%,#4f46e5_47%,#8b5cf6_100%)] px-5 py-5 text-white shadow-[0_10px_30px_-20px_rgba(79,70,229,.8)] sm:px-6">
      <div className="absolute -end-10 -top-16 size-48 rounded-full border border-white/15" />
      <div className="absolute end-24 top-3 hidden items-end gap-2 opacity-95 sm:flex">
        <span className="grid size-20 place-items-center rounded-[24px] border border-white/20 bg-white/10 backdrop-blur"><Smartphone className="size-10" /></span>
        <span className="grid size-14 place-items-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur"><Headphones className="size-7" /></span>
        <span className="grid size-14 place-items-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur"><Watch className="size-7" /></span>
      </div>
      <div className="relative max-w-[58%] sm:max-w-[52%]">
        <p className="text-[11px] font-black">Space Call</p>
        <h3 className="mt-1.5 text-lg font-black leading-tight sm:text-xl">{language === "ar" ? "تقنية مميزة لعالم أكثر اتصالاً" : "Premium Tech for a Connected World"}</h3>
        <p className="mt-2 text-[10px] text-white/75">{language === "ar" ? "هواتف • إكسسوارات • حياة أذكى" : "Smartphones • Accessories • Smarter Living"}</p>
        <a href="/" target="_blank" rel="noreferrer" className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3.5 text-[11px] font-black text-indigo-700 transition hover:bg-white/90">{language === "ar" ? "زيارة المتجر" : "Visit Store"} <ArrowUpRight className="size-3.5" /></a>
      </div>
    </div>
  );
}
