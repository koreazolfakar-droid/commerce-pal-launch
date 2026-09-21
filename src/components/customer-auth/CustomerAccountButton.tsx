import { UserRound } from "lucide-react";

import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type CustomerAccountButtonProps = {
  variant?: "icon" | "utility";
  className?: string;
};

function displayName(user: ReturnType<typeof useCustomerAuth>["user"]) {
  if (!user) return "";
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const value =
    (typeof metadata?.["full_name"] === "string" && metadata["full_name"]) ||
    (typeof metadata?.["name"] === "string" && metadata["name"]) ||
    user.phone ||
    user.email ||
    "";
  return value.split(" ")[0] || "";
}

export function CustomerAccountButton({
  variant = "icon",
  className,
}: CustomerAccountButtonProps) {
  const { user, loading, openAuth } = useCustomerAuth();
  const { language } = useLanguage();
  const signedIn = Boolean(user);
  const name = displayName(user);
  const label = signedIn
    ? name || (language === "ar" ? "حسابي" : "My account")
    : language === "ar"
      ? "تسجيل الدخول"
      : "Sign in";

  if (variant === "utility") {
    return (
      <button
        type="button"
        onClick={openAuth}
        aria-label={label}
        data-testid="desktop-customer-account"
        className={cn(
          "flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-primary",
          className,
        )}
      >
        <span className="relative">
          <UserRound className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
          {signedIn ? (
            <span
              className="absolute -end-1 -top-1 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-background"
              aria-hidden="true"
            />
          ) : null}
        </span>
        <span>{loading ? (language === "ar" ? "الحساب" : "Account") : label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openAuth}
      aria-label={label}
      title={label}
      data-testid="mobile-customer-account"
      className={cn(
        "press relative grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        className,
      )}
    >
      <UserRound className="h-[21px] w-[21px]" strokeWidth={1.9} aria-hidden="true" />
      {signedIn ? (
        <span
          className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background"
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}
