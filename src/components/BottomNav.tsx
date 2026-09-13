import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { SearchOverlay } from "@/components/SearchOverlay";
import { OPEN_SMART_ADVISOR_EVENT } from "@/components/SmartPhoneAdvisor";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import "../mobile-ai-nav.css";

function Count({ value }: { value: number }) {
  if (value <= 0) return null;

  return (
    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#1f6ff2] px-1 text-[8px] font-black leading-none text-white shadow-[0_3px_9px_rgba(31,111,242,.28)] ring-2 ring-white dark:ring-[#111722]">
      {value > 99 ? "99+" : value}
    </span>
  );
}

function SearchGlyph() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className="h-[23px] w-[23px]" fill="none">
      <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="2.05" />
      <path
        d="m17.35 17.35 5.15 5.15"
        stroke="currentColor"
        strokeWidth="2.05"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AiGlyph() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className="h-[23px] w-[23px]" fill="none">
      <path
        d="M14 3.6c.45 4.92 2.92 7.4 7.84 7.84-4.92.45-7.4 2.92-7.84 7.84-.45-4.92-2.92-7.4-7.84-7.84C11.08 11 13.55 8.52 14 3.6Z"
        fill="currentColor"
      />
      <path
        d="M21.65 18.2c.2 2.2 1.3 3.3 3.5 3.5-2.2.2-3.3 1.3-3.5 3.5-.2-2.2-1.3-3.3-3.5-3.5 2.2-.2 3.3-1.3 3.5-3.5Z"
        fill="currentColor"
        opacity=".72"
      />
      <circle cx="6.1" cy="20.9" r="1.55" fill="currentColor" opacity=".56" />
    </svg>
  );
}

function HomeGlyph() {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true" className="h-[25px] w-[25px]">
      <path
        d="M4.2 12.65 13.16 5a2.84 2.84 0 0 1 3.68 0l8.96 7.65c.63.54 1 1.33 1 2.16v8.33A2.86 2.86 0 0 1 23.94 26H6.06a2.86 2.86 0 0 1-2.86-2.86v-8.33c0-.83.37-1.62 1-2.16Z"
        fill="currentColor"
      />
      <path d="M12 26v-6.35c0-.96.78-1.74 1.74-1.74h2.52c.96 0 1.74.78 1.74 1.74V26" fill="white" />
    </svg>
  );
}

function HeartGlyph({ active = false }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 28 28"
      aria-hidden="true"
      className="h-[23px] w-[23px]"
      fill={active ? "currentColor" : "none"}
    >
      <path
        d="M14 23.55S4.2 18.1 4.2 10.92A5.47 5.47 0 0 1 14 7.58a5.47 5.47 0 0 1 9.8 3.34C23.8 18.1 14 23.55 14 23.55Z"
        stroke="currentColor"
        strokeWidth="2.05"
        strokeLinecap="round"
        strokeLinejoin="round"
        fillOpacity={active ? 0.1 : 0}
      />
    </svg>
  );
}

function BagGlyph() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className="h-[23px] w-[23px]" fill="none">
      <path
        d="M6.1 10.1h15.8l1.2 13.1c.1 1.05-.73 1.96-1.79 1.96H6.69c-1.06 0-1.89-.91-1.79-1.96l1.2-13.1Z"
        stroke="currentColor"
        strokeWidth="2.05"
        strokeLinejoin="round"
      />
      <path
        d="M10.05 11V8.1a3.95 3.95 0 0 1 7.9 0V11"
        stroke="currentColor"
        strokeWidth="2.05"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Balanced mobile navigation with a compact centered Home action. */
export function BottomNav() {
  const navRef = useRef<HTMLElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const { t } = useLanguage();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const wishlistCount = useWishlistStore((state) => state.handles.length);
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );

  useEffect(() => {
    const nav = navRef.current;
    const layout = nav?.closest<HTMLElement>(".store-layout");
    if (!nav || !layout) return;

    const measure = () => {
      if (nav.offsetHeight > 0) {
        layout.style.setProperty("--mobile-nav-height", `${nav.offsetHeight}px`);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  const homeActive = pathname === "/";
  const wishlistActive = pathname.startsWith("/wishlist");
  const cartActive = pathname.startsWith("/cart");

  const itemClass = (isActive?: boolean) =>
    cn(
      "press group relative flex h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] px-1 pt-1 text-center text-[9px] font-bold leading-none tracking-[-0.01em] transition-all duration-150 active:scale-[.97]",
      isActive
        ? "text-[#1f6ff2]"
        : "text-[#687386] hover:text-[#4e5b6f] dark:text-[#aeb7c4] dark:hover:text-white",
    );

  const iconClass = (isActive?: boolean) =>
    cn(
      "relative grid h-[34px] w-[40px] place-items-center rounded-[13px] transition-all duration-150",
      isActive
        ? "bg-[#edf4ff] text-[#1f6ff2] shadow-[inset_0_0_0_1px_rgba(31,111,242,.07)] dark:bg-[#1f2b40]"
        : "text-[#566273] group-hover:bg-[#f5f7fa] dark:text-[#c2c9d3] dark:group-hover:bg-white/[.05]",
    );

  const activeDot = (
    <span
      className="absolute bottom-[3px] h-[3px] w-[14px] rounded-full bg-[#1f6ff2] shadow-[0_2px_6px_rgba(31,111,242,.28)]"
      aria-hidden="true"
    />
  );

  const openAi = () => {
    window.dispatchEvent(new CustomEvent(OPEN_SMART_ADVISOR_EVENT));
  };

  return (
    <>
      <nav
        ref={navRef}
        data-testid="bottom-nav"
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 overflow-visible px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2.5 lg:hidden"
      >
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-background via-background/82 to-transparent"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid min-h-[4.35rem] max-w-md grid-cols-5 items-end overflow-visible rounded-[24px] border border-black/[.055] bg-white/[.97] px-1.5 pb-1 pt-1 shadow-[0_14px_34px_-18px_rgba(15,23,42,.42),0_3px_10px_-7px_rgba(15,23,42,.18)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-x-9 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-white before:to-transparent dark:border-white/[.08] dark:bg-[#111722]/[.97] dark:before:via-white/10">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={itemClass(searchOpen)}
            aria-label={t("searchLabel")}
          >
            <span className={iconClass(searchOpen)}>
              <SearchGlyph />
            </span>
            <span className="max-w-full truncate whitespace-nowrap">{t("searchLabel")}</span>
            {searchOpen && activeDot}
          </button>

          <button
            type="button"
            onClick={openAi}
            className="press group relative flex h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] px-1 pt-1 text-center text-[9px] font-extrabold leading-none tracking-[-0.01em] text-[#7065db] transition-all duration-150 active:scale-[.97] dark:text-[#a69cff]"
            aria-label="Open AI assistant"
          >
            <span className="relative grid h-[34px] w-[40px] place-items-center overflow-hidden rounded-[13px] border border-[#e6e2ff] bg-linear-to-br from-[#f3f1ff] via-white to-[#f2f7ff] text-[#6757f5] shadow-[0_4px_12px_-10px_rgba(103,87,245,.72)] transition-all duration-150 group-hover:-translate-y-0.5 dark:border-[#403a66] dark:from-[#26223d] dark:via-[#202334] dark:to-[#1d293b] dark:text-[#aa9fff]">
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.92),transparent_43%)] opacity-75 dark:opacity-10" />
              <span className="relative">
                <AiGlyph />
              </span>
            </span>
            <span>AI</span>
          </button>

          <Link
            to="/"
            className="press relative z-10 flex min-w-0 -translate-y-2.5 flex-col items-center justify-end gap-1 px-0.5 text-center text-[9px] font-extrabold leading-none tracking-[-0.01em] text-[#1f6ff2] transition-transform duration-150 active:scale-[.98]"
            aria-current={homeActive ? "page" : undefined}
          >
            <span className="relative grid h-[52px] w-[52px] place-items-center rounded-full border-[4px] border-white bg-linear-to-br from-[#3a8cff] to-[#1463e6] text-white shadow-[0_11px_24px_-11px_rgba(31,111,242,.8)] transition-all duration-150 dark:border-[#111722]">
              <span
                className="absolute inset-[4px] rounded-full border border-white/20"
                aria-hidden="true"
              />
              <span className="relative">
                <HomeGlyph />
              </span>
            </span>
            <span className="whitespace-nowrap">{t("home")}</span>
            {homeActive && (
              <span
                className="absolute -bottom-1 h-[3px] w-[16px] rounded-full bg-[#1f6ff2] shadow-[0_2px_6px_rgba(31,111,242,.28)]"
                aria-hidden="true"
              />
            )}
          </Link>

          <Link
            to="/wishlist"
            className={itemClass(wishlistActive)}
            aria-current={wishlistActive ? "page" : undefined}
          >
            <span className={cn(iconClass(wishlistActive), "relative")}>
              <HeartGlyph active={wishlistActive} />
              <Count value={wishlistCount} />
            </span>
            <span className="max-w-full truncate whitespace-nowrap">{t("saved")}</span>
            {wishlistActive && activeDot}
          </Link>

          <Link
            to="/cart"
            className={itemClass(cartActive)}
            aria-current={cartActive ? "page" : undefined}
          >
            <span className={cn(iconClass(cartActive), "relative")}>
              <BagGlyph />
              <Count value={cartCount} />
            </span>
            <span className="max-w-full truncate whitespace-nowrap">{t("bag")}</span>
            {cartActive && activeDot}
          </Link>
        </div>
      </nav>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
