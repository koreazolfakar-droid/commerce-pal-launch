import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Headphones, Laptop, MessageCircle, ShieldCheck, Smartphone, Truck } from "lucide-react";

import { StoreLayout } from "@/components/StoreLayout";
import { useLanguage } from "@/lib/i18n";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  canonicalLink,
  jsonLd,
  languageAlternateLinks,
  organizationJsonLd,
  socialMeta,
} from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";
import { generalWhatsAppUrl } from "@/lib/whatsapp";

const title = `${STORE_NAME} لبنان | متجر هواتف وإلكترونيات أونلاين`;
const description = `${STORE_NAME} لبنان متجر إلكترونيات للهواتف الذكية والتابلت واللابتوبات والسماعات والإكسسوارات، مع عرض التوفر والأسعار ودعم قبل وبعد الطلب.`;

export const Route = createFileRoute("/ar")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      ...socialMeta({ title, description, path: "/ar" }),
      { property: "og:locale", content: "ar_LB" },
    ],
    links: [canonicalLink("/ar"), ...languageAlternateLinks({ path: "/", arabicPath: "/ar" })],
    scripts: [
      jsonLd({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${absoluteUrl("/ar")}#webpage`,
        url: absoluteUrl("/ar"),
        name: title,
        description,
        inLanguage: "ar-LB",
        about: { "@id": `${absoluteUrl("/")}#organization` },
      }),
      jsonLd(
        breadcrumbJsonLd([
          { name: "الرئيسية", path: "/" },
          { name: "العربية", path: "/ar" },
        ]),
      ),
      jsonLd(organizationJsonLd()),
    ],
  }),
  component: ArabicLandingPage,
});

function ArabicLandingPage() {
  const { setLanguage } = useLanguage();

  useEffect(() => {
    setLanguage("ar");
  }, [setLanguage]);

  const categories = [
    { label: "الهواتف الذكية", slug: "smartphones", icon: Smartphone },
    { label: "اللابتوبات", slug: "laptops", icon: Laptop },
    { label: "السماعات والصوتيات", slug: "headphones", icon: Headphones },
  ];

  return (
    <StoreLayout>
      <main dir="rtl" lang="ar" className="mx-auto w-full max-w-6xl px-4 py-8 pb-28 sm:py-12">
        <section className="overflow-hidden rounded-[2rem] border bg-card p-6 shadow-card sm:p-10">
          <p className="text-sm font-bold text-primary">Space Call لبنان</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            هواتف وإلكترونيات مع معلومات واضحة واختيار أسهل
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
            تصفّح الهواتف الذكية والتابلت واللابتوبات والسماعات والشواحن والإكسسوارات في {STORE_NAME}. راجع السعر والتوفر والمواصفات، واحصل على دعم مباشر قبل الطلب وبعده.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/shop"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground"
            >
              تصفّح المنتجات <ArrowLeft className="h-4 w-4" />
            </Link>
            <a
              href={generalWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border px-6 py-3 font-bold hover:bg-accent"
            >
              <MessageCircle className="h-4 w-4" /> تواصل عبر واتساب
            </a>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="arabic-categories">
          <h2 id="arabic-categories" className="text-2xl font-black">تسوّق حسب الفئة</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {categories.map(({ label, slug, icon: Icon }) => (
              <Link
                key={slug}
                to="/category/$slug"
                params={{ slug }}
                className="group flex items-center gap-4 rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/50"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-bold">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3" aria-label="مزايا التسوق">
          <article className="rounded-2xl border bg-card p-5">
            <Truck className="h-6 w-6 text-primary" />
            <h2 className="mt-4 font-black">معلومات التوصيل</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              راجع تفاصيل الشحن والتوصيل قبل الطلب وتواصل معنا إذا احتجت تأكيداً لمنطقتك.
            </p>
            <Link to="/shipping" className="mt-4 inline-block text-sm font-bold text-primary hover:underline">تفاصيل الشحن</Link>
          </article>
          <article className="rounded-2xl border bg-card p-5">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h2 className="mt-4 font-black">الضمان والإرجاع</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              تجد معلومات الضمان والإرجاع وخطوات التواصل مع الدعم ضمن صفحات السياسات.
            </p>
            <Link to="/warranty" className="mt-4 inline-block text-sm font-bold text-primary hover:underline">معلومات الضمان</Link>
          </article>
          <article className="rounded-2xl border bg-card p-5">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h2 className="mt-4 font-black">مساعدة قبل الشراء</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              اسأل عن المواصفات والتوافق والتوفر وأفضل خيار ضمن ميزانيتك قبل إتمام الطلب.
            </p>
            <Link to="/help" className="mt-4 inline-block text-sm font-bold text-primary hover:underline">مركز المساعدة</Link>
          </article>
        </section>
      </main>
    </StoreLayout>
  );
}
