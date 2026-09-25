import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  ScriptOnce,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { LANGUAGE_INIT_SCRIPT, LanguageProvider, useLanguage } from "@/lib/i18n";

import { DEFAULT_OG_IMAGE } from "@/lib/seo";

import appCss from "../styles.css?url";
import { CustomerAddressHub } from "@/components/customer-account/CustomerAddressHub";
import { CustomerAccountProvider } from "@/components/customer-account/CustomerAccountProvider";
import { CustomerAuthDialog } from "@/components/customer-auth/CustomerAuthDialog";
import { CustomerAuthProvider } from "@/components/customer-auth/CustomerAuthProvider";
import { DeferredToaster } from "@/components/DeferredToaster";
import { useCartSync } from "@/hooks/useCartSync";
import { usePersistedStoreHydration } from "@/hooks/usePersistedStoreHydration";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { STORE_NAME } from "@/lib/storeConfig";
import { buildContentSecurityPolicy } from "@/lib/contentSecurityPolicy";

const FONT_STYLESHEET_URL =
  "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";

const FONT_LOAD_SCRIPT = `(function(){
  var href=${JSON.stringify(FONT_STYLESHEET_URL)};
  if(document.querySelector('link[data-space-call-fonts="stylesheet"]')) return;
  var link=document.createElement("link");
  link.rel="stylesheet";
  link.href=href;
  link.media="print";
  link.dataset.spaceCallFonts="stylesheet";
  link.onload=function(){this.media="all";};
  document.head.appendChild(link);
})();`;

function NotFoundComponent() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("pageNotFound")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("pageNotFoundDetail")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t } = useLanguage();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("somethingWentWrong")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("pageErrorDetail")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                window.location.pathname.startsWith("/dashboard")
              ) {
                window.location.reload();
                return;
              }
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("tryAgain")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("goHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  headers: ({ ssr }) => {
    const nonce = ssr?.nonce;
    if (!nonce) return undefined;
    return {
      "Content-Security-Policy": buildContentSecurityPolicy(nonce),
    };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: STORE_NAME },
      {
        name: "description",
        content: `Shop phones, tablets, audio, wearables and accessories in Lebanon from ${STORE_NAME}.`,
      },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { property: "og:title", content: STORE_NAME },
      {
        property: "og:description",
        content: `Shop phones, tablets, audio, wearables and accessories in Lebanon from ${STORE_NAME}.`,
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: STORE_NAME },
      { property: "og:locale", content: "en_LB" },
      { property: "og:locale:alternate", content: "ar_LB" },
      { property: "og:image", content: DEFAULT_OG_IMAGE },
      { name: "twitter:image", content: DEFAULT_OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
    ],

    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preload", href: "/logo.svg", as: "image", type: "image/svg+xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "preconnect",
        href: "https://rtwyankpxtffqqrasyzw.supabase.co",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: FONT_STYLESHEET_URL,
        as: "style",
      },
      { rel: "icon", href: "/logo.svg", type: "image/svg+xml" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const isArabicLanding = pathname === "/ar";

  return (
    <html
      lang={isArabicLanding ? "ar" : "en"}
      dir={isArabicLanding ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <head>
        <ScriptOnce>{THEME_INIT_SCRIPT}</ScriptOnce>
        <ScriptOnce>{LANGUAGE_INIT_SCRIPT}</ScriptOnce>
        <HeadContent />
        <ScriptOnce>{FONT_LOAD_SCRIPT}</ScriptOnce>
        <noscript>
          <link rel="stylesheet" href={FONT_STYLESHEET_URL} />
        </noscript>
      </head>
      <body>
        <LanguageProvider>
          <LocalizedDocument />
          {children}
        </LanguageProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  usePersistedStoreHydration();
  useCartSync();

  return (
    <QueryClientProvider client={queryClient}>
      <CustomerAuthProvider>
        <CustomerAccountProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <CustomerAuthDialog />
          <CustomerAddressHub />
        </CustomerAccountProvider>
      </CustomerAuthProvider>
      <DeferredToaster />
    </QueryClientProvider>
  );
}

function LocalizedDocument() {
  const { language, direction } = useLanguage();
  const pathname = useLocation({ select: (location) => location.pathname });

  useEffect(() => {
    const routeLanguage = pathname === "/ar" ? "ar" : language;
    const routeDirection = pathname === "/ar" ? "rtl" : direction;
    document.documentElement.lang = routeLanguage;
    document.documentElement.dir = routeDirection;
  }, [language, direction, pathname]);
  return null;
}
