import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  FileText,
  HelpCircle,
  LockKeyhole,
  MessageCircle,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { INFO_PAGES, POLICY_PAGES, POLICY_LINKS, type InfoPageName } from "@/lib/infoPages";
import { useLanguage, type Language } from "@/lib/i18n";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { shopPoliciesQueryOptions } from "@/lib/queries";
import { STORE_NAME } from "@/lib/storeConfig";
import { generalWhatsAppUrl } from "@/lib/whatsapp";

type LocalizedText = { en: string; ar: string };
type GuideCard = {
  icon: LucideIcon;
  title: LocalizedText;
  body: LocalizedText;
  bullets?: { en: string[]; ar: string[] };
};
type PageGuide = {
  intro: LocalizedText;
  cards: GuideCard[];
  note?: LocalizedText;
};

const PAGE_ICONS: Record<InfoPageName, LucideIcon> = {
  about: BadgeCheck,
  faq: HelpCircle,
  contact: MessageCircle,
  help: HelpCircle,
  shipping: Truck,
  returns: RotateCcw,
  warranty: ShieldCheck,
  privacy: LockKeyhole,
  terms: FileText,
};

const PAGE_GUIDES: Partial<Record<InfoPageName, PageGuide>> = {
  about: {
    intro: {
      en: `${STORE_NAME} is an electronics store built around clear product information, live catalogue availability and straightforward support before and after your purchase.`,
      ar: `${STORE_NAME} هو متجر إلكترونيات يركّز على معلومات واضحة عن المنتجات، وتوفّر فعلي من الكتالوج، ودعم مباشر قبل الشراء وبعده.`,
    },
    cards: [
      {
        icon: ShoppingBag,
        title: { en: "What you can shop", ar: "ماذا تجد في المتجر" },
        body: {
          en: "Browse smartphones, tablets, laptops, audio products, chargers, power banks and other electronics from the connected store catalogue.",
          ar: "تصفّح الهواتف، التابلت، اللابتوبات، منتجات الصوت، الشواحن، الباور بانك وغيرها من الإلكترونيات الموجودة في كتالوج المتجر.",
        },
      },
      {
        icon: BadgeCheck,
        title: { en: "Clear buying decisions", ar: "اختيار أوضح قبل الشراء" },
        body: {
          en: "Product pages, categories, brand pages and Space Call AI are designed to make specifications, price and availability easier to understand.",
          ar: "صفحات المنتجات والأقسام والبراندات وSpace Call AI مصممة لتسهيل فهم المواصفات والسعر والتوفّر قبل اتخاذ القرار.",
        },
      },
      {
        icon: PackageCheck,
        title: { en: "Support after checkout", ar: "دعم بعد الطلب" },
        body: {
          en: "Use your order account, WhatsApp support and the policy pages for delivery, returns and warranty guidance whenever you need help.",
          ar: "يمكنك استخدام حساب الطلبات ودعم واتساب وصفحات السياسات لمعرفة تفاصيل التوصيل والإرجاع والضمان عند الحاجة.",
        },
      },
    ],
  },
  help: {
    intro: {
      en: "Everything you need for order tracking, product questions and after-sales support is collected here.",
      ar: "جمعنا هنا كل ما تحتاجه لمتابعة الطلبات، والاستفسار عن المنتجات، والحصول على دعم ما بعد البيع.",
    },
    cards: [
      {
        icon: PackageCheck,
        title: { en: "Orders & tracking", ar: "الطلبات والتتبع" },
        body: {
          en: "Open your account to review order information, then contact us if you need help with an order status or delivery question.",
          ar: "افتح حسابك لمراجعة معلومات الطلب، وتواصل معنا إذا احتجت مساعدة بحالة الطلب أو التوصيل.",
        },
      },
      {
        icon: BadgeCheck,
        title: { en: "Product guidance", ar: "مساعدة في اختيار المنتج" },
        body: {
          en: "Ask about specifications, compatibility, current stock or the best option for your budget before ordering.",
          ar: "اسأل عن المواصفات، التوافق، المخزون الحالي أو أفضل خيار ضمن ميزانيتك قبل الطلب.",
        },
      },
      {
        icon: ShieldCheck,
        title: { en: "After-sales support", ar: "خدمة ما بعد البيع" },
        body: {
          en: "For returns, warranty or a problem with an item, contact support with your order details so the case can be reviewed correctly.",
          ar: "للإرجاع أو الضمان أو أي مشكلة بالمنتج، تواصل مع الدعم وأرسل تفاصيل الطلب ليتم التعامل مع الحالة بشكل صحيح.",
        },
      },
    ],
  },
  contact: {
    intro: {
      en: "Contact Space Call for product questions, order support, stock checks and after-sales assistance.",
      ar: "تواصل مع Space Call للاستفسار عن المنتجات، ودعم الطلبات، والتأكد من المخزون، وخدمة ما بعد البيع.",
    },
    cards: [
      {
        icon: MessageCircle,
        title: { en: "WhatsApp support", ar: "دعم واتساب" },
        body: {
          en: "The quickest way to reach the store for a product or order question is through the WhatsApp button below.",
          ar: "أسرع طريقة للتواصل مع المتجر بخصوص منتج أو طلب هي عبر زر واتساب الموجود أدناه.",
        },
      },
      {
        icon: ShoppingBag,
        title: { en: "Before you order", ar: "قبل الطلب" },
        body: {
          en: "You can ask about availability, specifications, compatibility and any detail that is unclear before checkout.",
          ar: "يمكنك السؤال عن التوفّر والمواصفات والتوافق وأي معلومة غير واضحة قبل إتمام الطلب.",
        },
      },
    ],
  },
  shipping: {
    intro: {
      en: "A practical overview of how delivery works. Exact availability, cost and timing may depend on the order and destination.",
      ar: "ملخص عملي لكيفية التوصيل. التوفّر والتكلفة والمدة الدقيقة قد تختلف حسب الطلب والمنطقة.",
    },
    cards: [
      {
        icon: Truck,
        title: { en: "Delivery details", ar: "تفاصيل التوصيل" },
        body: {
          en: "Delivery options and any applicable charges are confirmed during the ordering process or by support when needed.",
          ar: "يتم تأكيد خيارات التوصيل وأي رسوم مطبّقة أثناء عملية الطلب أو من خلال الدعم عند الحاجة.",
        },
      },
      {
        icon: PackageCheck,
        title: { en: "Order preparation", ar: "تجهيز الطلب" },
        body: {
          en: "Orders are prepared according to stock availability. If something needs clarification, the store may contact you before dispatch.",
          ar: "يتم تجهيز الطلب حسب توفّر المخزون. إذا احتاج الطلب إلى توضيح، قد يتواصل معك المتجر قبل الإرسال.",
        },
      },
      {
        icon: CheckCircle2,
        title: { en: "When you receive it", ar: "عند استلام الطلب" },
        body: {
          en: "Check the package and items when received. If something is missing, damaged or incorrect, contact support as soon as possible with the order details.",
          ar: "تحقق من الطرد والمنتجات عند الاستلام. إذا كان هناك نقص أو ضرر أو منتج غير صحيح، تواصل مع الدعم بأسرع وقت مع تفاصيل الطلب.",
        },
      },
    ],
  },
  returns: {
    intro: {
      en: "If you need to request a return, start by contacting the store so eligibility and the correct next steps can be confirmed for your order.",
      ar: "إذا كنت بحاجة لطلب إرجاع، ابدأ بالتواصل مع المتجر لتأكيد أهلية الطلب والخطوات الصحيحة حسب حالتك.",
    },
    cards: [
      {
        icon: MessageCircle,
        title: { en: "Contact us first", ar: "تواصل معنا أولاً" },
        body: {
          en: "Send your order details and the reason for the request before returning or sending any item.",
          ar: "أرسل تفاصيل الطلب وسبب الإرجاع قبل إعادة أو إرسال أي منتج.",
        },
      },
      {
        icon: PackageCheck,
        title: { en: "Keep the item complete", ar: "حافظ على المنتج كاملاً" },
        body: {
          en: "Keep the product, included accessories, packaging and proof of purchase together while your request is being reviewed.",
          ar: "احتفظ بالمنتج والإكسسوارات المرفقة والتغليف وإثبات الشراء معاً أثناء مراجعة الطلب.",
        },
      },
      {
        icon: RotateCcw,
        title: { en: "Review & resolution", ar: "المراجعة والحل" },
        body: {
          en: "Return eligibility and the final resolution depend on the item condition, order details and the store’s published return policy.",
          ar: "أهلية الإرجاع والحل النهائي يعتمدان على حالة المنتج وتفاصيل الطلب وسياسة الإرجاع المنشورة في المتجر.",
        },
      },
    ],
  },
  warranty: {
    intro: {
      en: "Warranty coverage can vary by product, brand and supplier. The product listing and proof of purchase are important when requesting service.",
      ar: "تفاصيل الضمان قد تختلف حسب المنتج والبراند والمورّد. صفحة المنتج وإثبات الشراء مهمان عند طلب خدمة الضمان.",
    },
    cards: [
      {
        icon: ShieldCheck,
        title: { en: "Coverage", ar: "التغطية" },
        body: {
          en: "Check the product details for available warranty information. Coverage may be provided by the brand, supplier or an authorised service channel.",
          ar: "راجع تفاصيل المنتج لمعرفة معلومات الضمان المتاحة. قد تكون التغطية من الشركة أو المورّد أو مركز خدمة معتمد.",
        },
      },
      {
        icon: FileText,
        title: { en: "What to keep", ar: "ما يجب الاحتفاظ به" },
        body: {
          en: "Keep your invoice or order confirmation and the product serial information, as they may be needed for a warranty claim.",
          ar: "احتفظ بالفاتورة أو تأكيد الطلب ومعلومات الرقم التسلسلي للمنتج، فقد تُطلب عند تقديم مطالبة ضمان.",
        },
      },
      {
        icon: PackageCheck,
        title: { en: "Service process", ar: "إجراءات الصيانة" },
        body: {
          en: "Contact support with the issue details. Some cases may require inspection or diagnosis before the warranty provider confirms the next step.",
          ar: "تواصل مع الدعم واذكر تفاصيل المشكلة. بعض الحالات قد تحتاج فحصاً أو تشخيصاً قبل أن يحدد مزوّد الضمان الخطوة التالية.",
        },
      },
    ],
  },
  privacy: {
    intro: {
      en: "This page explains, in plain language, the types of information that may be used to operate the store, fulfil orders and provide support.",
      ar: "توضح هذه الصفحة بلغة مبسطة أنواع المعلومات التي قد تُستخدم لتشغيل المتجر وتنفيذ الطلبات وتقديم الدعم.",
    },
    cards: [
      {
        icon: LockKeyhole,
        title: { en: "Order & contact information", ar: "بيانات الطلب والتواصل" },
        body: {
          en: "Information you provide during shopping or support may be used to process orders, communicate with you, prevent misuse and improve the service.",
          ar: "قد تُستخدم المعلومات التي تقدمها أثناء التسوق أو التواصل لمعالجة الطلبات والتواصل معك ومنع إساءة الاستخدام وتحسين الخدمة.",
        },
      },
      {
        icon: ShieldCheck,
        title: { en: "Checkout providers", ar: "مزودو الدفع والطلب" },
        body: {
          en: "Order details are processed by Space Call and the payment or delivery partners needed to complete your purchase.",
          ar: "تتم معالجة تفاصيل الطلب عبر Space Call وشركاء الدفع أو التوصيل اللازمين لإكمال عملية الشراء.",
        },
      },
      {
        icon: FileText,
        title: { en: "Cookies & site operation", ar: "ملفات الارتباط وتشغيل الموقع" },
        body: {
          en: "The site may use necessary storage, cookies or analytics to remember preferences, keep the cart working, measure performance and protect the storefront.",
          ar: "قد يستخدم الموقع التخزين الضروري أو ملفات الارتباط أو التحليلات لحفظ التفضيلات وتشغيل السلة وقياس الأداء وحماية المتجر.",
        },
      },
    ],
    note: {
      en: "If a detailed privacy policy is published from the Space Call dashboard, it appears below as the store reference.",
      ar: "إذا تم نشر سياسة خصوصية مفصلة من لوحة Space Call فستظهر أدناه باعتبارها مرجع المتجر.",
    },
  },
  terms: {
    intro: {
      en: "These points explain the basic rules for using the Space Call storefront. The published checkout and store policies remain the detailed terms for an order.",
      ar: "توضح هذه النقاط القواعد الأساسية لاستخدام متجر Space Call. تبقى شروط الدفع وسياسات المتجر المنشورة المرجع التفصيلي للطلب.",
    },
    cards: [
      {
        icon: FileText,
        title: { en: "Using the storefront", ar: "استخدام المتجر" },
        body: {
          en: "Use the site lawfully and provide accurate contact and order information when placing a purchase or requesting support.",
          ar: "استخدم الموقع بشكل قانوني وقدّم معلومات صحيحة للتواصل والطلب عند الشراء أو طلب الدعم.",
        },
      },
      {
        icon: ShoppingBag,
        title: { en: "Products, prices & availability", ar: "المنتجات والأسعار والتوفّر" },
        body: {
          en: "Product information, prices and stock can change. The order and checkout flow shows the current information available when you place the order.",
          ar: "قد تتغير معلومات المنتجات والأسعار والمخزون. تعرض عملية الطلب والدفع المعلومات المتاحة وقت تنفيذ الطلب.",
        },
      },
      {
        icon: ShieldCheck,
        title: { en: "Orders & support", ar: "الطلبات والدعم" },
        body: {
          en: "If there is an issue with an order, contact support with the order details. Shipping, returns, privacy and warranty guidance are available on their dedicated pages.",
          ar: "إذا واجهت مشكلة في طلب، تواصل مع الدعم مع تفاصيل الطلب. تتوفر معلومات الشحن والإرجاع والخصوصية والضمان في صفحاتها المخصصة.",
        },
      },
    ],
    note: {
      en: "If detailed Terms of Service are published from the Space Call dashboard, they appear below as the store terms.",
      ar: "إذا تم نشر شروط خدمة مفصلة من لوحة Space Call فستظهر أدناه باعتبارها شروط المتجر.",
    },
  },
};

function copy(language: Language, value: LocalizedText) {
  return value[language];
}

function GuideSection({ guide, language }: { guide: PageGuide; language: Language }) {
  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {guide.cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.title.en}
              className="rounded-lg border bg-card p-5 shadow-card sm:p-6"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-lg font-black tracking-tight">
                {copy(language, card.title)}
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {copy(language, card.body)}
              </p>
              {card.bullets?.[language]?.length ? (
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  {card.bullets[language].map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </div>
      {guide.note ? (
        <p className="rounded-lg border border-primary/15 bg-primary/[0.045] px-5 py-4 text-sm leading-7 text-muted-foreground">
          {copy(language, guide.note)}
        </p>
      ) : null}
    </section>
  );
}

export function InfoPage({ page }: { page: InfoPageName }) {
  const { t, direction, language } = useLanguage();
  const { data: policies, isPending } = useQuery(shopPoliciesQueryOptions());
  const { data: cms } = useQuery(cmsQueryOptions());
  const cmsStoreName = cms?.settings["site_name"];
  const cmsWhatsApp = cms?.settings["whatsapp_number"];
  const storeName =
    typeof cmsStoreName === "string" && cmsStoreName.trim() ? cmsStoreName.trim() : STORE_NAME;
  const whatsappNumber =
    typeof cmsWhatsApp === "string" && cmsWhatsApp.trim() ? cmsWhatsApp : undefined;
  const whatsappHref = generalWhatsAppUrl(whatsappNumber, storeName);
  const policy =
    page in POLICY_PAGES ? policies?.[POLICY_PAGES[page as keyof typeof POLICY_PAGES]] : null;
  const contactPage = page === "help" || page === "contact";
  const policyBackedPage = page in POLICY_PAGES;
  const guide = PAGE_GUIDES[page];
  const PageIcon = PAGE_ICONS[page];
  const faqs = [
    ["faqOriginalQ", "faqOriginalA"],
    ["faqTrackingQ", "faqTrackingA"],
    ["faqReturnsQ", "faqReturnsA"],
    ["faqDeliveryQ", "faqDeliveryA"],
    ["faqWhatsAppQ", "faqWhatsAppA"],
  ] as const;
  const extraFaqs = [
    {
      q: {
        en: "Can I ask whether an accessory is compatible with my device?",
        ar: "هل يمكنني التأكد من توافق الإكسسوار مع جهازي؟",
      },
      a: {
        en: "Yes. Send the exact device model and the accessory you are considering, and support can help you verify compatibility before ordering.",
        ar: "نعم. أرسل موديل جهازك بالتحديد والإكسسوار الذي تريد شراءه، ويمكن للدعم مساعدتك في التأكد من التوافق قبل الطلب.",
      },
    },
    {
      q: { en: "Where can I see current stock and price?", ar: "أين أرى السعر والمخزون الحالي؟" },
      a: {
        en: "Product pages use the connected store catalogue for the current information available to the website. If you need confirmation before ordering, contact us on WhatsApp.",
        ar: "تعتمد صفحات المنتجات على كتالوج المتجر المتصل لعرض المعلومات الحالية المتاحة للموقع. وإذا أردت تأكيداً قبل الطلب، تواصل معنا عبر واتساب.",
      },
    },
  ];

  return (
    <StoreLayout>
      <article dir={direction} className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:py-14">
        <header className="overflow-hidden rounded-lg border bg-card p-6 shadow-card sm:p-8">
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <PageIcon className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-3xl font-black tracking-[-0.035em] sm:text-4xl">
            {t(INFO_PAGES[page])}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
            {guide
              ? copy(language, guide.intro)
              : language === "ar"
                ? "إجابات واضحة على أكثر الأسئلة شيوعاً قبل الشراء وبعده."
                : "Clear answers to common questions before and after your purchase."}
          </p>
        </header>

        {guide ? <GuideSection guide={guide} language={language} /> : null}

        {contactPage && (
          <div className="grid gap-5 md:grid-cols-2">
            <section className="rounded-lg border bg-card p-6 shadow-card">
              <h2 className="text-xl font-black">{t("contactTitle")}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {t("immediateSupport")}
              </p>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
              >
                <MessageCircle className="h-5 w-5" />
                {t("contactWhatsApp")}
              </a>
            </section>
            <section
              id="account-orders"
              className="relative scroll-mt-28 rounded-lg border bg-card p-6 shadow-card"
            >
              <span
                id="track-order"
                className="pointer-events-none absolute -top-28 start-0"
                aria-hidden="true"
              />
              <h2 className="text-xl font-black">{t("accountOrders")}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {t("accountDescription")}
              </p>
              <p className="mt-3 rounded-xl bg-surface px-4 py-3 text-sm leading-6 text-muted-foreground">
                {language === "ar"
                  ? "للمساعدة في طلب حالي أو متابعة حالة التوصيل، تواصل مباشرة مع Space Call عبر واتساب مع رقم الطلب."
                  : "For help with an existing order or delivery status, contact Space Call directly on WhatsApp with your order number."}
              </p>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold hover:bg-accent"
              >
                <MessageCircle className="h-4 w-4" />
                {t("contactWhatsApp")}
              </a>
            </section>
          </div>
        )}

        {page === "faq" && (
          <Accordion
            type="single"
            collapsible
            className="rounded-lg border bg-card px-5 shadow-card"
          >
            {faqs.map(([question, answer]) => (
              <AccordionItem key={question} value={question}>
                <AccordionTrigger className="text-start text-base leading-relaxed">
                  {t(question)}
                </AccordionTrigger>
                <AccordionContent className="text-base leading-8 text-muted-foreground">
                  {t(answer)}
                </AccordionContent>
              </AccordionItem>
            ))}
            {extraFaqs.map((item, index) => (
              <AccordionItem key={item.q.en} value={`extra-${index}`}>
                <AccordionTrigger className="text-start text-base leading-relaxed">
                  {copy(language, item.q)}
                </AccordionTrigger>
                <AccordionContent className="text-base leading-8 text-muted-foreground">
                  {copy(language, item.a)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {policyBackedPage && (
          <section className="space-y-4 rounded-lg border bg-card p-5 shadow-card sm:p-7">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-black">
                  {language === "ar" ? "السياسة الرسمية للمتجر" : "Published store policy"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {language === "ar"
                    ? "عندما يتم نشر سياسة مفصلة من لوحة Space Call، يتم عرضها هنا باعتبارها مرجع هذه الصفحة."
                    : "When a detailed policy is published from the Space Call dashboard, it is shown here as the reference for this page."}
                </p>
              </div>
            </div>

            {policy?.body.trim() ? (
              <>
                <div
                  className="policy-content rounded-lg border bg-background p-5 sm:p-7"
                  dangerouslySetInnerHTML={{ __html: policy.body }}
                />
                {policy.url ? (
                  <a
                    href={policy.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline"
                  >
                    {t("viewPolicy")}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
              </>
            ) : (
              <div className="rounded-xl bg-surface px-4 py-4 text-sm leading-7 text-muted-foreground">
                <p>{t(isPending ? "policyLoading" : "policyPending")}</p>
                {!isPending ? (
                  <p className="mt-2">
                    {language === "ar"
                      ? "المعلومات الموجودة أعلى الصفحة تبقى دليلاً عملياً، ولتأكيد الشروط الخاصة بطلب معيّن تواصل معنا قبل الشراء."
                      : "The guidance above remains a useful practical overview. For exact terms on a specific order, contact us before purchasing."}
                  </p>
                ) : null}
              </div>
            )}
          </section>
        )}

        {page === "warranty" ? (
          <section className="rounded-lg border border-primary/15 bg-primary/[0.04] p-5 sm:p-6">
            <h2 className="text-lg font-black">
              {language === "ar" ? "هل تحتاج تأكيد الضمان؟" : "Need warranty confirmation?"}
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {language === "ar"
                ? "أرسل اسم المنتج أو رابط صفحته إلى الدعم، وسنساعدك في معرفة معلومات الضمان المتاحة لهذا المنتج قبل الشراء أو عند طلب الخدمة."
                : "Send the product name or page link to support and we can help confirm the warranty information available for that item before purchase or when requesting service."}
            </p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
            >
              <MessageCircle className="h-4 w-4" /> {t("contactWhatsApp")}
            </a>
          </section>
        ) : null}

        {(page === "help" || page === "faq") && (
          <section>
            <h2 className="text-xl font-black">{t("policiesTitle")}</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {POLICY_LINKS.map((name) => (
                <Link
                  key={name}
                  to={`/${name}`}
                  className="rounded-xl border bg-card px-4 py-3 text-sm font-semibold hover:bg-accent"
                >
                  {t(INFO_PAGES[name])}
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </StoreLayout>
  );
}
