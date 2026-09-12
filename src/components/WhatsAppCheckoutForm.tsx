import { useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Copy,
  CreditCard,
  MapPin,
  MessageCircle,
  Phone,
  StickyNote,
  UserRound,
  WalletCards,
} from "lucide-react";

import { useLanguage } from "@/lib/i18n";
import { formatPrice, variantSummary } from "@/lib/shopify";
import { STORE_NAME, storeUrl } from "@/lib/storeConfig";
import { whatsappUrl } from "@/lib/whatsapp";
import type { CartItem } from "@/stores/cartStore";

const STORAGE_KEY = "space-call-whatsapp-checkout-customer";
const WHISH_MONEY_ACCOUNT = (import.meta.env.VITE_WHISH_MONEY_ACCOUNT ?? "").trim();
const WHISH_MONEY_ACCOUNT_NAME = (import.meta.env.VITE_WHISH_MONEY_ACCOUNT_NAME ?? STORE_NAME).trim();

type PaymentMethod = "cash_on_delivery" | "whish_money";

type CustomerDetails = {
  name: string;
  phone: string;
  area: string;
  address: string;
  landmark: string;
  notes: string;
  paymentMethod: PaymentMethod;
};

type SharedLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

const EMPTY_DETAILS: CustomerDetails = {
  name: "",
  phone: "",
  area: "",
  address: "",
  landmark: "",
  notes: "",
  paymentMethod: "cash_on_delivery",
};

interface WhatsAppCheckoutFormProps {
  items: CartItem[];
  total: number;
  currency: string;
  disabled?: boolean;
}

function orderReference() {
  const now = new Date();
  const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("");
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join("");
  return `SC-${date}-${time}`;
}

function googleMapsUrl(location: SharedLocation) {
  const latitude = location.latitude.toFixed(6);
  const longitude = location.longitude.toFixed(6);
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function getCurrentLocation(): Promise<SharedLocation | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  });
}

export function WhatsAppCheckoutForm({
  items,
  total,
  currency,
  disabled = false,
}: WhatsAppCheckoutFormProps) {
  const { language } = useLanguage();
  const isArabic = language === "ar";
  const [details, setDetails] = useState<CustomerDetails>(EMPTY_DETAILS);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareLocation, setShareLocation] = useState(true);
  const [location, setLocation] = useState<SharedLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationFailed, setLocationFailed] = useState(false);

  const whishConfigured = WHISH_MONEY_ACCOUNT.length > 0;

  const copy = isArabic
    ? {
        title: "اطلب عبر واتساب",
        description: "املأ بيانات التوصيل واختر طريقة الدفع، وسنرسل تفاصيل السلة كاملة إلى واتساب.",
        name: "الاسم الكامل",
        namePlaceholder: "مثال: حسين علي",
        phone: "رقم الهاتف",
        phonePlaceholder: "+961 71 000 000",
        area: "المنطقة / المدينة",
        areaPlaceholder: "مثال: صيدا",
        address: "العنوان بالتفصيل",
        addressPlaceholder: "الحي، الشارع، المبنى والطابق",
        landmark: "أقرب نقطة دالة (اختياري)",
        landmarkPlaceholder: "مثال: قرب الساحة الرئيسية",
        locationTitle: "الموقع الحالي",
        locationDescription:
          "سنرفق رابط موقعك الحالي تلقائيًا مع رسالة واتساب عند الإرسال. سيطلب المتصفح إذنك أولًا.",
        attachLocation: "إرفاق موقعي تلقائيًا",
        detectLocation: "تحديد موقعي الآن",
        locating: "جارٍ تحديد الموقع...",
        locationReady: "تم تحديد الموقع وسيُرفق مع الطلب.",
        locationUnavailable: "تعذر تحديد الموقع. يمكنك متابعة إرسال الطلب بدون الموقع.",
        locationLabel: "الموقع على الخريطة",
        notes: "ملاحظات الطلب (اختياري)",
        notesPlaceholder: "لون مفضل، وقت مناسب للتوصيل، أو أي ملاحظة",
        paymentTitle: "طريقة الدفع",
        cashOnDelivery: "الدفع عند الاستلام",
        cashOnDeliveryDescription: "ادفع نقدًا عند استلام الطلب.",
        whishMoney: "Whish Money",
        whishMoneyDescription: "حوّل قيمة الطلب مباشرة إلى حساب المتجر عبر Whish Money.",
        whishAccount: "حساب Whish Money",
        whishAccountName: "اسم الحساب",
        copyAccount: "نسخ الحساب",
        copied: "تم النسخ",
        whishUnavailable: "حساب Whish Money غير مضبوط بعد.",
        button: "إرسال الطلب عبر واتساب",
        required: "يرجى تعبئة الاسم ورقم الهاتف والمنطقة والعنوان قبل إرسال الطلب.",
        privacy:
          "لن نصل إلى موقعك إلا بعد موافقتك. يُرسل رابط الموقع فقط ضمن رسالة واتساب عند الإرسال، ولا يتم حفظ الإحداثيات في بيانات النموذج.",
        ready: "تم تجهيز الطلب — سيتم فتح واتساب الآن.",
      }
    : {
        title: "Order via WhatsApp",
        description: "Fill in your delivery details, choose a payment method, and we’ll prepare your full cart for WhatsApp.",
        name: "Full name",
        namePlaceholder: "e.g. Hussein Ali",
        phone: "Phone number",
        phonePlaceholder: "+961 71 000 000",
        area: "Area / city",
        areaPlaceholder: "e.g. Saida",
        address: "Full delivery address",
        addressPlaceholder: "District, street, building and floor",
        landmark: "Nearby landmark (optional)",
        landmarkPlaceholder: "e.g. Near the main square",
        locationTitle: "Current location",
        locationDescription:
          "We’ll automatically attach your current location to the WhatsApp order when you send it. Your browser will ask for permission first.",
        attachLocation: "Attach my location automatically",
        detectLocation: "Detect my location now",
        locating: "Detecting location...",
        locationReady: "Location detected and will be attached to the order.",
        locationUnavailable: "We couldn't detect your location. You can still send the order without it.",
        locationLabel: "Map location",
        notes: "Order notes (optional)",
        notesPlaceholder: "Preferred colour, delivery time, or any request",
        paymentTitle: "Payment method",
        cashOnDelivery: "Cash on delivery",
        cashOnDeliveryDescription: "Pay in cash when you receive your order.",
        whishMoney: "Whish Money",
        whishMoneyDescription: "Transfer the order total directly to the store's Whish Money account.",
        whishAccount: "Whish Money account",
        whishAccountName: "Account name",
        copyAccount: "Copy account",
        copied: "Copied",
        whishUnavailable: "Whish Money account is not configured yet.",
        button: "Send order on WhatsApp",
        required: "Please fill in your name, phone number, area and address before sending the order.",
        privacy:
          "We only access your location after you approve it. The map link is added only to the WhatsApp message and the coordinates are not stored with your saved form details.",
        ready: "Order prepared — opening WhatsApp now.",
      };

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<CustomerDetails>;
      setDetails({ ...EMPTY_DETAILS, ...parsed });
    } catch {
      // Ignore malformed or unavailable local storage and keep the form usable.
    }
  }, []);

  const update = <K extends keyof CustomerDetails>(field: K, value: CustomerDetails[K]) => {
    setDetails((current) => ({ ...current, [field]: value }));
    setError("");
    setSubmitted(false);
  };

  const copyWhishAccount = async () => {
    if (!WHISH_MONEY_ACCOUNT) return;
    try {
      await navigator.clipboard.writeText(WHISH_MONEY_ACCOUNT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked by browser permissions; the account stays visible for manual copying.
    }
  };

  const locateCustomer = async () => {
    setLocating(true);
    setLocationFailed(false);
    const result = await getCurrentLocation();
    setLocating(false);

    if (result) {
      setLocation(result);
      setSubmitted(false);
      return result;
    }

    setLocation(null);
    setLocationFailed(true);
    return null;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const required = [details.name, details.phone, details.area, details.address];
    if (required.some((value) => value.trim().length < 2)) {
      setError(copy.required);
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(details));
    } catch {
      // Checkout must still work when storage is blocked.
    }

    let resolvedLocation = location;
    if (shareLocation && !resolvedLocation) {
      resolvedLocation = await locateCustomer();
    }

    const reference = orderReference();
    const paymentLabel = details.paymentMethod === "whish_money" ? copy.whishMoney : copy.cashOnDelivery;
    const lines = items.flatMap((item, index) => {
      const options = variantSummary(item.selectedOptions);
      const unitPrice = formatPrice(item.price.amount, item.price.currencyCode);
      const lineTotal = formatPrice(Number(item.price.amount) * item.quantity, item.price.currencyCode);
      return [
        `${index + 1}. ${item.product.node.title}`,
        options ? `   ${isArabic ? "الخيار" : "Variant"}: ${options}` : "",
        `   ${isArabic ? "الكمية" : "Qty"}: ${item.quantity}`,
        `   ${isArabic ? "السعر" : "Price"}: ${unitPrice}${item.quantity > 1 ? ` • ${isArabic ? "الإجمالي" : "Line total"}: ${lineTotal}` : ""}`,
        `   ${storeUrl(`/product/${item.product.node.handle}`)}`,
      ].filter(Boolean);
    });

    const message = [
      `🛍️ ${isArabic ? "طلب جديد" : "New order"} — ${STORE_NAME}`,
      `${isArabic ? "رقم الطلب" : "Order ref"}: ${reference}`,
      "",
      `👤 ${isArabic ? "بيانات الزبون" : "Customer details"}`,
      `${isArabic ? "الاسم" : "Name"}: ${details.name.trim()}`,
      `${isArabic ? "الهاتف" : "Phone"}: ${details.phone.trim()}`,
      `${isArabic ? "المنطقة" : "Area"}: ${details.area.trim()}`,
      `${isArabic ? "العنوان" : "Address"}: ${details.address.trim()}`,
      details.landmark.trim() ? `${isArabic ? "نقطة دالة" : "Landmark"}: ${details.landmark.trim()}` : "",
      shareLocation && resolvedLocation
        ? `📍 ${copy.locationLabel}: ${googleMapsUrl(resolvedLocation)}`
        : "",
      "",
      `💳 ${isArabic ? "طريقة الدفع" : "Payment method"}: ${paymentLabel}`,
      details.paymentMethod === "whish_money" && whishConfigured
        ? `📱 ${copy.whishAccount}: ${WHISH_MONEY_ACCOUNT}`
        : "",
      details.paymentMethod === "whish_money" && whishConfigured
        ? `👤 ${copy.whishAccountName}: ${WHISH_MONEY_ACCOUNT_NAME}`
        : "",
      "",
      `📦 ${isArabic ? "المنتجات" : "Items"}`,
      ...lines,
      "",
      `💰 ${isArabic ? "المجموع" : "Total"}: ${formatPrice(total, currency)}`,
      details.notes.trim() ? `📝 ${isArabic ? "ملاحظات" : "Notes"}: ${details.notes.trim()}` : "",
      "",
      `${isArabic ? "تم إنشاء الطلب من" : "Order created from"}: ${storeUrl("/cart")}`,
    ].filter(Boolean);

    setSubmitted(true);
    const target = whatsappUrl(message.join("\n"));
    const popup = window.open(target, "_blank", "noopener,noreferrer");
    if (!popup) {
      window.location.assign(target);
    }
  };

  const fieldClass =
    "mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

  const paymentCardClass = (selected: boolean) =>
    `flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
      selected
        ? "border-primary bg-primary/5 ring-2 ring-primary/10"
        : "border-border bg-background hover:border-primary/40"
    }`;

  return (
    <section
      id="whatsapp-checkout"
      className="mt-6 scroll-mt-24 rounded-2xl border bg-card p-5 shadow-card"
      aria-labelledby="whatsapp-checkout-title"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h2 id="whatsapp-checkout-title" className="text-lg font-extrabold tracking-tight">
            {copy.title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.description}</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              {copy.name} <span className="text-destructive">*</span>
            </span>
            <input
              value={details.name}
              onChange={(event) => update("name", event.target.value)}
              autoComplete="name"
              maxLength={80}
              placeholder={copy.namePlaceholder}
              className={fieldClass}
              required
            />
          </label>

          <label className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {copy.phone} <span className="text-destructive">*</span>
            </span>
            <input
              type="tel"
              inputMode="tel"
              value={details.phone}
              onChange={(event) => update("phone", event.target.value)}
              autoComplete="tel"
              maxLength={30}
              placeholder={copy.phonePlaceholder}
              className={fieldClass}
              required
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {copy.area} <span className="text-destructive">*</span>
            </span>
            <input
              value={details.area}
              onChange={(event) => update("area", event.target.value)}
              autoComplete="address-level2"
              maxLength={80}
              placeholder={copy.areaPlaceholder}
              className={fieldClass}
              required
            />
          </label>

          <label className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {copy.landmark}
            </span>
            <input
              value={details.landmark}
              onChange={(event) => update("landmark", event.target.value)}
              maxLength={120}
              placeholder={copy.landmarkPlaceholder}
              className={fieldClass}
            />
          </label>
        </div>

        <label className="block text-sm font-semibold">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {copy.address} <span className="text-destructive">*</span>
          </span>
          <textarea
            value={details.address}
            onChange={(event) => update("address", event.target.value)}
            autoComplete="street-address"
            rows={3}
            maxLength={240}
            placeholder={copy.addressPlaceholder}
            className={`${fieldClass} resize-y`}
            required
          />
        </label>

        <div className="rounded-2xl border bg-muted/30 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={shareLocation}
              onChange={(event) => {
                setShareLocation(event.target.checked);
                setLocationFailed(false);
                setSubmitted(false);
              }}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-extrabold">
                <MapPin className="h-4 w-4 text-primary" />
                {copy.attachLocation}
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {copy.locationDescription}
              </span>
            </span>
          </label>

          {shareLocation ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 ps-7">
              <button
                type="button"
                onClick={locateCustomer}
                disabled={locating}
                className="inline-flex items-center gap-2 rounded-full border bg-background px-3.5 py-2 text-xs font-bold transition hover:bg-muted disabled:cursor-wait disabled:opacity-60"
              >
                <MapPin className="h-3.5 w-3.5" />
                {locating ? copy.locating : copy.detectLocation}
              </button>

              {location ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {copy.locationReady}
                </span>
              ) : null}

              {locationFailed ? (
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  {copy.locationUnavailable}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <fieldset className="space-y-3">
          <legend className="flex items-center gap-2 text-sm font-extrabold">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            {copy.paymentTitle}
          </legend>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className={paymentCardClass(details.paymentMethod === "cash_on_delivery")}>
              <input
                type="radio"
                name="payment-method"
                value="cash_on_delivery"
                checked={details.paymentMethod === "cash_on_delivery"}
                onChange={() => update("paymentMethod", "cash_on_delivery")}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <span>
                <span className="flex items-center gap-2 font-bold">
                  <WalletCards className="h-4 w-4" />
                  {copy.cashOnDelivery}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {copy.cashOnDeliveryDescription}
                </span>
              </span>
            </label>

            <label className={paymentCardClass(details.paymentMethod === "whish_money")}>
              <input
                type="radio"
                name="payment-method"
                value="whish_money"
                checked={details.paymentMethod === "whish_money"}
                onChange={() => update("paymentMethod", "whish_money")}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-bold">
                  <CreditCard className="h-4 w-4" />
                  {copy.whishMoney}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {copy.whishMoneyDescription}
                </span>
              </span>
            </label>
          </div>

          {details.paymentMethod === "whish_money" ? (
            whishConfigured ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {copy.whishAccount}
                    </p>
                    <p dir="ltr" className="mt-1 text-lg font-extrabold tracking-wide">
                      {WHISH_MONEY_ACCOUNT}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {copy.whishAccountName}: {WHISH_MONEY_ACCOUNT_NAME}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copyWhishAccount}
                    className="inline-flex items-center gap-2 rounded-full border bg-background px-3.5 py-2 text-xs font-bold transition hover:bg-muted"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? copy.copied : copy.copyAccount}
                  </button>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {isArabic
                    ? `حوّل ${formatPrice(total, currency)} إلى الحساب الظاهر أعلاه، ثم أرسل الطلب عبر واتساب لتأكيد التحويل.`
                    : `Transfer ${formatPrice(total, currency)} to the account above, then send the order on WhatsApp to confirm the transfer.`}
                </p>
              </div>
            ) : (
              <p className="rounded-xl bg-amber-500/10 px-3.5 py-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                {copy.whishUnavailable}
              </p>
            )
          ) : null}
        </fieldset>

        <label className="block text-sm font-semibold">
          <span className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            {copy.notes}
          </span>
          <textarea
            value={details.notes}
            onChange={(event) => update("notes", event.target.value)}
            rows={3}
            maxLength={300}
            placeholder={copy.notesPlaceholder}
            className={`${fieldClass} resize-y`}
          />
        </label>

        {error ? (
          <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        {submitted ? (
          <p className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3.5 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {copy.ready}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={
            disabled ||
            items.length === 0 ||
            locating ||
            (details.paymentMethod === "whish_money" && !whishConfigured)
          }
          className="press flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <MessageCircle className="h-4 w-4" />
          {locating ? copy.locating : copy.button}
        </button>

        <p className="text-center text-xs leading-5 text-muted-foreground">{copy.privacy}</p>
      </form>
    </section>
  );
}
