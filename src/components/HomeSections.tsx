import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { cdnImage } from "@/lib/image";
import { productsByHandlesQueryOptions } from "@/lib/queries";
import { useLanguage } from "@/lib/i18n";
import { useRecentlyViewedStore } from "@/stores/recentlyViewedStore";

/** Real products previously opened by this shopper; never invents history. */
export function RecentlyViewed() {
  const { t } = useLanguage();
  const handles = useRecentlyViewedStore((state) => state.handles);
  const requestedHandles = handles.slice(0, 6);
  const { data: recent = [] } = useQuery(productsByHandlesQueryOptions(requestedHandles));
  if (!recent.length) return null;
  return (
    <section aria-labelledby="recently-viewed">
      <div className="home-section-header">
        <div>
          <h2 id="recently-viewed" className="text-lg font-extrabold tracking-tight">
            {t("homeRecentlyViewed")}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t("homeRecentlyViewedDetail")}
          </p>
        </div>
      </div>
      <div className="scroll-rail flex gap-3 py-1 sm:grid sm:grid-cols-3 lg:grid-cols-6">
        {recent.slice(0, 6).map((product) => (
          <Link
            key={product.node.id}
            to="/product/$handle"
            params={{ handle: product.node.handle }}
            className="group w-[10.5rem] shrink-0 rounded-lg border bg-card p-3 shadow-card transition-colors duration-150 hover:border-primary/20 sm:w-auto"
          >
            {product.node.images.edges[0]?.node && (
              <img
                src={cdnImage(product.node.images.edges[0].node.url, 320)}
                alt={product.node.images.edges[0].node.altText ?? product.node.title}
                loading="lazy"
                width={220}
                height={220}
                className="h-32 w-full object-contain"
              />
            )}
            <p className="mt-2 line-clamp-2 text-xs font-bold group-hover:text-primary">
              {product.node.title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
