import { Link, useRouterState } from "@tanstack/react-router";
import { House, LayoutGrid, Search, ShoppingBag, type LucideIcon } from "lucide-react";

import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";

export const MOBILE_NAV_HEIGHT = "calc(4rem + env(safe-area-inset-bottom, 0px))";

type NavItem = {
  id: "home" | "categories" | "search" | "cart";
  kind: "route";
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
    kind: "route",
    to: "/",
    labelKey: "home",
    icon: House,
    matches: (pathname) => pathname === "/" || pathname.startsWith("/product/"),
  },
  {
    id: "categories",
    kind: "route",
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
    kind: "route",
    to: "/search",
    labelKey: "searchLabel",
    icon: Search,
    matches: (pathname) => startsWithRoute(pathname, "/search"),
  },
  {
    id: "cart",
    kind: "route",
    to: "/cart",
    labelKey: "bag",
    icon: ShoppingBag,
    matches: (pathname) => startsWithRoute(pathname, "/cart"),
    badge: "cart",
  },
] as const;

function CartBadge({ value }: { value: number }) {
  if (value <= 0) return null;

  return (
    <span
      data-testid="bottom-nav-cart-badge"
      className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-extrabold leading-none text-primary-foreground ring-2 ring-background"
      aria-hidden="true"
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

/** Premium mobile-only primary navigation for the Space Call storefront. */
export function BottomNav() {
  const { t } = useLanguage();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );

  const itemClass = (active: boolean) =>
    cn(
      "press relative flex h-16 min-w-0 touch-manipulation select-none flex-col items-center justify-center gap-1 px-0.5 text-center text-[10px] font-semibold leading-none transition-[color,transform] duration-200 ease-out active:scale-[.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35",
      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
    );

  const itemContent = (item: NavItem, active: boolean) => {
    const Icon = item.icon;
    return (
      <>
        <span
          className={cn(
            "relative grid h-8 w-10 place-items-center rounded-xl transition-[background-color,color] duration-200 ease-out",
            active ? "bg-primary/10 text-primary dark:bg-primary/15" : "text-current",
          )}
        >
          <Icon aria-hidden="true" className="h-[23px] w-[23px]" strokeWidth={1.9} />
          {item.id === "cart" ? <CartBadge value={cartCount} /> : null}
        </span>
        <span className="max-w-full truncate whitespace-nowrap px-0.5">{t(item.labelKey)}</span>
      </>
    );
  };

  return (
    <nav
      data-testid="bottom-nav"
      aria-label="Primary mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
    >
      <div className="border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_18px_-16px_rgba(15,23,42,.55)] supports-[backdrop-filter]:bg-background/90 supports-[backdrop-filter]:backdrop-blur-md">
        <div className="mx-auto grid h-16 max-w-[560px] grid-cols-4 px-1 sm:px-3">
          {NAV_ITEMS.map((item) => {
            const active = item.matches(pathname);
            const label = t(item.labelKey);

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
                {itemContent(item, active)}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
