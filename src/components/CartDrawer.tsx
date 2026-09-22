import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cdnImage } from "@/lib/image";
import { formatPrice } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { useLanguage } from "@/lib/i18n";

type CartDrawerProps = {
  hideTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const CartDrawer = ({
  hideTrigger = false,
  open: controlledOpen,
  onOpenChange,
}: CartDrawerProps) => {
  const { t, language } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = useCallback(
    (nextOpen: boolean) => {
      if (controlledOpen === undefined) setInternalOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [controlledOpen, onOpenChange],
  );
  const {
    items,
    total,
    updateQuantity,
    removeItem,
    syncCart,
  } = useCartStore();

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = Number(total?.amount ?? 0);
  const currency = total?.currencyCode ?? items[0]?.price.currencyCode ?? "USD";
  const whatsappLabel = language === "ar" ? "اطلب عبر واتساب" : "Order via WhatsApp";
  const orLabel = language === "ar" ? "أو" : "or";

  useEffect(() => {
    if (isOpen) syncCart();
  }, [isOpen, syncCart]);

  // Lets the mobile top bar / bottom nav open the same drawer instance.
  // Kept for backwards compatibility with any existing event-driven callers.
  useEffect(() => {
    const open = () => setIsOpen(true);
    document.addEventListener("space-cell:open-cart", open);
    return () => document.removeEventListener("space-cell:open-cart", open);
  }, [setIsOpen]);


  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild className={hideTrigger ? "hidden" : undefined}>
        <Button
          variant="outline"
          size="icon"
          className="press relative rounded-full"
          aria-label={`${t("openBag")}, ${totalItems}`}
        >
          <ShoppingBag className="h-5 w-5" />
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-full w-full flex-col sm:max-w-lg">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>{t("yourBag")}</SheetTitle>
          <SheetDescription>
            {totalItems === 0
              ? t("bagEmpty")
              : `${totalItems} ${t(totalItems === 1 ? "product" : "products")}`}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col pt-6">
          {items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">{t("nothingHere")}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto pr-2">
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.variantId} className="flex gap-4 rounded-2xl border bg-card p-3">
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-surface">
                        {item.product.node.images?.edges?.[0]?.node && (
                          <img
                            src={cdnImage(item.product.node.images.edges[0].node.url, 128)}
                            alt={item.product.node.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate font-medium">{item.product.node.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.selectedOptions.map((option) => option.value).join(" • ")}
                        </p>
                        <p className="font-semibold">
                          {formatPrice(item.price.amount, item.price.currencyCode)}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeItem(item.variantId)}
                          aria-label={t("removeItem")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            aria-label={t("decreaseQuantity")}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            aria-label={t("increaseQuantity")}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0 space-y-3 border-t bg-background pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">{t("total")}</span>
                  <span className="text-xl font-bold">{formatPrice(totalPrice, currency)}</span>
                </div>

                <Button
                  asChild
                  className="min-h-12 w-full bg-[#25D366] font-semibold text-white hover:bg-[#20bd5a]"
                  size="lg"
                >
                  <Link
                    to="/cart"
                    hash="whatsapp-checkout"
                    onClick={() => setIsOpen(false)}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {whatsappLabel}
                  </Link>
                </Button>

                <div className="flex items-center gap-3 text-[10px] font-medium tracking-[0.02em] text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  <span>{orLabel}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <Button asChild variant="outline" className="min-h-12 w-full" size="lg">
                  <Link to="/cart" onClick={() => setIsOpen(false)}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    {language === "ar" ? "إكمال الطلب" : "Continue checkout"}
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
