import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgePercent,
  BatteryCharging,
  Boxes,
  Cable,
  Camera,
  ChevronRight,
  CircleUserRound,
  Compass,
  Flame,
  Gamepad2,
  Grid2X2,
  Headphones,
  Heart,
  Laptop,
  LifeBuoy,
  Menu,
  Monitor,
  Package,
  PlugZap,
  RefreshCw,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tags,
  Watch,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import { displayCollections } from "@/lib/taxonomy";
import { SHOP_ACCOUNT_URL } from "@/lib/infoPages";
import { categoryLabel, useLanguage } from "@/lib/i18n";

function categoryIcon(slug: string, label: string): LucideIcon {
  const value = `${slug} ${label}`.toLowerCase();
  if (value.includes("smartphone") || value.includes("phone") || value.includes("mobile"))
    return Smartphone;
  if (value.includes("laptop") || value.includes("computer")) return Laptop;
  if (value.includes("headphone") || value.includes("earbud") || value.includes("audio"))
    return Headphones;
  if (value.includes("charger")) return PlugZap;
  if (value.includes("power bank") || value.includes("powerbank")) return BatteryCharging;
  if (value.includes("cable")) return Cable;
  if (value.includes("watch") || value.includes("wearable")) return Watch;
  if (value.includes("gaming") || value.includes("playstation")) return Gamepad2;
  if (value.includes("camera")) return Camera;
  if (value.includes("monitor") || value.includes("display") || value.includes("tv"))
    return Monitor;
  return Package;
}

function SectionHeading({
  icon: Icon,
  title,
  action,
  to,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  action?: string;
  to?: "/categories" | "/brands" | "/shop";
  onClick: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 px-1">
      <div className="flex min-w-0 items-center gap-2">
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.15} />
        <h2 className="truncate text-[13px] font-black tracking-tight text-foreground">{title}</h2>
      </div>
      {action && to ? (
        <Link
          to={to}
          onClick={onClick}
          className="inline-flex min-h-7 shrink-0 items-center gap-0.5 rounded-lg px-2 text-[10px] font-extrabold text-primary transition-colors hover:bg-primary/8 active:bg-primary/10"
        >
          {action}
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      ) : null}
    </div>
  );
}

type MobileMenuProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

export function MobileMenu({
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: MobileMenuProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t, direction, language } = useLanguage();
  const { data: catalog } = useQuery(catalogQueryOptions());
  const { data: collections = [] } = useQuery(collectionsQueryOptions());
  const close = () => setOpen(false);
  const visibleCollections = displayCollections(collections).slice(0, 4);
  const seeAll = language === "ar" ? "عرض الكل" : "See all";
  const refreshLabel = language === "ar" ? "تحديث الصفحة" : "Refresh page";
  const discoverLabel = language === "ar" ? "اكتشف" : "Discover";
  const newArrivalsLabel = language === "ar" ? "وصل حديثًا" : "New arrivals";
  const bestSellersLabel = language === "ar" ? "الأكثر مبيعًا" : "Best sellers";
  const offersLabel = language === "ar" ? "العروض" : "Offers";
  const allProductsLabel = language === "ar" ? "كل المنتجات" : "All products";
  const exploreBrandsLabel = language === "ar" ? "كل العلامات التجارية" : "All brands";

  const refreshStorefront = async () => {
    if (refreshing) return;
    setRefreshing(true);

    try {
      await Promise.allSettled([
        router.invalidate(),
        queryClient.refetchQueries({ type: "active" }),
      ]);
    } finally {
      window.setTimeout(() => setRefreshing(false), 600);
    }
  };

  const compactRowClass =
    "group flex min-h-[46px] w-full items-center gap-2.5 px-3 text-start transition-colors hover:bg-accent/45 active:bg-accent/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30";
  const quickLinkClass =
    "group flex min-h-[44px] items-center gap-2 rounded-xl bg-surface/55 px-2.5 text-start transition-colors hover:bg-accent/55 active:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!hideTrigger ? (
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label={t("openMenu")}
            className="press grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-surface"
          >
            <Menu aria-hidden className="h-5 w-5" />
          </button>
        </SheetTrigger>
      ) : null}

      <SheetContent
        side={direction === "rtl" ? "right" : "left"}
        dir={direction}
        className="flex w-[min(86vw,22rem)] transform-gpu flex-col gap-0 overflow-y-auto border-border/60 bg-background p-0 shadow-none will-change-transform data-[state=closed]:duration-150 data-[state=open]:duration-200"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{t("menuTitle")}</SheetTitle>
          <SheetDescription>{t("menuDescription")}</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-[58px] items-center gap-2.5 border-b border-border/55 px-3 pe-12">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Sparkles aria-hidden="true" className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.16em] text-primary">
              Space Call
            </p>
            <p className="truncate text-[10px] font-medium text-muted-foreground">
              {language === "ar" ? "تصفح بسرعة" : "Quick browse"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshStorefront()}
            disabled={refreshing}
            aria-busy={refreshing}
            aria-label={refreshLabel}
            title={refreshLabel}
            className="press grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-primary disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw
              aria-hidden="true"
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              strokeWidth={2.2}
            />
          </button>
        </div>

        <nav aria-label={t("menuTitle")} className="grid gap-4 px-3 py-3">
          <section>
            <SectionHeading
              icon={Grid2X2}
              title={t("categoriesTitle")}
              action={seeAll}
              to="/categories"
              onClick={close}
            />
            <div className="overflow-hidden rounded-2xl border border-border/55 bg-card/35 divide-y divide-border/50">
              {(catalog?.categories ?? []).slice(0, 5).map((item) => {
                const label = categoryLabel(item, language);
                const Icon = categoryIcon(item.slug, label);
                return (
                  <Link
                    key={item.slug}
                    to="/category/$slug"
                    params={{ slug: item.slug }}
                    className={compactRowClass}
                    onClick={close}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/[0.07] text-primary">
                      <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-foreground">
                      {label}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180"
                    />
                  </Link>
                );
              })}

              {!catalog?.categories.length && (
                <Link to="/shop" onClick={close} className={compactRowClass}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/[0.07] text-primary">
                    <Boxes aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold">
                    {t("browseProducts")}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="h-4 w-4 text-muted-foreground rtl:rotate-180"
                  />
                </Link>
              )}
            </div>
          </section>

          <section>
            <SectionHeading icon={Compass} title={discoverLabel} onClick={close} />
            <div className="grid grid-cols-2 gap-1.5">
              <Link
                to="/shop"
                search={{ sort: "newest" } as never}
                onClick={close}
                className={quickLinkClass}
              >
                <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate text-[11px] font-extrabold">{newArrivalsLabel}</span>
              </Link>
              <Link
                to="/shop"
                search={{ sort: "featured" } as never}
                onClick={close}
                className={quickLinkClass}
              >
                <Flame aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate text-[11px] font-extrabold">{bestSellersLabel}</span>
              </Link>
              <Link
                to="/shop"
                search={{ availability: "on-sale", sort: "discount" } as never}
                onClick={close}
                className={quickLinkClass}
              >
                <BadgePercent aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate text-[11px] font-extrabold">{offersLabel}</span>
              </Link>
              <Link to="/shop" onClick={close} className={quickLinkClass}>
                <ShoppingBag aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate text-[11px] font-extrabold">{allProductsLabel}</span>
              </Link>
            </div>

            <Link
              to="/brands"
              onClick={close}
              className="mt-1.5 flex min-h-[38px] items-center gap-2 rounded-xl px-2 text-[11px] font-extrabold text-primary transition-colors hover:bg-primary/[0.06] active:bg-primary/10"
            >
              <Tags aria-hidden="true" className="h-4 w-4" />
              <span className="flex-1">{exploreBrandsLabel}</span>
              <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 rtl:rotate-180" />
            </Link>
          </section>

          {visibleCollections.length > 0 && (
            <section>
              <SectionHeading
                icon={Boxes}
                title={t("collections")}
                action={seeAll}
                to="/shop"
                onClick={close}
              />
              <div className="grid grid-cols-2 gap-1.5">
                {visibleCollections.map((item) => (
                  <Link
                    key={item.handle}
                    to="/collections/$handle"
                    params={{ handle: item.handle }}
                    onClick={close}
                    className="flex min-h-[40px] items-center rounded-xl border border-border/50 bg-card/35 px-2.5 text-[11px] font-bold leading-tight transition-colors hover:bg-accent/45 active:bg-accent/65"
                  >
                    <span className="line-clamp-2">{item.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionHeading icon={LifeBuoy} title={t("help")} onClick={close} />
            <div className="overflow-hidden rounded-2xl border border-border/55 bg-card/35 divide-y divide-border/50">
              <Link to="/help" onClick={close} className={compactRowClass}>
                <LifeBuoy aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-[12px] font-bold">
                  {t("helpTitle")}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-muted-foreground rtl:rotate-180"
                />
              </Link>
              <Link to="/wishlist" onClick={close} className={compactRowClass}>
                <Heart aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-[12px] font-bold">
                  {t("wishlistTitle")}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-muted-foreground rtl:rotate-180"
                />
              </Link>
              <a
                href={SHOP_ACCOUNT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={compactRowClass}
              >
                <CircleUserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-[12px] font-bold">
                  {t("openAccount")}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-muted-foreground rtl:rotate-180"
                />
              </a>
            </div>
          </section>
        </nav>

        <div className="mt-auto border-t border-border/55 px-3 pb-[max(.65rem,env(safe-area-inset-bottom))] pt-2.5">
          <div className="flex min-h-9 items-center justify-between gap-2">
            <p className="truncate text-[10px] font-bold text-muted-foreground">
              {t("preferences")}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
