import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu } from "lucide-react";
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

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { t, direction, language } = useLanguage();
  const { data: catalog } = useQuery(catalogQueryOptions());
  const { data: collections = [] } = useQuery(collectionsQueryOptions());
  const close = () => setOpen(false);
  const linkClass =
    "block min-h-11 rounded-xl px-3 py-3 text-sm hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={t("openMenu")}
          className="press grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-surface"
        >
          <Menu aria-hidden className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side={direction === "rtl" ? "right" : "left"}
        dir={direction}
        className="flex w-[min(90vw,24rem)] flex-col gap-5 overflow-y-auto p-5"
      >
        <SheetHeader className="pe-7 text-start sm:text-start">
          <SheetTitle>{t("menuTitle")}</SheetTitle>
          <SheetDescription>{t("menuDescription")}</SheetDescription>
        </SheetHeader>
        <nav aria-label={t("menuTitle")} className="grid gap-5">
          <section>
            <h2 className="mb-1 px-3 text-sm font-bold">{t("categoriesTitle")}</h2>
            {(catalog?.categories ?? []).map((item) => (
              <Link
                key={item.slug}
                to="/category/$slug"
                params={{ slug: item.slug }}
                className={linkClass}
                onClick={close}
              >
                {categoryLabel(item, language)}
              </Link>
            ))}
            {!catalog?.categories.length && (
              <Link to="/shop" onClick={close} className={linkClass}>
                {t("browseProducts")}
              </Link>
            )}
          </section>
          {!!catalog?.brands.length && (
            <section>
              <h2 className="mb-1 px-3 text-sm font-bold">{t("brands")}</h2>
              {catalog.brands.slice(0, 10).map((item) => (
                <Link
                  key={item.slug}
                  to="/brand/$slug"
                  params={{ slug: item.slug }}
                  className={linkClass}
                  onClick={close}
                >
                  {item.label}
                </Link>
              ))}
            </section>
          )}
          {displayCollections(collections).length > 0 && (
            <section>
              <h2 className="mb-1 px-3 text-sm font-bold">{t("collections")}</h2>
              {displayCollections(collections).map((item) => (
                <Link
                  key={item.handle}
                  to="/collections/$handle"
                  params={{ handle: item.handle }}
                  className={linkClass}
                  onClick={close}
                >
                  {item.title}
                </Link>
              ))}
            </section>
          )}
          <section>
            <h2 className="mb-1 px-3 text-sm font-bold">{t("help")}</h2>
            <Link to="/help" onClick={close} className={linkClass}>
              {t("helpTitle")}
            </Link>
            <Link to="/contact" onClick={close} className={linkClass}>
              {t("contactTitle")}
            </Link>
          </section>
          <section>
            <h2 className="mb-1 px-3 text-sm font-bold">{t("accountOrders")}</h2>
            <a
              href={SHOP_ACCOUNT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              {t("openAccount")}
            </a>
          </section>
        </nav>
        <div className="mt-auto border-t pt-4">
          <h2 className="mb-3 text-sm font-bold">{t("preferences")}</h2>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
