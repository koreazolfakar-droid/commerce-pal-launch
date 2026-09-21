import { CompactProductCard } from "@/components/CompactProductCard";
import { ProductListCard } from "@/components/ProductListCard";
import { ProductViewToggle } from "@/components/ProductViewToggle";
import { useProductViewMode, type ProductViewMode } from "@/hooks/useProductViewMode";
import type { ShopifyProduct } from "@/lib/shopify";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

function useCompactGridVisibility(
  enabled: boolean,
  railRef: RefObject<HTMLDivElement | null>,
) {
  const [shouldRender, setShouldRender] = useState(!enabled);

  useEffect(() => {
    if (!enabled || shouldRender) return;

    const node = railRef.current;
    if (!node) return;

    if (!("IntersectionObserver" in window)) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setShouldRender(true);
        observer.disconnect();
      },
      {
        rootMargin: "700px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, railRef, shouldRender]);

  return shouldRender;
}

function useRailNavigation(
  railRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  itemCount: number,
) {
  const [canPrevious, setCanPrevious] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const sync = useCallback(() => {
    const node = railRef.current;
    if (!node || !enabled) {
      setCanPrevious(false);
      setCanNext(false);
      return;
    }

    const first = node.firstElementChild?.getBoundingClientRect();
    const last = node.lastElementChild?.getBoundingClientRect();
    const frame = node.getBoundingClientRect();

    if (!first || !last || node.scrollWidth <= node.clientWidth + 2) {
      setCanPrevious(false);
      setCanNext(false);
      return;
    }

    const rtl = getComputedStyle(node).direction === "rtl";
    setCanPrevious(
      rtl ? first.right > frame.right + 2 : first.left < frame.left - 2,
    );
    setCanNext(
      rtl ? last.left < frame.left - 2 : last.right > frame.right + 2,
    );
  }, [enabled, railRef]);

  useEffect(() => {
    const node = railRef.current;
    if (!node || !enabled) return;

    const frame = requestAnimationFrame(sync);
    node.addEventListener("scroll", sync, { passive: true });

    const resizeObserver =
      "ResizeObserver" in window ? new ResizeObserver(sync) : null;
    resizeObserver?.observe(node);

    const children = Array.from(node.children);
    children.forEach((child) => resizeObserver?.observe(child));

    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("scroll", sync);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [enabled, itemCount, railRef, sync]);

  const move = useCallback(
    (direction: "previous" | "next") => {
      const node = railRef.current;
      if (!node) return;

      const rtl = getComputedStyle(node).direction === "rtl";
      const distance = Math.max(220, node.clientWidth * 0.82);
      const inlineSign = rtl ? -1 : 1;
      const left =
        (direction === "next" ? 1 : -1) * inlineSign * distance;

      node.scrollBy({
        left,
        behavior: "smooth",
      });

      window.setTimeout(sync, 260);
    },
    [railRef, sync],
  );

  return {
    canPrevious,
    canNext,
    previous: () => move("previous"),
    next: () => move("next"),
  };
}

function RailArrow({
  direction,
  onClick,
  label,
}: {
  direction: "previous" | "next";
  onClick: () => void;
  label: string;
}) {
  const Icon = direction === "next" ? ChevronRight : ChevronLeft;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        "absolute top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full",
        "border border-border/70 bg-background/95 text-foreground shadow-lg backdrop-blur",
        "transition-[transform,box-shadow,background-color] duration-200 hover:scale-105 hover:bg-background hover:shadow-xl",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        direction === "next" ? "end-2 sm:end-3" : "start-2 sm:start-3",
      ].join(" ")}
    >
      <Icon className="size-5 rtl:rotate-180" strokeWidth={2.35} />
    </button>
  );
}

/**
 * Shared storefront product rail.
 * Grid mode is intentionally a horizontal carousel at every breakpoint:
 * touch swipe on phones and floating previous/next controls when more items exist.
 */
export function ProductRail({
  products,
  storageKey,
  viewMode: controlledViewMode,
  onViewModeChange,
  showViewToggle = true,
  compactGrid = false,
}: {
  products: ShopifyProduct[];
  storageKey: string;
  viewMode?: ProductViewMode;
  onViewModeChange?: (mode: ProductViewMode) => void;
  showViewToggle?: boolean;
  compactGrid?: boolean;
}) {
  const [storedViewMode, setStoredViewMode] = useProductViewMode("grid", storageKey);
  const viewMode = controlledViewMode ?? storedViewMode;
  const setViewMode = onViewModeChange ?? setStoredViewMode;
  const visible = products.slice(0, compactGrid ? 4 : 10);
  const carouselEnabled = viewMode === "grid" && visible.length > 1;
  const deferCompactGrid = compactGrid && carouselEnabled;
  const railRef = useRef<HTMLDivElement | null>(null);
  const shouldRender = useCompactGridVisibility(deferCompactGrid, railRef);
  const navigation = useRailNavigation(
    railRef,
    carouselEnabled && (!deferCompactGrid || shouldRender),
    shouldRender || !deferCompactGrid ? visible.length : 0,
  );

  return (
    <div className="product-rail">
      {showViewToggle && (
        <div className="mb-2 flex justify-end">
          <ProductViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      )}

      {viewMode === "list" ? (
        <div className="grid min-w-0 gap-2.5">
          {visible.map((product) => (
            <ProductListCard key={product.node.id} product={product} />
          ))}
        </div>
      ) : visible.length === 1 ? (
        <div className="mx-auto w-full max-w-sm">
          <CompactProductCard
            product={visible[0]!}
            eager
            className="homepage-product-card"
          />
        </div>
      ) : (
        <div className="relative">
          <div
            ref={railRef}
            className="scroll-rail product-rail-items"
            role="list"
            aria-label="Products"
            aria-busy={shouldRender ? undefined : "true"}
          >
            {shouldRender ? (
              visible.map((product, index) => (
                <CompactProductCard
                  key={product.node.id}
                  product={product}
                  listItem={compactGrid || undefined}
                  eager={index < 2}
                  className="homepage-product-card shrink-0 snap-start transition-transform duration-150 ease-out active:scale-[0.99] sm:hover:-translate-y-0.5"
                />
              ))
            ) : (
              <div
                role="listitem"
                className="min-h-80 w-[72%] shrink-0 rounded-2xl bg-surface sm:w-[14rem]"
                aria-hidden="true"
              />
            )}
          </div>

          {navigation.canPrevious ? (
            <RailArrow
              direction="previous"
              onClick={navigation.previous}
              label="Previous products"
            />
          ) : null}

          {navigation.canNext ? (
            <RailArrow
              direction="next"
              onClick={navigation.next}
              label="Next products"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
