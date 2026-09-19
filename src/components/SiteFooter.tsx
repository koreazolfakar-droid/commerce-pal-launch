import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, MessageCircle, Youtube, Twitter } from "lucide-react";

import { generalWhatsAppUrl } from "@/lib/whatsapp";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { useLanguage } from "@/lib/i18n";
import { STORE_CONFIG, STORE_NAME } from "@/lib/storeConfig";

const SOCIALS = [
  { label: "Instagram", Icon: Instagram, href: STORE_CONFIG.socialInstagram },
  { label: "Facebook", Icon: Facebook, href: STORE_CONFIG.socialFacebook },
  { label: "X", Icon: Twitter, href: STORE_CONFIG.socialX },
  { label: "YouTube", Icon: Youtube, href: STORE_CONFIG.socialYoutube },
];

const FOOTER_SHOP_LINKS = [
  { slug: "smartphones", en: "Smartphones", ar: "الهواتف الذكية" },
  { slug: "tablets", en: "Tablets", ar: "الأجهزة اللوحية" },
  { slug: "laptops", en: "Laptops", ar: "اللابتوبات" },
  { slug: "headphones", en: "Headphones & Earbuds", ar: "السماعات وسماعات الأذن" },
  { slug: "chargers", en: "Chargers", ar: "الشواحن" },
  { slug: "power-banks", en: "Power Banks", ar: "الباور بانك" },
] as const;

const FOOTER_BRAND_LINKS = [
  { slug: "apple", label: "Apple" },
  { slug: "samsung", label: "Samsung" },
  { slug: "xiaomi", label: "Xiaomi" },
  { slug: "anker", label: "Anker" },
  { slug: "poco", label: "POCO" },
] as const;

export function SiteFooter({ compactTopSpacing = false }: { compactTopSpacing?: boolean }) {
  const { language, t } = useLanguage();
  const { data: cms } = useQuery(cmsQueryOptions());
  const isAr = language === "ar";
  const cmsStoreName = cms?.settings["site_name"];
  const cmsLogoUrl = cms?.settings["logo_url"];
  const cmsWhatsApp = cms?.settings["whatsapp_number"];
  const storeName =
    typeof cmsStoreName === "string" && cmsStoreName.trim() ? cmsStoreName.trim() : STORE_NAME;
  const logoUrl =
    typeof cmsLogoUrl === "string" && cmsLogoUrl.trim() ? cmsLogoUrl.trim() : "/logo.svg";
  const whatsappDigits = typeof cmsWhatsApp === "string" ? cmsWhatsApp.replace(/\D/g, "") : "";
  const whatsappUrl = generalWhatsAppUrl(whatsappDigits || undefined, storeName);
  const socialSetting = (key: string, fallback: string) => {
    const value = cms?.settings[key];
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  };
  const socials = [
    { label: "Instagram", Icon: Instagram, href: socialSetting("instagram_url", STORE_CONFIG.socialInstagram) },
    { label: "Facebook", Icon: Facebook, href: socialSetting("facebook_url", STORE_CONFIG.socialFacebook) },
    { label: "X", Icon: Twitter, href: socialSetting("x_url", STORE_CONFIG.socialX) },
    { label: "YouTube", Icon: Youtube, href: socialSetting("youtube_url", STORE_CONFIG.socialYoutube) },
  ];

  const support = [
    ["Help", "/help"],
    ["Contact", "/contact"],
    ["Shipping", "/shipping"],
    ["Returns", "/returns"],
    ["Warranty", "/warranty"],
    ["FAQ", "/faq"],
  ] as const;
  const company = [
    ["About", "/about"],
    ["Privacy", "/privacy"],
    ["Terms", "/terms"],
  ] as const;

  return (
    <footer className={`${compactTopSpacing ? "mt-4" : "mt-16"} border-t bg-surface`}>
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid min-w-0 gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="min-w-0 lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <img
                src={logoUrl}
                alt={storeName}
                width={54}
                height={36}
                loading="lazy"
                decoding="async"
                className="h-9 w-auto shrink-0 object-contain"
              />
              <span className="text-lg font-semibold tracking-tight">{storeName}</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              {isAr
                ? "هواتف وأجهزة تقنية أصلية مع تجربة شراء آمنة ودعم مباشر."
                : `Phones and technology from the connected ${storeName} catalogue, with secure checkout and direct support.`}
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              {isAr ? "تواصل معنا عبر واتساب" : "Contact us on WhatsApp"}
            </a>
            <div className="mt-5 flex gap-3 text-muted-foreground">
              {socials.filter((social) => social.href).map(({ Icon, label, href }) => (
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
            <li>
              <Link
                to="/collections/$handle"
                params={{ handle: "apple-iphone" }}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {isAr ? "آيفون" : "iPhone"}
              </Link>
            </li>
            {FOOTER_SHOP_LINKS.map((entry) => (
              <li key={entry.slug}>
                <Link
                  to="/category/$slug"
                  params={{ slug: entry.slug }}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  {isAr ? entry.ar : entry.en}
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
            {FOOTER_BRAND_LINKS.map((entry) => (
              <li key={entry.slug}>
                <Link
                  to="/brand/$slug"
                  params={{ slug: entry.slug }}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  {entry.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/brands" className="text-sm text-muted-foreground hover:text-primary">
                {isAr ? "كل العلامات التجارية" : "All brands"}
              </Link>
            </li>
          </FooterColumn>

          <div className="grid gap-10 sm:grid-cols-2 lg:contents">
            <FooterColumn title={isAr ? "الدعم" : "Support"}>
              {support.map(([label, href]) => (
                <li key={href}>
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
                </li>
              ))}
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
            © {new Date().getFullYear()} {storeName}.{" "}
            {isAr ? "الدفع الآمن عبر Shopify." : "Secure checkout powered by Shopify."}
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
