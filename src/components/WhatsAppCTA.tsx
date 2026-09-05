import { MessageCircle } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { generalWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export function WhatsAppCTA() {
  const onProductPage = useRouterState({ select: (state) => state.location.pathname.startsWith("/product/") });
  return (
    <Button
      asChild
      size="icon"
      className={cn(
        "fixed right-4 z-30 h-12 w-12 rounded-full bg-success text-success-foreground shadow-float hover:bg-success/90 lg:bottom-6 lg:right-6",
        onProductPage ? "bottom-44 sm:bottom-20" : "bottom-20",
      )}
    >
      <a href={generalWhatsAppUrl()} target="_blank" rel="noopener noreferrer" aria-label="Contact Space Cell on WhatsApp">
        <MessageCircle className="h-5 w-5" />
      </a>
    </Button>
  );
}