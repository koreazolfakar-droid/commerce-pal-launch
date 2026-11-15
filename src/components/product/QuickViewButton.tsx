import { lazy, Suspense, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuickViewBoundary } from "./QuickViewBoundary";
import { useLanguage } from "@/lib/i18n";
import { importWithChunkRecovery } from "@/lib/lazyChunkRecovery";
import type { StoreProduct } from "@/lib/storeTypes";

const QuickViewDialog = lazy(() =>
  importWithChunkRecovery("quick-view-dialog", () => import("./QuickViewDialog")),
);

export function QuickViewButton({ product }: { product: StoreProduct }) {
  const [open, setOpen] = useState(false);
  const { t, language, direction } = useLanguage();
  const title =
    language === "ar" && product.node.titleAr?.trim() ? product.node.titleAr : product.node.title;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`${t("quickView")} ${title}`}
          className="press group/quick-view absolute bottom-1 start-1 z-20 grid h-11 w-11 place-items-center rounded-full text-foreground !shadow-none hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="pointer-events-none grid h-8 w-8 place-items-center rounded-full border border-border/70 bg-background/95 shadow-sm backdrop-blur transition-colors group-hover/quick-view:border-primary/40">
            <Eye aria-hidden className="h-3.5 w-3.5" strokeWidth={1.9} />
          </span>
        </button>
      </DialogTrigger>
      {open && (
        <DialogContent
          dir={direction}
          overlayClassName="bg-black/65 backdrop-blur-sm"
          className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-xl bg-card p-4 text-card-foreground shadow-float motion-reduce:animate-none sm:p-6"
        >
          <DialogHeader className="pe-9 text-start sm:text-start">
            <DialogTitle className="break-words leading-snug">{title}</DialogTitle>
            <DialogDescription>{t("quickViewDescription")}</DialogDescription>
          </DialogHeader>
          <QuickViewBoundary
            fallback={
              <div className="grid gap-3 py-6">
                <p role="alert" className="text-sm text-muted-foreground">
                  {t("quickViewFailed")}
                </p>
                <Link
                  to="/product/$handle"
                  params={{ handle: product.node.handle }}
                  onClick={() => setOpen(false)}
                  className="text-sm font-semibold text-primary underline underline-offset-4"
                >
                  {t("fullDetails")}
                </Link>
              </div>
            }
          >
            <Suspense
              fallback={
                <div
                  role="status"
                  className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground"
                >
                  <Loader2
                    aria-hidden
                    className="h-5 w-5 animate-spin motion-reduce:animate-none"
                  />
                  {t("quickViewLoading")}
                </div>
              }
            >
              <QuickViewDialog
                key={product.node.handle}
                product={product}
                onClose={() => setOpen(false)}
              />
            </Suspense>
          </QuickViewBoundary>
        </DialogContent>
      )}
    </Dialog>
  );
}
