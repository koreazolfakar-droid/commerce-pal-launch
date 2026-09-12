import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  INFO_PAGES,
  POLICY_PAGES,
  POLICY_LINKS,
  SHOPIFY_ACCOUNT_URL,
  type InfoPageName,
} from "@/lib/infoPages";
import { useLanguage } from "@/lib/i18n";
import { shopPoliciesQueryOptions } from "@/lib/queries";
import { generalWhatsAppUrl } from "@/lib/whatsapp";

export function InfoPage({ page }: { page: InfoPageName }) {
  const { t, direction, language } = useLanguage();
  const { data: policies, isPending } = useQuery(shopPoliciesQueryOptions());
  const policy =
    page in POLICY_PAGES ? policies?.[POLICY_PAGES[page as keyof typeof POLICY_PAGES]] : null;
  const contactPage = page === "help" || page === "contact";
  const legalPage = page in POLICY_PAGES || page === "warranty";
  const isAr = language === "ar";
  const faqs = [
    ["faqOriginalQ", "faqOriginalA"],
    ["faqTrackingQ", "faqTrackingA"],
    ["faqReturnsQ", "faqReturnsA"],
    ["faqDeliveryQ", "faqDeliveryA"],
    ["faqWhatsAppQ", "faqWhatsAppA"],
  ] as const;
  return (
    <StoreLayout>
      <article dir={direction} className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight">{t(INFO_PAGES[page])}</h1>
        {page === "about" && (
          <p className="max-w-3xl text-base leading-8 text-muted-foreground">{t("aboutBody")}</p>
        )}
        {contactPage && (
          <div className="grid gap-5 md:grid-cols-2">
            <section className="rounded-2xl border bg-card p-6">
              <h2 className="text-xl font-bold">{t("contactTitle")}</h2>
              <p className="mt-3 text-base text-muted-foreground">{t("immediateSupport")}</p>
              <a
                href={generalWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
              >
                <MessageCircle className="h-5 w-5" />
                {t("contactWhatsApp")}
              </a>
            </section>
            <section id="account-orders" className="scroll-mt-28 rounded-2xl border bg-card p-6">
              <h2 className="text-xl font-bold">{t("accountOrders")}</h2>
              <p className="mt-3 text-base text-muted-foreground">{t("accountDescription")}</p>
              <div className="mt-4 flex gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm leading-6 text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <p>
                  {isAr
                    ? "سيتم تحويلك إلى صفحة حساب Shopify الآمنة لإدارة الطلبات. قد يظهر نطاق myshopify.com أثناء هذه الخطوة."
                    : "You’ll be redirected to Shopify’s secure account page to manage orders. The myshopify.com domain may appear during this step."}
                </p>
              </div>
              <a
                href={SHOPIFY_ACCOUNT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold hover:bg-accent"
              >
                {t("openAccount")}
                <ExternalLink className="h-4 w-4" />
              </a>
            </section>
          </div>
        )}
        {page === "faq" && (
          <Accordion type="single" collapsible className="rounded-2xl border bg-card px-5">
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
          </Accordion>
        )}
        {legalPage &&
          (policy?.body.trim() ? (
            <>
              <div
                className="policy-content rounded-2xl border bg-card p-6 sm:p-8"
                dangerouslySetInnerHTML={{ __html: policy.body }}
              />
              {policy.url && (
                <a
                  href={policy.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline"
                >
                  {t("viewPolicy")}
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </>
          ) : (
            <div className="rounded-2xl border bg-card p-6">
              <p className="text-base leading-8 text-muted-foreground">
                {t(isPending ? "policyLoading" : "policyPending")}
              </p>
              <a
                href={generalWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
              >
                <MessageCircle className="h-5 w-5" />
                {t("contactWhatsApp")}
              </a>
            </div>
          ))}
        {(page === "help" || page === "faq") && (
          <section>
            <h2 className="text-xl font-bold">{t("policiesTitle")}</h2>
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
