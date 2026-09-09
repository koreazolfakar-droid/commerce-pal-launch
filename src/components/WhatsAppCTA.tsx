import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { generalWhatsAppUrl } from "@/lib/whatsapp";
import { STORE_NAME } from "@/lib/storeConfig";

export function WhatsAppCTA() {
  return (
    <Button
      asChild
      size="icon"
      className="store-contact-action fixed z-30 h-14 w-14 rounded-full bg-success text-success-foreground shadow-float hover:bg-success/90"
    >
      <a
        href={generalWhatsAppUrl()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Contact ${STORE_NAME} on WhatsApp`}
      >
        <MessageCircle className="h-5 w-5" />
      </a>
    </Button>
  );
}
