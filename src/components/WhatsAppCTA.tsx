import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { generalWhatsAppUrl } from "@/lib/whatsapp";
import { STORE_NAME } from "@/lib/storeConfig";

export function WhatsAppCTA() {
  return (
    <Button
      asChild
      size="icon"
      className="store-contact-action group fixed z-30 h-12 w-12 rounded-2xl border border-success/25 bg-success p-0 text-success-foreground shadow-float transition-[transform,background-color,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-success/40 hover:bg-success/90 hover:shadow-lg active:translate-y-0 active:scale-95 sm:w-auto sm:rounded-full sm:px-4 [&_svg]:size-5"
      style={{ left: "max(1rem, env(safe-area-inset-left))", right: "auto" }}
    >
      <a
        href={generalWhatsAppUrl()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Contact ${STORE_NAME} on WhatsApp`}
      >
        <MessageCircle aria-hidden="true" />
        <span className="hidden sm:inline">WhatsApp</span>
      </a>
    </Button>
  );
}
