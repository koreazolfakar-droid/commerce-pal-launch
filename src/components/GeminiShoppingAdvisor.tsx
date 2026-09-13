import { Globe2, Search, Sparkles } from "lucide-react";

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

/**
 * Product-page entry point for the rebuilt Smart Phone Advisor.
 * The old Gemini auto-run widget has been removed: research now happens only
 * when the shopper asks for it, through the global live-web advisor.
 */
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
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight">Smart phone research</h2>
              <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
                <Globe2 className="h-3 w-3" /> Live web
              </span>
            </div>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Research {title} online, verify important specs, compare alternatives, and match the result to products currently available from {STORE_NAME}.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            openAdvisor(
              `Research ${title} on the live web. Verify its important specifications, real strengths and weaknesses, then tell me whether it is a good buy and compare it with the strongest alternative in the same class.`,
            )
          }
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          <Search className="h-4 w-4" /> Research this phone
        </button>
      </div>

      <div className="grid border-t sm:grid-cols-3">
        {[
          {
            label: "Compare alternatives",
            prompt: `Compare ${title} with the best direct alternatives available now. Search the web for verified specs and explain which phone wins for camera, battery, display and performance.`,
          },
          {
            label: "Check camera & battery",
            prompt: `Research ${title} online and evaluate its camera, battery life, charging and display against close competitors. Use current web sources.`,
          },
          {
            label: "Is it worth the price?",
            prompt: `Is ${title} a good value today? Research it online, compare it with similarly priced phones, and check whether ${STORE_NAME} has a better option in stock.`,
          },
        ].map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => openAdvisor(action.prompt)}
            className="border-b px-4 py-3 text-left text-xs font-bold transition-colors hover:bg-surface hover:text-primary sm:border-b-0 sm:border-r last:border-r-0"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
