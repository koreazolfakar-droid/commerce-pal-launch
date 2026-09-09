import { lazy, Suspense, useState } from "react";
import { Eye } from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n";
import type { ShopifyProduct } from "@/lib/shopify";

const QuickViewDialog = lazy(() => import("./QuickViewDialog"));

export function QuickViewButton({ product }: { product: ShopifyProduct }) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`${t("quickView")} ${product.node.title}`}
          className="press absolute bottom-2 start-1/2 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full border bg-background/95 text-foreground shadow-card transition-opacity rtl:translate-x-1/2 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        >
          <Eye aria-hidden className="h-4 w-4" />
        </button>
      </DialogTrigger>
      {open && (
        <Suspense fallback={null}>
          <QuickViewDialog
            key={product.node.handle}
            product={product}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </Dialog>
  );
}
