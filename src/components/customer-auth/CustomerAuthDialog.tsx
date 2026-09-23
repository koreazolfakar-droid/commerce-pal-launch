import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  LogOut,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useCustomerAccount } from "@/components/customer-account/CustomerAccountProvider";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { STORE_NAME } from "@/lib/storeConfig";

type Step = "sign-in" | "phone" | "otp";

const RETURN_PATH_KEY = "space-call:customer-auth-return-path";
const OTP_COOLDOWN_SECONDS = 60;

function normalizePhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return `+${trimmed.slice(1).replace(/\D/g, "")}`;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("961")) return `+${digits}`;

  const local = digits.startsWith("0") ? digits.slice(1) : digits;
  return `+961${local}`;
}

function customerLabel(user: ReturnType<typeof useCustomerAuth>["user"]) {
  if (!user) return "";
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  return (
    (typeof metadata?.["full_name"] === "string" && metadata["full_name"]) ||
    (typeof metadata?.["name"] === "string" && metadata["name"]) ||
    user.phone ||
    user.email ||
    ""
  );
}

export function CustomerAuthDialog() {
  const { authOpen, setAuthOpen, user, loading: sessionLoading, signOut } = useCustomerAuth();
  const { openAddressBook } = useCustomerAccount();
  const { language, direction } = useLanguage();
  const [step, setStep] = useState<Step>("sign-in");
  const [phoneInput, setPhoneInput] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState<"google" | "phone" | "verify" | "signout" | null>(null);
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const ar = language === "ar";
  const copy = useMemo(
    () =>
      ar
        ? {
            welcome: `مرحبًا بك في ${STORE_NAME}`,
            subtitle: "سجّل دخولك لحفظ معلوماتك ومتابعة طلباتك بسهولة.",
            google: "المتابعة عبر Google",
            or: "أو",
            phone: "تسجيل الدخول برقم الهاتف",
            phoneTitle: "أدخل رقم هاتفك",
            phoneHelp: "سنرسل رمز تحقق لمرة واحدة. لا تحتاج إلى كلمة مرور.",
            phonePlaceholder: "70 123 456",
            sendCode: "إرسال رمز التحقق",
            codeTitle: "أدخل رمز التحقق",
            codeHelp: "أدخل الرمز المكوّن من 6 أرقام الذي أرسلناه إلى",
            verify: "تأكيد الرمز",
            resend: "إعادة إرسال الرمز",
            resendIn: "إعادة الإرسال بعد",
            seconds: "ث",
            back: "رجوع",
            secure: "تسجيل دخول آمن بدون كلمة مرور",
            account: "حسابك",
            signedIn: "تم تسجيل الدخول",
            manageAccount: "الملف الشخصي وعناوين التوصيل",
            signOut: "تسجيل الخروج",
            genericError: "تعذر إكمال العملية الآن. حاول مجددًا.",
            invalidPhone: "أدخل رقم هاتف صحيحًا مع رمز الدولة.",
            invalidCode: "أدخل رمز التحقق المكوّن من 6 أرقام.",
            sent: "تم إرسال رمز التحقق.",
          }
        : {
            welcome: `Welcome to ${STORE_NAME}`,
            subtitle: "Sign in to save your details and follow your orders more easily.",
            google: "Continue with Google",
            or: "or",
            phone: "Continue with phone",
            phoneTitle: "Enter your phone number",
            phoneHelp: "We will send a one-time code. No password needed.",
            phonePlaceholder: "70 123 456",
            sendCode: "Send verification code",
            codeTitle: "Enter verification code",
            codeHelp: "Enter the 6-digit code we sent to",
            verify: "Verify code",
            resend: "Resend code",
            resendIn: "Resend in",
            seconds: "s",
            back: "Back",
            secure: "Secure passwordless sign-in",
            account: "Your account",
            signedIn: "Signed in",
            manageAccount: "Profile & delivery addresses",
            signOut: "Sign out",
            genericError: "We could not complete that action. Please try again.",
            invalidPhone: "Enter a valid phone number with country code.",
            invalidCode: "Enter the 6-digit verification code.",
            sent: "Verification code sent.",
          },
    [ar],
  );

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!authOpen) {
      setMessage("");
      setOtp("");
      if (!user) setStep("sign-in");
    }
  }, [authOpen, user]);

  async function continueWithGoogle() {
    if (typeof window === "undefined") return;
    setPending("google");
    setMessage("");

    try {
      const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (returnPath !== "/") {
        window.sessionStorage.setItem(RETURN_PATH_KEY, returnPath);
      } else {
        window.sessionStorage.removeItem(RETURN_PATH_KEY);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch {
      setMessage(copy.genericError);
      setPending(null);
    }
  }

  async function sendPhoneCode(value = phoneInput) {
    const phone = normalizePhone(value);
    if (!/^\+\d{8,15}$/.test(phone)) {
      setMessage(copy.invalidPhone);
      return;
    }

    setPending("phone");
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setVerifiedPhone(phone);
      setStep("otp");
      setCooldown(OTP_COOLDOWN_SECONDS);
      setMessage(copy.sent);
    } catch {
      setMessage(copy.genericError);
    } finally {
      setPending(null);
    }
  }

  async function verifyCode() {
    const token = otp.replace(/\D/g, "").slice(0, 6);
    if (!/^\d{6}$/.test(token) || !verifiedPhone) {
      setMessage(copy.invalidCode);
      return;
    }

    setPending("verify");
    setMessage("");

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: verifiedPhone,
        token,
        type: "sms",
      });
      if (error) throw error;
      setAuthOpen(false);
    } catch {
      setMessage(copy.genericError);
    } finally {
      setPending(null);
    }
  }

  async function handleSignOut() {
    setPending("signout");
    setMessage("");
    try {
      await signOut();
      setStep("sign-in");
    } catch {
      setMessage(copy.genericError);
    } finally {
      setPending(null);
    }
  }

  const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <Dialog open={authOpen} onOpenChange={setAuthOpen}>
      <DialogContent
        dir={direction}
        data-testid="customer-auth-dialog"
        className="bottom-0 top-auto max-h-[92dvh] w-full max-w-none translate-x-[-50%] translate-y-0 overflow-y-auto rounded-t-[30px] border-x-0 border-b-0 border-border/70 bg-background p-0 shadow-2xl sm:bottom-auto sm:top-[50%] sm:w-[calc(100%-2rem)] sm:max-w-[27rem] sm:translate-y-[-50%] sm:rounded-[30px] sm:border"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-muted sm:hidden" aria-hidden="true" />

        <div className="p-5 pt-4 sm:p-7">
          {user && !sessionLoading ? (
            <div className="space-y-5">
              <DialogHeader className="text-start">
                <div className="mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <UserRound className="h-6 w-6" aria-hidden="true" />
                </div>
                <DialogTitle className="text-2xl font-bold tracking-[-0.02em]">{copy.account}</DialogTitle>
                <DialogDescription>{copy.signedIn}</DialogDescription>
              </DialogHeader>

              <div className="rounded-2xl border border-border/70 bg-surface/60 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{customerLabel(user)}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {user.email || user.phone || copy.signedIn}
                    </p>
                  </div>
                </div>
              </div>

              {message ? (
                <p role="status" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {message}
                </p>
              ) : null}

              <Button
                type="button"
                className="h-12 w-full rounded-2xl font-bold"
                disabled={pending !== null}
                onClick={() => {
                  setAuthOpen(false);
                  openAddressBook();
                }}
              >
                <UserRound className="me-2 h-4 w-4" aria-hidden="true" />
                {copy.manageAccount}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-2xl"
                disabled={pending !== null}
                onClick={handleSignOut}
              >
                {pending === "signout" ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="me-2 h-4 w-4" aria-hidden="true" />
                )}
                {copy.signOut}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {step === "sign-in" ? (
                <>
                  <DialogHeader className="text-start">
                    <div className="mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <UserRound className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <DialogTitle className="text-2xl font-bold tracking-[-0.02em]">{copy.welcome}</DialogTitle>
                    <DialogDescription className="text-sm leading-6">{copy.subtitle}</DialogDescription>
                  </DialogHeader>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-full rounded-2xl border-border/80 bg-card text-sm font-bold shadow-sm hover:bg-surface"
                    onClick={continueWithGoogle}
                    disabled={pending !== null}
                    data-testid="customer-google-signin"
                  >
                    {pending === "google" ? (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <span
                        className="me-2 grid h-5 w-5 place-items-center rounded-full bg-white text-[13px] font-bold text-[#4285F4] shadow-sm ring-1 ring-border/60"
                        aria-hidden="true"
                      >
                        G
                      </span>
                    )}
                    {copy.google}
                  </Button>

                  <div className="flex items-center gap-3" aria-hidden="true">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">{copy.or}</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <Button
                    type="button"
                    className="h-12 w-full rounded-2xl text-sm font-bold shadow-sm"
                    onClick={() => {
                      setMessage("");
                      setStep("phone");
                    }}
                    disabled={pending !== null}
                    data-testid="customer-phone-signin"
                  >
                    <Phone className="me-2 h-4 w-4" aria-hidden="true" />
                    {copy.phone}
                  </Button>
                </>
              ) : null}

              {step === "phone" ? (
                <>
                  <DialogHeader className="text-start">
                    <button
                      type="button"
                      onClick={() => {
                        setMessage("");
                        setStep("sign-in");
                      }}
                      className="mb-2 flex w-fit items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-muted-foreground hover:bg-surface hover:text-foreground"
                    >
                      <BackIcon className="h-4 w-4" aria-hidden="true" />
                      {copy.back}
                    </button>
                    <DialogTitle className="text-2xl font-bold tracking-[-0.02em]">{copy.phoneTitle}</DialogTitle>
                    <DialogDescription className="leading-6">{copy.phoneHelp}</DialogDescription>
                  </DialogHeader>

                  <label className="block">
                    <span className="sr-only">{copy.phoneTitle}</span>
                    <div className="flex h-13 items-center rounded-2xl border border-border/80 bg-card px-4 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                      <span className="me-2 shrink-0 border-e border-border pe-3 text-sm font-bold">🇱🇧 +961</span>
                      <input
                        inputMode="tel"
                        autoComplete="tel"
                        value={phoneInput}
                        onChange={(event) => setPhoneInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void sendPhoneCode();
                        }}
                        placeholder={copy.phonePlaceholder}
                        className="h-12 min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground/70"
                        data-testid="customer-phone-input"
                      />
                    </div>
                  </label>

                  <Button
                    type="button"
                    className="h-12 w-full rounded-2xl font-bold"
                    disabled={pending !== null}
                    onClick={() => void sendPhoneCode()}
                  >
                    {pending === "phone" ? (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    {copy.sendCode}
                  </Button>
                </>
              ) : null}

              {step === "otp" ? (
                <>
                  <DialogHeader className="text-start">
                    <button
                      type="button"
                      onClick={() => {
                        setMessage("");
                        setOtp("");
                        setStep("phone");
                      }}
                      className="mb-2 flex w-fit items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-muted-foreground hover:bg-surface hover:text-foreground"
                    >
                      <BackIcon className="h-4 w-4" aria-hidden="true" />
                      {copy.back}
                    </button>
                    <DialogTitle className="text-2xl font-bold tracking-[-0.02em]">{copy.codeTitle}</DialogTitle>
                    <DialogDescription className="leading-6">
                      {copy.codeHelp} <bdi className="font-bold text-foreground">{verifiedPhone}</bdi>
                    </DialogDescription>
                  </DialogHeader>

                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void verifyCode();
                    }}
                    aria-label={copy.codeTitle}
                    data-testid="customer-otp-input"
                    className="h-14 w-full rounded-2xl border border-border/80 bg-card px-4 text-center text-2xl font-bold tabular-nums tracking-[0.38em] outline-none shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />

                  <Button
                    type="button"
                    className="h-12 w-full rounded-2xl font-bold"
                    disabled={pending !== null}
                    onClick={() => void verifyCode()}
                  >
                    {pending === "verify" ? (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    {copy.verify}
                  </Button>

                  <button
                    type="button"
                    disabled={cooldown > 0 || pending !== null}
                    onClick={() => void sendPhoneCode(verifiedPhone)}
                    className="mx-auto block rounded-full px-3 py-2 text-xs font-bold text-primary disabled:cursor-not-allowed disabled:text-muted-foreground"
                  >
                    {cooldown > 0
                      ? `${copy.resendIn} ${cooldown}${copy.seconds}`
                      : copy.resend}
                  </button>
                </>
              ) : null}

              {message ? (
                <p
                  role="status"
                  className={
                    message === copy.sent
                      ? "rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
                      : "rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  }
                >
                  {message}
                </p>
              ) : null}

              <div className="flex items-center justify-center gap-2 pt-1 text-[11px] font-semibold text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>{copy.secure}</span>
                <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
