import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { generalWhatsAppUrl } from "@/lib/whatsapp";

export function WhatsAppCTA() {
  return (
    <Button
      asChild
      size="icon"
      className="fixed bottom-20 right-4 z-30 h-12 w-12 rounded-full bg-success text-success-foreground shadow-float hover:bg-success/90 lg:bottom-6 lg:right-6"
    >
      <a href={generalWhatsAppUrl()} target="_blank" rel="noopener noreferrer" aria-label="Contact Space Cell on WhatsApp">
        <MessageCircle className="h-5 w-5" />
      </a>
    </Button>
  );
}