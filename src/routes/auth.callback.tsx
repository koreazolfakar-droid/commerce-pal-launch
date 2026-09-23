import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";

const RETURN_PATH_KEY = "space-call:customer-auth-return-path";

function safeReturnPath() {
  if (typeof window === "undefined") return "/";
  const stored = window.sessionStorage.getItem(RETURN_PATH_KEY) || "/";
  window.sessionStorage.removeItem(RETURN_PATH_KEY);
  if (!stored.startsWith("/") || stored.startsWith("//") || stored.startsWith("/auth/callback")) {
    return "/";
  }
  return stored;
}

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Signing in | Space Call" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GoogleAuthCallback,
});

function GoogleAuthCallback() {
  const { language, direction } = useLanguage();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [detail, setDetail] = useState("");

  const ar = language === "ar";

  useEffect(() => {
    let active = true;

    const finish = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const oauthError = params.get("error");
      const oauthErrorDescription = params.get("error_description");

      if (oauthError) {
        if (!active) return;
        setStatus("error");
        setDetail(oauthErrorDescription || oauthError);
        return;
      }

      if (!code) {
        if (!active) return;
        setStatus("error");
        setDetail(ar ? "لم يصل رمز تسجيل الدخول من Google." : "Google did not return a sign-in code.");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!active) return;

      if (error) {
        setStatus("error");
        setDetail(
          ar
            ? "تعذر إكمال تسجيل الدخول. أعد المحاولة."
            : "We could not complete Google sign-in. Please try again.",
        );
        return;
      }

      setStatus("success");
      const target = safeReturnPath();
      window.setTimeout(() => {
        window.location.replace(target);
      }, 250);
    };

    void finish();
    return () => {
      active = false;
    };
  }, [ar]);

  return (
    <main
      dir={direction}
      className="grid min-h-[70dvh] place-items-center bg-background px-4 py-12"
      data-testid="customer-google-auth-callback"
    >
      <div className="w-full max-w-sm rounded-3xl border border-border/70 bg-card p-6 text-center shadow-sm">
        {status === "loading" ? (
          <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-xl font-extrabold">
              {ar ? "جارٍ تسجيل الدخول عبر Google..." : "Signing you in with Google..."}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {ar ? "لحظة واحدة، نتحقق من حسابك بأمان." : "One moment while we securely verify your account."}
            </p>
          </>
        ) : status === "success" ? (
          <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-xl font-extrabold">
              {ar ? "تم تسجيل الدخول" : "Signed in successfully"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {ar ? "سيتم إعادتك إلى المتجر الآن." : "Returning you to the store now."}
            </p>
          </>
        ) : (
          <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <TriangleAlert className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-xl font-extrabold">
              {ar ? "تعذر تسجيل الدخول" : "Google sign-in failed"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
            <a
              href="/"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
            >
              {ar ? "العودة إلى المتجر" : "Back to store"}
            </a>
          </>
        )}
      </div>
    </main>
  );
}
