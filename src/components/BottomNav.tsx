import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Grid2X2,
  Heart,
  House,
  LayoutGrid,
  Menu,
  Search,
  ShoppingBag,
  Smartphone,
  User,
  type LucideIcon,
} from "lucide-react";

import { localizeNavigationItem, type CmsNavigationItem } from "@/lib/cms";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import "../mobile-bottom-nav.css";

export const MOBILE_NAV_HEIGHT = "calc(4rem + env(safe-area-inset-bottom, 0px))";

type NavItem = {
  id: "home" | "categories" | "search" | "cart";
  to: "/" | "/categories" | "/search" | "/cart";
  labelKey: "home" | "categoriesTitle" | "searchLabel" | "bag";
  icon: LucideIcon;
  matches: (pathname: string) => boolean;
  badge?: "cart";
};

const startsWithRoute = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`);

const NAV_ITEMS: readonly NavItem[] = [
  {
    id: "home",
    to: "/",
    labelKey: "home",
    icon: House,
    matches: (pathname) => pathname === "/" || pathname.startsWith("/product/"),
  },
  {
    id: "categories",
    to: "/categories",
    labelKey: "categoriesTitle",
    icon: LayoutGrid,
    matches: (pathname) =>
      startsWithRoute(pathname, "/categories") ||
      pathname.startsWith("/category/") ||
      startsWithRoute(pathname, "/collections") ||
      startsWithRoute(pathname, "/shop") ||
      startsWithRoute(pathname, "/brands") ||
      pathname.startsWith("/brand/") ||
      startsWithRoute(pathname, "/used-phones"),
  },
  {
    id: "search",
    to: "/search",
    labelKey: "searchLabel",
    icon: Search,
    matches: (pathname) => startsWithRoute(pathname, "/search"),
  },
  {
    id: "cart",
    to: "/cart",
    labelKey: "bag",
    icon: ShoppingBag,
    matches: (pathname) => startsWithRoute(pathname, "/cart"),
    badge: "cart",
  },
] as const;

const CMS_ICONS: Record<string, LucideIcon> = {
  Grid2X2,
  Heart,
  House,
  LayoutGrid,
  Menu,
  Search,
  ShoppingBag,
  Smartphone,
  User,
};

function routeActive(pathname: string, href: string | null) {
  if (!href) return false;
  if (href === "/") return pathname === "/" || pathname.startsWith("/product/");
  if (href === "/categories") {
    return (
      startsWithRoute(pathname, "/categories") ||
      pathname.startsWith("/category/") ||
      startsWithRoute(pathname, "/collections") ||
      startsWithRoute(pathname, "/shop") ||
      startsWithRoute(pathname, "/brands") ||
      pathname.startsWith("/brand/") ||
      startsWithRoute(pathname, "/used-phones")
    );
  }
  return startsWithRoute(pathname, href);
}

function CartBadge({ value }: { value: number }) {
  if (value <= 0) return null;

  return (
    <span
      data-testid="bottom-nav-cart-badge"
      className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[8px] font-semibold leading-none text-primary-foreground ring-2 ring-background"
      aria-hidden="true"
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

function CmsIcon({ item }: { item: CmsNavigationItem }) {
  if ((item.icon_type === "image" || item.icon_type === "svg") && item.icon_value) {
    return (
      <img
        src={item.icon_value}
        alt=""
        aria-hidden="true"
        className="h-[23px] w-[23px] object-contain"
      />
    );
  }

  const Icon = (item.icon_value && CMS_ICONS[item.icon_value]) || House;
  return <Icon aria-hidden="true" className="h-[22px] w-[22px]" strokeWidth={1.7} />;
}

/** Premium mobile-only primary navigation for the Space Call storefront. */
export function BottomNav() {
  const { t, language } = useLanguage();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: cms } = useQuery(cmsQueryOptions());
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );
  const cmsAreaItems =
    cms?.navigation
      .filter((item) => item.area === "bottom" && item.href && item.href !== "/compare")
      .sort((a, b) => a.sort_order - b.sort_order) ?? [];
  const hasCmsConfig = cmsAreaItems.length > 0;
  const cmsItems = cmsAreaItems
    .filter((item) => item.is_visible)
    .map((item) => localizeNavigationItem(item, language))
    .filter((item): item is CmsNavigationItem => Boolean(item))
    .slice(0, 4);

  const itemClass = (active: boolean) =>
    cn(
      "press relative flex h-16 min-w-0 touch-manipulation select-none flex-col items-center justify-center gap-1 px-0.5 text-center text-[10px] font-medium leading-none transition-[color,transform] duration-200 ease-out active:scale-[.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35",
      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
    );

  const actionIconClass =
    "relative grid h-8 w-10 place-items-center rounded-xl transition-[background-color,color] duration-200 ease-out";

  if (hasCmsConfig && cmsItems.length === 0) return null;

  return (
    <nav
      data-testid="bottom-nav"
      aria-label="Primary mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
    >
      <div className="border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_18px_-16px_rgba(15,23,42,.55)] supports-[backdrop-filter]:bg-background/90 supports-[backdrop-filter]:backdrop-blur-md">
        {hasCmsConfig ? (
          <div
            className="mx-auto grid h-16 max-w-[560px] px-1 sm:px-3"
            style={{ gridTemplateColumns: `repeat(${cmsItems.length}, minmax(0, 1fr))` }}
          >
            {cmsItems.map((item) => {
              const active = routeActive(pathname, item.href);
              const label = item.label;
              const isCart = item.href === "/cart";
              return (
                <Link
                  key={item.id}
                  to={(item.href ?? "/") as never}
                  preload="intent"
                  data-nav-id={item.id}
                  data-active={active ? "true" : "false"}
                  className={itemClass(active)}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={cn(
                      actionIconClass,
                      active ? "bg-primary/10 text-primary dark:bg-primary/15" : "text-current",
                    )}
                  >
                    <CmsIcon item={item} />
                    {isCart ? <CartBadge value={cartCount} /> : null}
                  </span>
                  <span className="max-w-full truncate whitespace-nowrap px-0.5">{label}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto grid h-16 max-w-[560px] grid-cols-4 px-1 sm:px-3">
            {NAV_ITEMS.map((item) => {
              const active = item.matches(pathname);
              const label = t(item.labelKey);
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  to={item.to}
                  data-nav-id={item.id}
                  data-active={active ? "true" : "false"}
                  className={itemClass(active)}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={cn(
                      actionIconClass,
                      active ? "bg-primary/10 text-primary dark:bg-primary/15" : "text-current",
                    )}
                  >
                    <Icon aria-hidden="true" className="h-[22px] w-[22px]" strokeWidth={1.7} />
                    {item.badge === "cart" ? <CartBadge value={cartCount} /> : null}
                  </span>
                  <span className="max-w-full truncate whitespace-nowrap px-0.5">{label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
