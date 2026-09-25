import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Heart, MessageCircle, Tag } from "lucide-react";

import { cdnImage } from "@/lib/image";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { productsByHandlesQueryOptions } from "@/lib/queries";
import { useLanguage } from "@/lib/i18n";
import { generalWhatsAppUrl } from "@/lib/whatsapp";
import { STORE_NAME } from "@/lib/storeConfig";
import { useRecentlyViewedStore } from "@/stores/recentlyViewedStore";

const SERVICES = [
  {
    icon: Heart,
    title: "serviceSavedFavorites",
    detail: "serviceSavedDetail",
    cta: "serviceSavedAction",
    to: "/wishlist" as const,
  },
  {
    icon: Tag,
    title: "serviceDeals",
    detail: "serviceDealsDetail",
    cta: "serviceDealsAction",
    to: "/shop" as const,
  },
  {
    icon: MessageCircle,
    title: "serviceWhatsApp",
    detail: "serviceWhatsAppDetail",
    cta: "serviceWhatsAppAction",
    to: undefined,
  },
] as const;

export function ServicesStrip() {
  const { t } = useLanguage();
  const { data: cms } = useQuery(cmsQueryOptions());
  const cmsStoreName = cms?.settings["site_name"];
  const cmsWhatsApp = cms?.settings["whatsapp_number"];
  const storeName =
    typeof cmsStoreName === "string" && cmsStoreName.trim() ? cmsStoreName.trim() : STORE_NAME;
  const whatsappNumber =
    typeof cmsWhatsApp === "string" && cmsWhatsApp.trim() ? cmsWhatsApp : undefined;
  const whatsappHref = generalWhatsAppUrl(whatsappNumber, storeName);
  return (
    <section aria-label={t("storeServices")}>
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((service) => {
          const className =
            "group flex min-w-0 flex-col items-start gap-3 rounded-lg border bg-card p-4 shadow-card transition-colors duration-150 hover:border-primary/40 sm:flex-row";
          const content = (
            <>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-primary">
                <service.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold leading-relaxed">
                  {t(service.title)}
                </p>
                <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                  {t(service.detail)}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  {t(service.cta)}{" "}
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
                </span>
              </div>
            </>
          );
          return service.to ? (
            <Link key={service.title} to={service.to} className={className}>
              {content}
            </Link>
          ) : (
            <a
              key={service.title}
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
            >
              {content}
            </a>
          );
        })}
      </div>
    </section>
  );
}

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
