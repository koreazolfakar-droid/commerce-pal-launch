import { Cpu, Search, Sparkles } from "lucide-react";

import { OPEN_SMART_ADVISOR_EVENT } from "@/components/SmartPhoneAdvisor";
import type { ShopifyProduct } from "@/lib/shopify";
import { STORE_NAME } from "@/lib/storeConfig";

function openAdvisor(prompt: string) {
  window.dispatchEvent(
    new CustomEvent(OPEN_SMART_ADVISOR_EVENT, {
      detail: { prompt },
    }),
  );
}

/** Product-page entry point for the global Space Call AI shopping assistant. */
export function GeminiShoppingAdvisor({
  product,
}: {
  product?: ShopifyProduct;
  catalog?: { products: ShopifyProduct[] };
}) {
  if (!product) return null;
  const title = product.node.title;

  return (
    <div className="overflow-hidden rounded-[1.5rem] border bg-card shadow-card">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight">Space Call AI</h2>
              <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
                <Cpu className="h-3 w-3" /> Shopping assistant
              </span>
            </div>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              اسأل عن {title}، قارنه ببدائل مناسبة، أو خلّي المساعد يحدد إذا كان الأنسب لميزانيتك
              واستخدامك.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            openAdvisor(
              `Evaluate ${title}. Explain its important strengths and weaknesses, then compare it with a strong alternative in the same class. Use ${STORE_NAME}'s live catalogue for store price and availability.`,
            )
          }
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          <Search className="h-4 w-4" /> Ask Space Call AI
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto border-t p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3 sm:gap-0 sm:p-0">
        {[
          {
            label: "Compare alternatives",
            prompt: `Compare ${title} with strong direct alternatives. Explain which option is better for camera, battery, display and performance, and use ${STORE_NAME}'s live catalogue for any store price or stock claim.`,
          },
          {
            label: "Camera & battery",
            prompt: `Evaluate ${title} for camera, battery, charging and display. Explain practical strengths and trade-offs without claiming live-web verification.`,
          },
          {
            label: "Best value in store",
            prompt: `Is ${title} good value compared with products currently in ${STORE_NAME}? Use the live store catalogue for prices and availability, then recommend the strongest option for the money.`,
          },
        ].map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => openAdvisor(action.prompt)}
            className="shrink-0 rounded-full border bg-background px-3 py-2 text-[11px] font-bold transition-colors hover:border-primary/40 hover:text-primary sm:rounded-none sm:border-0 sm:border-r sm:bg-transparent sm:px-4 sm:py-3 sm:text-left sm:last:border-r-0 sm:hover:bg-surface"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
