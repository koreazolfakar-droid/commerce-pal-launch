import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { generalWhatsAppUrl } from "@/lib/whatsapp";
import { STORE_NAME } from "@/lib/storeConfig";

export function WhatsAppCTA() {
  const { data: cms } = useQuery(cmsQueryOptions());
  const cmsStoreName = cms?.settings["site_name"];
  const cmsWhatsApp = cms?.settings["whatsapp_number"];
  const storeName =
    typeof cmsStoreName === "string" && cmsStoreName.trim() ? cmsStoreName.trim() : STORE_NAME;
  const whatsappNumber =
    typeof cmsWhatsApp === "string" && cmsWhatsApp.trim() ? cmsWhatsApp : undefined;

  return (
    <Button
      asChild
      size="icon"
      className="store-contact-action group fixed bottom-[calc(var(--mobile-nav-height)+14px)] left-4 z-40 h-12 w-12 rounded-md border border-success/25 bg-success p-0 text-success-foreground shadow-float transition-[transform,background-color,border-color,box-shadow] duration-150 hover:border-success/40 hover:bg-success/90 active:scale-[0.98] sm:left-5 sm:w-auto sm:rounded-full sm:px-4 lg:bottom-6 lg:left-auto lg:right-[5.75rem] [&_svg]:size-5"
    >
      <a
        href={generalWhatsAppUrl(whatsappNumber, storeName)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Contact ${storeName} on WhatsApp`}
      >
        <MessageCircle aria-hidden="true" />
        <span className="hidden sm:inline">WhatsApp</span>
      </a>
    </Button>
  );
}
