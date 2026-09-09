import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { generalWhatsAppUrl } from "@/lib/whatsapp";

/** Honest contact CTA until a real email marketing provider is configured. */
export function Newsletter() {
  const { language } = useLanguage();
  const ar = language === "ar";
  return (
    <section className="" aria-labelledby="updates">
      <div className="grid gap-5 rounded-3xl border bg-linear-to-br from-accent/80 to-surface p-6 shadow-card sm:p-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <h2 id="updates" className="text-lg font-extrabold tracking-tight sm:text-2xl">
            {ar ? "آخر العروض والمنتجات الجديدة" : "New drops and deals"}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground sm:text-sm">
            {ar
              ? "للحصول على تحديثات مباشرة، تواصل معنا عبر واتساب."
              : "For direct updates about new products and deals, contact us on WhatsApp."}
          </p>
        </div>
        <a
          href={generalWhatsAppUrl()}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {ar ? "تواصل عبر واتساب" : "Contact on WhatsApp"}
          <MessageCircle className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
