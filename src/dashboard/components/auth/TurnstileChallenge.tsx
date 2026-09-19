import { useEffect, useRef } from "react";
import { dashboardTurnstileSiteKey } from "@/dashboard/data/catalog";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "compact" | "flexible";
      appearance?: "always" | "execute" | "interaction-only";
      callback?: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      "timeout-callback"?: () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-spacecall-turnstile="true"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Turnstile failed to load.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.spacecallTurnstile = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile failed to load."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export default function TurnstileChallenge({
  onTokenChange,
  resetNonce,
}: {
  onTokenChange: (token: string | null) => void;
  resetNonce: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!dashboardTurnstileSiteKey || !containerRef.current) return;

    let cancelled = false;

    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: dashboardTurnstileSiteKey,
          theme: "dark",
          size: "flexible",
          appearance: "interaction-only",
          callback: (token) => onTokenChange(token),
          "error-callback": () => onTokenChange(null),
          "expired-callback": () => onTokenChange(null),
          "timeout-callback": () => onTokenChange(null),
        });
      })
      .catch(() => onTokenChange(null));

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onTokenChange]);

  useEffect(() => {
    if (!dashboardTurnstileSiteKey) return;
    onTokenChange(null);
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [onTokenChange, resetNonce]);

  if (!dashboardTurnstileSiteKey) return null;

  return (
    <div
      data-testid="dashboard-turnstile"
      className="min-h-8 overflow-hidden rounded-xl"
      aria-label="Bot protection"
    >
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
