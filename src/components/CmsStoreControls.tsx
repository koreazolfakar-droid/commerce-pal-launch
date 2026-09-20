import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Grid2X2,
  Heart,
  House,
  LayoutGrid,
  Menu,
  MessageCircle,
  Search,
  ShoppingBag,
  Smartphone,
  User,
  type LucideIcon,
} from "lucide-react";

import type { CmsNavigationItem } from "@/lib/cms";
import { cmsLocalizedSetting, localizeNavigationItem } from "@/lib/cms";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const CMS_ICONS: Record<string, LucideIcon> = {
  Grid2X2,
  Heart,
  House,
  LayoutGrid,
  Menu,
  MessageCircle,
  Search,
  ShoppingBag,
  Smartphone,
  User,
};

function isInternalStoreHref(href: string | null): href is string {
  return Boolean(href && href.startsWith("/") && !href.startsWith("//"));
}

function ItemIcon({ item }: { item: CmsNavigationItem }) {
  if ((item.icon_type === "image" || item.icon_type === "svg") && item.icon_value) {
    return (
      <img src={item.icon_value} alt="" aria-hidden="true" className="size-4 object-contain" />
    );
  }
  if (item.icon_type === "none") return null;
  const Icon = (item.icon_value && CMS_ICONS[item.icon_value]) || House;
  return <Icon aria-hidden="true" className="size-4" strokeWidth={1.9} />;
}

export function CmsAnnouncementBar() {
  const { data: cms } = useQuery(cmsQueryOptions());
  const { language } = useLanguage();
  const enabled = cms?.settings["announcement_enabled"] === true;
  const text = cms ? cmsLocalizedSetting(cms, "announcement_text", language) : undefined;
  if (!enabled || !text) return null;

  return (
    <div className="border-b border-border/50 bg-foreground px-4 py-2 text-center text-[11px] font-bold text-background sm:text-xs">
      {text}
    </div>
  );
}

export function CmsNavigationStrip({
  area,
  className,
}: {
  area: "header" | "footer" | "mobile_menu" | "trust";
  className?: string;
}) {
  const { data: cms } = useQuery(cmsQueryOptions());
  const { language } = useLanguage();
  const items =
    cms?.navigation
      .filter((item) => item.area === area && item.is_visible && item.href)
      .map((item) => localizeNavigationItem(item, language))
      .filter((item): item is CmsNavigationItem => Boolean(item))
      .sort((a, b) => a.sort_order - b.sort_order) ?? [];

  if (!items.length) return null;

  return (
    <nav
      aria-label={language === "ar" ? "تنقل مُدار" : "Managed navigation"}
      className={cn("border-b border-border/55 bg-background/95", className)}
      data-cms-navigation-area={area}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-5 lg:px-6">
        {items.map((item) => {
          const className =
            "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
          return isInternalStoreHref(item.href) ? (
            <Link key={item.id} href={item.href} preload="intent" className={className}>
              <ItemIcon item={item} />
              <span>{item.label}</span>
            </Link>
          ) : (
            <a key={item.id} href={item.href ?? "/"} className={className}>
              <ItemIcon item={item} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

export function CmsTrustStrip() {
  const { data: cms } = useQuery(cmsQueryOptions());
  const { language } = useLanguage();
  const items =
    cms?.navigation
      .filter((item) => item.area === "trust" && item.is_visible)
      .map((item) => localizeNavigationItem(item, language))
      .filter((item): item is CmsNavigationItem => Boolean(item))
      .sort((a, b) => a.sort_order - b.sort_order) ?? [];
  const freeShipping = cms ? cmsLocalizedSetting(cms, "free_shipping_note", language) : undefined;
  const supportHours = cms ? cmsLocalizedSetting(cms, "support_hours", language) : undefined;
  const whatsapp = cms?.settings["whatsapp_number"];
  const whatsappDigits = typeof whatsapp === "string" ? whatsapp.replace(/\D/g, "") : "";

  const utilityNotes = [freeShipping, supportHours].filter((value): value is string =>
    Boolean(value),
  );

  if (!items.length && !utilityNotes.length && !whatsappDigits) return null;

  return (
    <div className="border-y border-border/55 bg-muted/20" data-testid="cms-trust-strip">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-3 text-[11px] font-semibold text-muted-foreground sm:px-5 lg:px-6">
        {items.map((item) => {
          const className = "inline-flex items-center gap-2 hover:text-foreground";
          return isInternalStoreHref(item.href) ? (
            <Link key={item.id} href={item.href} preload="intent" className={className}>
              <ItemIcon item={item} />
              <span>{item.label}</span>
            </Link>
          ) : (
            <a key={item.id} href={item.href ?? undefined} className={className}>
              <ItemIcon item={item} />
              <span>{item.label}</span>
            </a>
          );
        })}
        {utilityNotes.map((note) => (
          <span key={note}>{note}</span>
        ))}
        {whatsappDigits ? (
          <a
            href={`https://wa.me/${whatsappDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-foreground hover:text-primary"
          >
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}
