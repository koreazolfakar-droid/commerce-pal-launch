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
          className="press absolute bottom-2.5 start-2.5 z-20 grid h-10 w-10 place-items-center rounded-full border border-border/70 bg-background/95 text-foreground shadow-sm backdrop-blur transition-[opacity,transform,border-color,color,background-color] hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100"
        >
          <Eye aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.9} />
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
