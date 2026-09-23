import { useMemo, useState } from "react";
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
  Flame,
  Gamepad2,
  Headphones,
  Heart,
  Laptop,
  LifeBuoy,
  LogOut,
  Mail,
  Menu,
  Monitor,
  Package,
  PlugZap,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tags,
  Truck,
  Watch,
  type LucideIcon,
} from "lucide-react";

import { useCustomerAccount } from "@/components/customer-account/CustomerAccountProvider";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { categoryLabel, useLanguage } from "@/lib/i18n";
import { navigationCatalogQueryOptions } from "@/lib/queries";
import { STORE_NAME } from "@/lib/storeConfig";

function categoryIcon(slug: string, label: string): LucideIcon {
  const value = (slug + " " + label).toLowerCase();
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

function customerAvatar(user: ReturnType<typeof useCustomerAuth>["user"]) {
  if (!user) return "";
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  return (
    (typeof metadata?.["avatar_url"] === "string" && metadata["avatar_url"]) ||
    (typeof metadata?.["picture"] === "string" && metadata["picture"]) ||
    ""
  );
}

function customerName(
  user: ReturnType<typeof useCustomerAuth>["user"],
  profileName?: string | null,
) {
  if (profileName?.trim()) return profileName.trim();
  if (!user) return "";
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  return (
    (typeof metadata?.["full_name"] === "string" && metadata["full_name"]) ||
    (typeof metadata?.["name"] === "string" && metadata["name"]) ||
    user.phone ||
    user.email ||
    ""
  );
}

function SectionHeading({
  title,
  action,
  to,
  onClick,
}: {
  title: string;
  action?: string;
  to?: "/categories" | "/brands" | "/shop";
  onClick: () => void;
}) {
  return (
    <div className="mb-1.5 flex min-h-7 items-center justify-between gap-3 px-1">
      <h2 className="truncate text-[11px] font-semibold tracking-[0.01em] text-muted-foreground">
        {title}
      </h2>
      {action && to ? (
        <Link
          to={to}
          onClick={onClick}
          className="inline-flex min-h-7 shrink-0 items-center gap-0.5 px-1.5 text-[10px] font-semibold text-primary transition-opacity hover:opacity-75"
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
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const open = controlledOpen ?? internalOpen;

  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const queryClient = useQueryClient();
  const router = useRouter();
  const { t, direction, language } = useLanguage();
  const { data: catalog } = useQuery(navigationCatalogQueryOptions());
  const { data: cms } = useQuery(cmsQueryOptions());
  const { user, loading: authLoading, openAuth, signOut } = useCustomerAuth();
  const { profile, openAddressBook } = useCustomerAccount();

  const close = () => setOpen(false);
  const ar = language === "ar";
  const seeAll = ar ? "عرض الكل" : "See all";
  const refreshLabel = ar ? "تحديث الصفحة" : "Refresh page";
  const accountTitle = ar ? "حسابي" : "My Account";
  const profileLabel = ar ? "ملفي الشخصي" : "My Profile";
  const ordersLabel = ar ? "طلباتي" : "My Orders";
  const wishlistLabel = ar ? "المفضلة" : "Wishlist";
  const signInLabel = ar ? "تسجيل الدخول أو إنشاء حساب" : "Sign in or create account";
  const viewProfileLabel = ar ? "عرض الملف الشخصي" : "View profile";
  const shopLabel = ar ? "التسوق" : "Shop";
  const newArrivalsLabel = ar ? "وصل حديثًا" : "New Arrivals";
  const bestSellersLabel = ar ? "الأكثر مبيعًا" : "Best Sellers";
  const offersLabel = ar ? "العروض" : "Offers";
  const allProductsLabel = ar ? "كل المنتجات" : "All Products";
  const brandsLabel = ar ? "العلامات التجارية" : "Brands";
  const supportLabel = ar ? "الدعم" : "Support";
  const contactLabel = ar ? "تواصل معنا" : "Contact Us";
  const deliveryLabel = ar ? "التوصيل" : "Delivery";
  const returnsLabel = ar ? "الإرجاع والاستبدال" : "Returns";
  const signOutLabel = ar ? "تسجيل الخروج" : "Sign out";
  const preferencesLabel = ar ? "التفضيلات" : "Preferences";

  const cmsStoreName = cms?.settings["site_name"];
  const cmsLogoUrl = cms?.settings["logo_url"];
  const storeName =
    typeof cmsStoreName === "string" && cmsStoreName.trim() ? cmsStoreName.trim() : STORE_NAME;
  const logoUrl =
    typeof cmsLogoUrl === "string" && cmsLogoUrl.trim() ? cmsLogoUrl.trim() : "/logo.svg";

  const avatar = customerAvatar(user);
  const name = customerName(user, profile?.fullName);
  const secondaryIdentity = profile?.email || profile?.phone || user?.email || user?.phone || "";
  const visibleBrands = useMemo(() => (catalog?.brands ?? []).slice(0, 5), [catalog?.brands]);

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

  const openProfile = () => {
    close();
    openAddressBook();
  };

  const openSignIn = () => {
    close();
    openAuth();
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      close();
    } finally {
      setSigningOut(false);
    }
  };

  const rowClass =
    "group flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2.5 text-start transition-colors hover:bg-accent/45 active:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";
  const rowIconClass =
    "h-[18px] w-[18px] shrink-0 text-muted-foreground transition-colors group-hover:text-primary";

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
        className="flex w-[min(88vw,23rem)] transform-gpu flex-col gap-0 overflow-y-auto border-border/60 bg-background p-0 shadow-none will-change-transform data-[state=closed]:duration-150 data-[state=open]:duration-200"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{t("menuTitle")}</SheetTitle>
          <SheetDescription>{t("menuDescription")}</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-[64px] items-center gap-2.5 border-b border-border/45 px-4 pe-12">
          <Link
            to="/"
            onClick={close}
            aria-label={`${storeName} home`}
            className="flex min-w-0 flex-1 items-center gap-2.5"
            data-testid="mobile-menu-brand"
          >
            <span className="grid h-10 w-12 shrink-0 place-items-center overflow-hidden">
              <img
                src={logoUrl}
                alt={storeName}
                width={56}
                height={40}
                loading="eager"
                decoding="async"
                className="max-h-10 w-auto max-w-12 object-contain"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold tracking-[-0.015em] text-foreground">
                {storeName}
              </span>
              <span className="block truncate text-[10px] font-medium text-muted-foreground">
                {ar ? "تقنية أقرب إليك" : "Tech for a brighter you"}
              </span>
            </span>
          </Link>
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
              className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              strokeWidth={1.9}
            />
          </button>
        </div>

        <div className="px-3 pt-3">
          {user ? (
            <button
              type="button"
              onClick={openProfile}
              className="group flex w-full items-center gap-3 rounded-2xl bg-surface/60 px-3 py-3 text-start transition-colors hover:bg-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary">
                {avatar ? (
                  <img
                    src={avatar}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <CircleUserRound aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold tracking-[-0.01em]">
                  {name || accountTitle}
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-medium text-muted-foreground">
                  {secondaryIdentity || viewProfileLabel}
                </span>
                <span className="mt-1 block text-[10px] font-semibold text-primary">
                  {viewProfileLabel}
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180"
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={openSignIn}
              disabled={authLoading}
              className="group flex w-full items-center gap-3 rounded-2xl bg-surface/60 px-3 py-3 text-start transition-colors hover:bg-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-60"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <CircleUserRound aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold">{signInLabel}</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  {ar ? "احفظ عناوينك وتابع طلباتك بسهولة" : "Save addresses and follow your orders"}
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180"
              />
            </button>
          )}
        </div>

        <nav aria-label={t("menuTitle")} className="grid gap-3.5 px-3 py-3">
          <section>
            <SectionHeading title={accountTitle} onClick={close} />
            <div className="grid gap-0.5">
              <button type="button" onClick={user ? openProfile : openSignIn} className={rowClass}>
                <CircleUserRound aria-hidden="true" className={rowIconClass} strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                  {profileLabel}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80 rtl:rotate-180"
                />
              </button>
              <Link to="/my-orders" onClick={close} className={rowClass}>
                <Package aria-hidden="true" className={rowIconClass} strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                  {ordersLabel}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80 rtl:rotate-180"
                />
              </Link>
              <Link to="/wishlist" onClick={close} className={rowClass}>
                <Heart aria-hidden="true" className={rowIconClass} strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                  {wishlistLabel}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80 rtl:rotate-180"
                />
              </Link>
            </div>
          </section>

          <section className="border-t border-border/45 pt-3">
            <SectionHeading title={shopLabel} onClick={close} />
            <div className="grid gap-0.5">
              <Link to="/shop" onClick={close} className={rowClass}>
                <ShoppingBag aria-hidden="true" className={rowIconClass} strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                  {allProductsLabel}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80 rtl:rotate-180"
                />
              </Link>
              <Link
                to="/shop"
                search={{ sort: "newest" } as never}
                onClick={close}
                className={rowClass}
              >
                <Sparkles aria-hidden="true" className={rowIconClass} strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                  {newArrivalsLabel}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80 rtl:rotate-180"
                />
              </Link>
              <Link
                to="/shop"
                search={{ sort: "featured" } as never}
                onClick={close}
                className={rowClass}
              >
                <Flame aria-hidden="true" className={rowIconClass} strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                  {bestSellersLabel}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80 rtl:rotate-180"
                />
              </Link>
              <Link
                to="/shop"
                search={{ availability: "on-sale", sort: "discount" } as never}
                onClick={close}
                className={rowClass}
              >
                <BadgePercent aria-hidden="true" className={rowIconClass} strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                  {offersLabel}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80 rtl:rotate-180"
                />
              </Link>
            </div>
          </section>

          <section className="border-t border-border/45 pt-3">
            <SectionHeading
              title={t("categoriesTitle")}
              action={seeAll}
              to="/categories"
              onClick={close}
            />
            <div className="grid gap-0.5">
              {(catalog?.categories ?? []).slice(0, 5).map((item) => {
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
                    <Icon aria-hidden="true" className={rowIconClass} strokeWidth={1.8} />
                    <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                      {label}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80 rtl:rotate-180"
                    />
                  </Link>
                );
              })}

              {!catalog?.categories.length ? (
                <Link to="/shop" onClick={close} className={rowClass}>
                  <Boxes aria-hidden="true" className={rowIconClass} strokeWidth={1.8} />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                    {t("browseProducts")}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-muted-foreground/80 rtl:rotate-180"
                  />
                </Link>
              ) : null}
            </div>
          </section>

          <section className="border-t border-border/45 pt-3">
            <SectionHeading title={brandsLabel} action={seeAll} to="/brands" onClick={close} />
            {visibleBrands.length ? (
              <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {visibleBrands.map((brand) => (
                  <Link
                    key={brand.slug}
                    to="/brand/$slug"
                    params={{ slug: brand.slug }}
                    onClick={close}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border/45 bg-card/25 px-3 text-[11px] font-semibold transition-colors hover:bg-accent/45"
                  >
                    <Tags aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.8} />
                    <span>{brand.label}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <Link to="/brands" onClick={close} className={rowClass}>
                <Tags aria-hidden="true" className={rowIconClass} strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                  {brandsLabel}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-muted-foreground/80 rtl:rotate-180"
                />
              </Link>
            )}
          </section>

          <section className="border-t border-border/45 pt-3">
            <SectionHeading title={supportLabel} onClick={close} />
            <div className="grid gap-0.5">
              <Link to="/help" onClick={close} className={rowClass}>
                <LifeBuoy aria-hidden="true" className={rowIconClass} strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                  {t("helpTitle")}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80 rtl:rotate-180"
                />
              </Link>
              <Link to="/contact" onClick={close} className={rowClass}>
                <Mail aria-hidden="true" className={rowIconClass} strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                  {contactLabel}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80 rtl:rotate-180"
                />
              </Link>
              <Link to="/shipping" onClick={close} className={rowClass}>
                <Truck aria-hidden="true" className={rowIconClass} strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                  {deliveryLabel}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80 rtl:rotate-180"
                />
              </Link>
              <Link to="/returns" onClick={close} className={rowClass}>
                <RotateCcw aria-hidden="true" className={rowIconClass} strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                  {returnsLabel}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80 rtl:rotate-180"
                />
              </Link>
            </div>
          </section>
        </nav>

        <div className="mt-auto border-t border-border/45 px-3 pb-[max(.65rem,env(safe-area-inset-bottom))] pt-2.5">
          <div className="mb-1 flex min-h-8 items-center justify-between gap-2 px-1">
            <p className="truncate text-[10px] font-semibold text-muted-foreground">
              {preferencesLabel}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>

          {user ? (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="group flex min-h-[42px] w-full items-center gap-3 rounded-xl px-2.5 text-start text-destructive transition-colors hover:bg-destructive/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/20 disabled:opacity-60"
            >
              <LogOut aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
              <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                {signOutLabel}
              </span>
            </button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
