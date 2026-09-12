import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Youtube, Twitter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { catalogQueryOptions, shopPoliciesQueryOptions } from "@/lib/queries";
import { generalWhatsAppUrl } from "@/lib/whatsapp";
import { useLanguage } from "@/lib/i18n";
import { STORE_CONFIG, STORE_NAME, STORE_VERSION } from "@/lib/storeConfig";
import { useHydrated } from "@/hooks/useHydrated";

const SOCIALS = [
  { label: "Instagram", Icon: Instagram, href: STORE_CONFIG.socialInstagram },
  { label: "Facebook", Icon: Facebook, href: STORE_CONFIG.socialFacebook },
  { label: "X", Icon: Twitter, href: STORE_CONFIG.socialX },
  { label: "YouTube", Icon: Youtube, href: STORE_CONFIG.socialYoutube },
];

export function SiteFooter() {
  const { data: catalog } = useQuery(catalogQueryOptions());
  const { language, t } = useLanguage();
  const { data: policies } = useQuery(shopPoliciesQueryOptions());
  const hydrated = useHydrated();
  const shopLinks = (catalog?.categories ?? []).slice(0, 6);
  const brandLinks = (catalog?.brands ?? []).slice(0, 5);
  const isAr = language === "ar";

  const support = [
    ["Help", "/help"],
    ["Contact", "/contact"],
    ["Shipping", "/shipping"],
    ["Returns", "/returns"],
    ["Warranty", "/warranty"],
    ["FAQ", "/faq"],
  ] as const;
  const supportPolicy = {
    "/shipping": policies?.shippingPolicy,
    "/returns": policies?.refundPolicy,
  };
  const company = [
    ["About", "/about"],
    ["Privacy", "/privacy"],
    ["Terms", "/terms"],
  ] as const;

  return (
    <footer className="mt-16 border-t bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid min-w-0 gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="min-w-0 lg:col-span-2">
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt={STORE_NAME}
                width={32}
                height={32}
                className="h-8 w-auto shrink-0 object-contain"
              />
              <span className="text-lg font-semibold tracking-tight">{STORE_NAME}</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              {isAr
                ? "هواتف وأجهزة تقنية أصلية مع تجربة شراء آمنة ودعم مباشر."
                : `Phones and technology from the connected ${STORE_NAME} catalogue, with secure checkout and direct support.`}
            </p>
            <a
              href={generalWhatsAppUrl()}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {isAr ? "تواصل معنا عبر واتساب" : "Contact us on WhatsApp"}
            </a>
            <div className="mt-5 flex gap-3 text-muted-foreground">
              {SOCIALS.filter((social) => social.href).map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center rounded-md border bg-background hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title={isAr ? "المتجر" : "Shop"}>
            {shopLinks.map((entry) => (
              <li key={entry.slug}>
                <Link
                  to="/category/$slug"
                  params={{ slug: entry.slug }}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  {entry.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/shop" className="text-sm text-muted-foreground hover:text-primary">
                {isAr ? "كل المنتجات" : "Shop all products"}
              </Link>
            </li>
            <li>
              <Link to="/collections" className="text-sm text-muted-foreground hover:text-primary">
                {isAr ? "كل المجموعات" : "All collections"}
              </Link>
            </li>
          </FooterColumn>

          <FooterColumn title={isAr ? "العلامات التجارية" : "Brands"}>
            {brandLinks.length ? (
              brandLinks.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    to="/brand/$slug"
                    params={{ slug: entry.slug }}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {entry.label}
                  </Link>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">
                {isAr ? "لا توجد علامات بعد" : "No brands yet"}
              </li>
            )}
          </FooterColumn>

          <div className="grid gap-10 sm:grid-cols-2 lg:contents">
            <FooterColumn title={isAr ? "الدعم" : "Support"}>
              {support.map(([label, href]) => (
                <li key={href}>
                  {href in supportPolicy &&
                  supportPolicy[href as keyof typeof supportPolicy]?.url ? (
                    <a
                      href={supportPolicy[href as keyof typeof supportPolicy]!.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      {t(href === "/shipping" ? "shippingTitle" : "returnsTitle")}
                    </a>
                  ) : (
                    <Link to={href} className="text-sm text-muted-foreground hover:text-primary">
                      {label === "Help"
                        ? t("helpTitle")
                        : isAr
                          ? (
                              {
                                Contact: "اتصل بنا",
                                Shipping: "الشحن",
                                Returns: "الإرجاع",
                                Warranty: "الضمان",
                                FAQ: "الأسئلة الشائعة",
                              } as const
                            )[label]
                          : label}
                    </Link>
                  )}
                </li>
              ))}
              {(
                [
                  [policies?.privacyPolicy, "privacyTitle"],
                  [policies?.termsOfService, "termsTitle"],
                ] as const
              ).map(([policy, key]) =>
                hydrated && policy?.url ? (
                  <li key={key}>
                    <a
                      href={policy.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      {t(key)}
                    </a>
                  </li>
                ) : null,
              )}
            </FooterColumn>
            <FooterColumn title={isAr ? "الشركة" : "Company"}>
              {company.map(([label, href]) => (
                <li key={href}>
                  <Link to={href} className="text-sm text-muted-foreground hover:text-primary">
                    {isAr
                      ? ({ About: "من نحن", Privacy: "الخصوصية", Terms: "الشروط" } as const)[label]
                      : label}
                  </Link>
                </li>
              ))}
            </FooterColumn>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {STORE_NAME}.{" "}
            {isAr ? "الدفع الآمن عبر Shopify." : "Secure checkout powered by Shopify."}
          </p>
          <p className="mt-2 text-[11px] font-medium tracking-wide text-muted-foreground/80" data-testid="app-version">
            {isAr ? "الإصدار" : "Version"} v{STORE_VERSION}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="footer-column group min-w-0 break-words lg:block" open>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden lg:pointer-events-none">
        {title}
        <span className="text-lg font-normal text-muted-foreground transition-transform group-open:rotate-45 lg:hidden">
          +
        </span>
      </summary>
      <ul className="mt-2 space-y-2 pb-2 lg:mt-3 lg:pb-0">{children}</ul>
    </details>
  );
}
