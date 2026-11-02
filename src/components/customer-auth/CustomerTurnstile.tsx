import { useEffect, useRef } from "react";

/**
 * Turnstile for customer SMS OTP issuance. This uses the same public site key
 * as the staff login screen. The secret stays exclusively in Supabase Auth.
 */
export const customerTurnstileSiteKey =
  import.meta.env.VITE_CUSTOMER_TURNSTILE_ENABLED === "true"
    ? (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "").trim()
    : "";

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      theme: "auto";
      size: "flexible";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      "timeout-callback": () => void;
    },
  ) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};

function turnstileApi(): TurnstileApi | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile;
}

let scriptPromise: Promise<void> | null = null;

function ensureScript(): Promise<void> {
  if (typeof window === "undefined" || turnstileApi()) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );

    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile failed to load")), {
      once: true,
    });

    if (!existing) {
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }).catch((error: unknown) => {
    scriptPromise = null;
    throw error;
  });

  return scriptPromise;
}

export default function CustomerTurnstile({
  onTokenChange,
  resetNonce,
}: {
  onTokenChange: (token: string | null) => void;
  resetNonce: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!customerTurnstileSiteKey || !containerRef.current) return;
    let cancelled = false;

    void ensureScript()
      .then(() => {
        const api = turnstileApi();
        if (cancelled || !containerRef.current || !api) return;
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: customerTurnstileSiteKey,
          theme: "auto",
          size: "flexible",
          callback: (token) => onTokenChange(token),
          "expired-callback": () => onTokenChange(null),
          "error-callback": () => onTokenChange(null),
          "timeout-callback": () => onTokenChange(null),
        });
      })
      .catch(() => onTokenChange(null));

    return () => {
      cancelled = true;
      const api = turnstileApi();
      if (widgetIdRef.current && api) {
        api.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      onTokenChange(null);
    };
  }, [onTokenChange]);

  useEffect(() => {
    if (!customerTurnstileSiteKey) return;
    onTokenChange(null);
    const api = turnstileApi();
    if (widgetIdRef.current && api) {
      api.reset(widgetIdRef.current);
    }
  }, [resetNonce, onTokenChange]);

  if (!customerTurnstileSiteKey) return null;

  return (
    <div className="min-h-8 overflow-hidden rounded-xl" aria-label="Security verification">
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
