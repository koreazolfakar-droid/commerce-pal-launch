import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BatteryCharging,
  Boxes,
  Cable,
  Camera,
  ChevronRight,
  CircleUserRound,
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

const BRAND_LOGOS: Record<string, string> = {
  anker: "/brand-logos/anker.svg",
  apple: "/brand-logos/apple.svg",
  blackshark: "/brand-logos/blackshark.svg",
  lenovo: "/brand-logos/lenovo.svg",
  poco: "/brand-logos/poco.png",
  realme: "/brand-logos/realme.svg",
  redmagic: "/brand-logos/redmagic.png",
  redmi: "/brand-logos/redmi.svg",
  samsung: "/brand-logos/samsung.png",
  tecno: "/brand-logos/tecno.svg",
  ugreen: "/brand-logos/ugreen.png",
  vention: "/brand-logos/vention.png",
  xiaomi: "/brand-logos/xiaomi.svg",
};

function categoryIcon(slug: string, label: string): LucideIcon {
  const value = `${slug} ${label}`.toLowerCase();
  if (value.includes("smartphone") || value.includes("phone") || value.includes("mobile")) return Smartphone;
  if (value.includes("laptop") || value.includes("computer")) return Laptop;
  if (value.includes("headphone") || value.includes("earbud") || value.includes("audio")) return Headphones;
  if (value.includes("charger")) return PlugZap;
  if (value.includes("power bank") || value.includes("powerbank")) return BatteryCharging;
  if (value.includes("cable")) return Cable;
  if (value.includes("watch") || value.includes("wearable")) return Watch;
  if (value.includes("gaming") || value.includes("playstation")) return Gamepad2;
  if (value.includes("camera")) return Camera;
  if (value.includes("monitor") || value.includes("display") || value.includes("tv")) return Monitor;
  return Package;
}

function brandLogo(slug: string, label: string) {
  const value = `${slug} ${label}`.toLowerCase();
  return Object.entries(BRAND_LOGOS).find(([name]) => value.includes(name))?.[1] ?? null;
}

function BrandMark({ slug, label }: { slug: string; label: string }) {
  const logo = brandLogo(slug, label);
  const fallback = label.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "SC";

  return (
    <span className="relative grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm ring-1 ring-black/[0.025]">
      {logo ? (
        <img
          src={logo}
          alt={`${label} logo`}
          className="h-full w-full object-contain px-2 py-1.5"
          loading="lazy"
        />
      ) : (
        <span className="text-[10px] font-black tracking-tight text-slate-700">{fallback}</span>
      )}
    </span>
  );
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
    <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <h2 className="truncate text-sm font-black tracking-tight text-foreground">{title}</h2>
      </div>
      {action && to ? (
        <Link
          to={to}
          onClick={onClick}
          className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-extrabold text-primary transition-colors hover:bg-primary/10"
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

  const rowClass =
    "group flex min-h-[58px] w-full items-center gap-3 rounded-2xl border border-border/65 bg-card/70 px-3 py-2.5 text-start shadow-[0_8px_24px_-22px_rgba(15,23,42,.9)] transition-[border-color,background-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:border-primary/30 hover:bg-accent/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35";

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
        className="flex w-[min(92vw,27rem)] flex-col gap-0 overflow-y-auto border-border/70 bg-background/98 p-0 supports-[backdrop-filter]:bg-background/95 supports-[backdrop-filter]:backdrop-blur-2xl"
      >
        <div className="sticky top-0 z-10 border-b border-border/60 bg-background/95 px-5 pb-4 pt-5 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-3 pe-12">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/15">
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-primary">Space Call</p>
              <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                {language === "ar" ? "تقنية أذكى، اختيار أسهل" : "Smarter tech, easier shopping"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshStorefront()}
              disabled={refreshing}
              aria-busy={refreshing}
              aria-label={refreshLabel}
              title={refreshLabel}
              className="press ms-auto grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/70 bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-wait disabled:opacity-70"
            >
              <RefreshCw
                aria-hidden="true"
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                strokeWidth={2.2}
              />
            </button>
          </div>

          <SheetHeader className="pe-10 text-start sm:text-start">
            <SheetTitle className="text-[1.7rem] font-black tracking-[-0.035em]">{t("menuTitle")}</SheetTitle>
            <SheetDescription className="mt-1 max-w-[22rem] text-[13px] leading-relaxed">
              {t("menuDescription")}
            </SheetDescription>
          </SheetHeader>
        </div>

        <nav aria-label={t("menuTitle")} className="grid gap-6 px-4 py-5">
          <section>
            <SectionHeading
              icon={Grid2X2}
              title={t("categoriesTitle")}
              action={seeAll}
              to="/categories"
              onClick={close}
            />
            <div className="grid gap-2">
              {(catalog?.categories ?? []).slice(0, 7).map((item) => {
                const label = categoryLabel(item, language);
                const Icon = categoryIcon(item.slug, label);
                return (
                  <Link
                    key={item.slug}
                    to="/category/$slug"
                    params={{ slug: item.slug }}
                    className={rowClass}
                    onClick={close}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/[0.08] text-primary ring-1 ring-primary/10 transition-transform group-hover:scale-[1.04]">
                      <Icon aria-hidden="true" className="h-[19px] w-[19px]" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-foreground">{label}</span>
                    <ChevronRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                    />
                  </Link>
                );
              })}

              {!catalog?.categories.length && (
                <Link to="/shop" onClick={close} className={rowClass}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/[0.08] text-primary">
                    <Boxes aria-hidden="true" className="h-[19px] w-[19px]" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{t("browseProducts")}</span>
                  <ChevronRight aria-hidden="true" className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
                </Link>
              )}
            </div>
          </section>

          {!!catalog?.brands.length && (
            <section className="border-t border-border/60 pt-5">
              <SectionHeading icon={Tags} title={t("brands")} action={seeAll} to="/brands" onClick={close} />
              <div className="grid gap-2">
                {catalog.brands.slice(0, 10).map((item) => (
                  <Link
                    key={item.slug}
                    to="/brand/$slug"
                    params={{ slug: item.slug }}
                    className={rowClass}
                    onClick={close}
                  >
                    <BrandMark slug={item.slug} label={item.label} />
                    <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-foreground">{item.label}</span>
                    <ChevronRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                    />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {visibleCollections.length > 0 && (
            <section className="border-t border-border/60 pt-5">
              <SectionHeading icon={Boxes} title={t("collections")} action={seeAll} to="/shop" onClick={close} />
              <div className="grid grid-cols-2 gap-2">
                {visibleCollections.map((item) => (
                  <Link
                    key={item.handle}
                    to="/collections/$handle"
                    params={{ handle: item.handle }}
                    onClick={close}
                    className="group flex min-h-[64px] items-center gap-2.5 rounded-2xl border border-border/65 bg-card/70 px-3 py-2 text-start transition-colors hover:border-primary/30 hover:bg-accent/60"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/[0.08] text-primary">
                      <Package aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <span className="line-clamp-2 text-[12px] font-extrabold leading-snug">{item.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="border-t border-border/60 pt-5">
            <SectionHeading icon={LifeBuoy} title={t("help")} onClick={close} />
            <div className="grid gap-2">
              <Link to="/help" onClick={close} className={rowClass}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/[0.08] text-primary">
                  <LifeBuoy aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{t("helpTitle")}</span>
                <ChevronRight aria-hidden="true" className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
              </Link>

              <Link to="/wishlist" onClick={close} className={rowClass}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/[0.08] text-primary">
                  <Heart aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{t("wishlistTitle")}</span>
                <ChevronRight aria-hidden="true" className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
              </Link>

              <a href={SHOP_ACCOUNT_URL} target="_blank" rel="noopener noreferrer" className={rowClass}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/[0.08] text-primary">
                  <CircleUserRound aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{t("openAccount")}</span>
                <ChevronRight aria-hidden="true" className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
              </a>
            </div>
          </section>
        </nav>

        <div className="mt-auto border-t border-border/60 bg-surface/40 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-foreground">{t("preferences")}</p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {language === "ar" ? "المظهر واللغة" : "Appearance & language"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
