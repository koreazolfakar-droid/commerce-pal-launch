import { useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Phone,
  StickyNote,
  UserRound,
  WalletCards,
} from "lucide-react";

import { useLanguage } from "@/lib/i18n";
import { downloadOrderInvoicePdf } from "@/lib/orderInvoice";
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

type LocationErrorReason =
  | "unsupported"
  | "insecure"
  | "permission_denied"
  | "unavailable"
  | "timeout"
  | "unknown";

type LocationResult =
  | { location: SharedLocation; error: null }
  | { location: null; error: LocationErrorReason };

const EMPTY_DETAILS: CustomerDetails = {
  name: "",
  phone: "",
  area: "",
  address: "",
  landmark: "",
  notes: "",
  paymentMethod: "cash_on_delivery",
};

interface CheckoutDetailsFormProps {
  items: CartItem[];
  total: number;
  currency: string;
  disabled?: boolean;
}

function orderReference(now = new Date()) {
  const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("");
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join("");
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `SC-${date}-${time}-${random}`;
}

function invoiceNumber(reference: string) {
  return reference.replace(/^SC-/, "SC-INV-");
}

function googleMapsUrl(location: SharedLocation) {
  return `https://www.google.com/maps?q=${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
}

function googleMapsEmbedUrl(location: SharedLocation) {
  return `https://maps.google.com/maps?q=${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}&z=17&output=embed`;
}

function geolocationErrorReason(error: GeolocationPositionError): LocationErrorReason {
  if (error.code === error.PERMISSION_DENIED) return "permission_denied";
  if (error.code === error.POSITION_UNAVAILABLE) return "unavailable";
  if (error.code === error.TIMEOUT) return "timeout";
  return "unknown";
}

function requestCurrentPosition(options: PositionOptions): Promise<LocationResult> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          error: null,
        }),
      (error) => resolve({ location: null, error: geolocationErrorReason(error) }),
      options,
    );
  });
}

async function getCurrentLocation(): Promise<LocationResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { location: null, error: "unsupported" };
  }
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return { location: null, error: "insecure" };
  }

  const precise = await requestCurrentPosition({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 30000,
  });

  if (precise.location || precise.error === "permission_denied") return precise;

  return requestCurrentPosition({
    enableHighAccuracy: false,
    timeout: 8000,
    maximumAge: 300000,
  });
}

export function CheckoutDetailsForm({
  items,
  total,
  currency,
  disabled = false,
}: CheckoutDetailsFormProps) {
  const { language } = useLanguage();
  const isArabic = language === "ar";
  const [details, setDetails] = useState<CustomerDetails>(EMPTY_DETAILS);
  const [shareLocation, setShareLocation] = useState(true);
  const [location, setLocation] = useState<SharedLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<LocationErrorReason | null>(null);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [referenceCreatedAt, setReferenceCreatedAt] = useState<Date | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const whishConfigured = WHISH_MONEY_ACCOUNT.length > 0;

  const copy = isArabic
    ? {
        title: "إتمام الطلب عبر واتساب",
        description: "أدخل بيانات التوصيل، حدّد الموقع إن رغبت، ثم اختر طريقة الدفع.",
        delivery: "بيانات التوصيل",
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
        location: "الموقع",
        attachLocation: "إضافة موقعي الحالي",
        locationDescription: "اختياري — نرفق رابط الموقع مع طلب واتساب.",
        detectLocation: "تحديد الموقع",
        locating: "جارٍ تحديد الموقع...",
        locationReady: "تم تحديد الموقع",
        mapPreview: "معاينة الموقع",
        openMap: "فتح في Google Maps",
        accuracy: "الدقة",
        retryLocation: "إعادة المحاولة",
        continueWithoutLocation: "المتابعة بدون الموقع",
        permissionDenied: "صلاحية الموقع محظورة لهذا الموقع.",
        permissionHelp: "اسمح للموقع بالوصول إلى Location من إعدادات المتصفح ثم أعد المحاولة.",
        unavailable: "تعذر الحصول على إشارة الموقع. تأكد أن GPS مفعّل ثم أعد المحاولة.",
        timeout: "استغرق تحديد الموقع وقتًا طويلًا. أعد المحاولة.",
        unsupported: "هذا المتصفح لا يدعم تحديد الموقع.",
        insecure: "تحديد الموقع يحتاج اتصال HTTPS آمنًا.",
        unknown: "تعذر تحديد الموقع الآن.",
        payment: "طريقة الدفع",
        cash: "الدفع عند الاستلام",
        cashDescription: "ادفع نقدًا عند استلام طلبك.",
        whish: "Whish Money",
        whishDescription: "حوّل قيمة الطلب إلى حساب المتجر.",
        whishAccount: "حساب Whish Money",
        whishAccountName: "اسم الحساب",
        copyAccount: "نسخ الحساب",
        copied: "تم النسخ",
        whishUnavailable: "حساب Whish Money غير مضبوط بعد.",
        notes: "ملاحظات الطلب (اختياري)",
        notesPlaceholder: "لون مفضل، وقت التوصيل، أو أي ملاحظة",
        send: "إرسال الطلب عبر واتساب",
        summaryPdf: "تحميل ملخص الطلب PDF",
        invoicePdf: "تحميل الفاتورة PDF",
        preparingPdf: "جارٍ تجهيز PDF...",
        required: "يرجى تعبئة الاسم ورقم الهاتف والمنطقة والعنوان أولًا.",
        pdfError: "تعذر إنشاء ملف PDF الآن. جرّب مرة أخرى.",
        ready: "تم تجهيز الطلب. يمكنك الاحتفاظ بنسخة PDF أو متابعة واتساب.",
        privacy: "لا نستخدم موقعك إلا بعد موافقتك، ويتم إنشاء ملف PDF محليًا على جهازك.",
        invoiceLabel: "رقم الفاتورة",
        mapLabel: "الموقع على الخريطة",
      }
    : {
        title: "Complete your order on WhatsApp",
        description: "Add delivery details, optionally attach your location, then choose payment.",
        delivery: "Delivery details",
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
        location: "Location",
        attachLocation: "Add my current location",
        locationDescription: "Optional — we attach the map link to your WhatsApp order.",
        detectLocation: "Detect location",
        locating: "Detecting location...",
        locationReady: "Location detected",
        mapPreview: "Location preview",
        openMap: "Open in Google Maps",
        accuracy: "Accuracy",
        retryLocation: "Try again",
        continueWithoutLocation: "Continue without location",
        permissionDenied: "Location permission is blocked for this site.",
        permissionHelp: "Allow Location for this site in your browser settings, then try again.",
        unavailable: "We couldn't get a location signal. Turn on GPS and try again.",
        timeout: "Location detection timed out. Please try again.",
        unsupported: "This browser doesn't support location.",
        insecure: "Location requires a secure HTTPS connection.",
        unknown: "We couldn't detect your location right now.",
        payment: "Payment method",
        cash: "Cash on delivery",
        cashDescription: "Pay in cash when you receive your order.",
        whish: "Whish Money",
        whishDescription: "Transfer the order total to the store account.",
        whishAccount: "Whish Money account",
        whishAccountName: "Account name",
        copyAccount: "Copy account",
        copied: "Copied",
        whishUnavailable: "Whish Money account is not configured yet.",
        notes: "Order notes (optional)",
        notesPlaceholder: "Preferred colour, delivery time, or any request",
        send: "Send order on WhatsApp",
        summaryPdf: "Download order summary PDF",
        invoicePdf: "Download invoice PDF",
        preparingPdf: "Preparing PDF...",
        required: "Please fill in your name, phone number, area and address first.",
        pdfError: "We couldn't generate the PDF right now. Please try again.",
        ready: "Order prepared. You can keep a PDF copy or continue on WhatsApp.",
        privacy: "We use your location only after approval, and the PDF is generated locally on your device.",
        invoiceLabel: "Invoice number",
        mapLabel: "Map location",
      };

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<CustomerDetails>;
      setDetails({ ...EMPTY_DETAILS, ...parsed });
    } catch {
      // Keep checkout usable if storage is blocked or malformed.
    }
  }, []);

  const update = <K extends keyof CustomerDetails>(field: K, value: CustomerDetails[K]) => {
    setDetails((current) => ({ ...current, [field]: value }));
    setError("");
    setSubmitted(false);
  };

  const persistDetails = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(details));
    } catch {
      // Storage is optional.
    }
  };

  const validateDetails = () => {
    const required = [details.name, details.phone, details.area, details.address];
    if (required.some((value) => value.trim().length < 2)) {
      setError(copy.required);
      return false;
    }
    if (details.paymentMethod === "whish_money" && !whishConfigured) {
      setError(copy.whishUnavailable);
      return false;
    }
    return true;
  };

  const ensureOrderIdentity = () => {
    if (reference && referenceCreatedAt) return { reference, createdAt: referenceCreatedAt };
    const createdAt = new Date();
    const nextReference = orderReference(createdAt);
    setReference(nextReference);
    setReferenceCreatedAt(createdAt);
    return { reference: nextReference, createdAt };
  };

  const locateCustomer = async () => {
    setLocating(true);
    setLocationError(null);
    const result = await getCurrentLocation();
    setLocating(false);
    if (result.location) {
      setLocation(result.location);
      setSubmitted(false);
      return result.location;
    }
    setLocation(null);
    setLocationError(result.error);
    return null;
  };

  const locationErrorMessage = () => {
    switch (locationError) {
      case "permission_denied":
        return copy.permissionDenied;
      case "unavailable":
        return copy.unavailable;
      case "timeout":
        return copy.timeout;
      case "unsupported":
        return copy.unsupported;
      case "insecure":
        return copy.insecure;
      case "unknown":
        return copy.unknown;
      default:
        return "";
    }
  };

  const copyWhishAccount = async () => {
    if (!WHISH_MONEY_ACCOUNT) return;
    try {
      await navigator.clipboard.writeText(WHISH_MONEY_ACCOUNT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Account remains visible for manual copying.
    }
  };

  const buildInvoiceInput = (orderIdentity: { reference: string; createdAt: Date }) => ({
    invoiceNumber: invoiceNumber(orderIdentity.reference),
    orderReference: orderIdentity.reference,
    createdAt: orderIdentity.createdAt,
    language: (isArabic ? "ar" : "en") as "ar" | "en",
    currency,
    total,
    customer: {
      name: details.name.trim(),
      phone: details.phone.trim(),
      area: details.area.trim(),
      address: details.address.trim(),
      landmark: details.landmark.trim(),
      notes: details.notes.trim(),
    },
    paymentMethod: details.paymentMethod === "whish_money" ? copy.whish : copy.cash,
    paymentStatus:
      details.paymentMethod === "whish_money"
        ? isArabic
          ? "بانتظار تأكيد التحويل"
          : "Pending transfer confirmation"
        : isArabic
          ? "مستحق عند الاستلام"
          : "Due on delivery",
    items: items.map((item) => ({
      title: item.product.node.title,
      variant: variantSummary(item.selectedOptions),
      quantity: item.quantity,
      unitPrice: Number(item.price.amount),
      lineTotal: Number(item.price.amount) * item.quantity,
    })),
  });

  const downloadPdf = async () => {
    if (!validateDetails() || items.length === 0) return;
    persistDetails();
    const orderIdentity = ensureOrderIdentity();
    setPdfBusy(true);
    setError("");
    try {
      await downloadOrderInvoicePdf(buildInvoiceInput(orderIdentity));
    } catch (pdfError) {
      console.error("Order PDF generation failed", pdfError);
      setError(copy.pdfError);
    } finally {
      setPdfBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateDetails()) return;
    persistDetails();

    let resolvedLocation = location;
    if (shareLocation && !resolvedLocation) resolvedLocation = await locateCustomer();

    const orderIdentity = ensureOrderIdentity();
    const referenceValue = orderIdentity.reference;
    const invoiceValue = invoiceNumber(referenceValue);
    const paymentLabel = details.paymentMethod === "whish_money" ? copy.whish : copy.cash;
    const itemLines = items.flatMap((item, index) => {
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
      `${isArabic ? "رقم الطلب" : "Order ref"}: ${referenceValue}`,
      `${copy.invoiceLabel}: ${invoiceValue}`,
      "",
      `👤 ${isArabic ? "بيانات الزبون" : "Customer details"}`,
      `${isArabic ? "الاسم" : "Name"}: ${details.name.trim()}`,
      `${isArabic ? "الهاتف" : "Phone"}: ${details.phone.trim()}`,
      `${isArabic ? "المنطقة" : "Area"}: ${details.area.trim()}`,
      `${isArabic ? "العنوان" : "Address"}: ${details.address.trim()}`,
      details.landmark.trim() ? `${isArabic ? "نقطة دالة" : "Landmark"}: ${details.landmark.trim()}` : "",
      shareLocation && resolvedLocation ? `📍 ${copy.mapLabel}: ${googleMapsUrl(resolvedLocation)}` : "",
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
      ...itemLines,
      "",
      `💰 ${isArabic ? "المجموع" : "Total"}: ${formatPrice(total, currency)}`,
      details.notes.trim() ? `📝 ${isArabic ? "ملاحظات" : "Notes"}: ${details.notes.trim()}` : "",
      "",
      `${isArabic ? "تم إنشاء الطلب من" : "Order created from"}: ${storeUrl("/cart")}`,
    ].filter(Boolean);

    setSubmitted(true);
    const target = whatsappUrl(message.join("\n"));
    const popup = window.open(target, "_blank", "noopener,noreferrer");
    if (!popup) window.location.assign(target);
  };

  const fieldClass =
    "mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
  const paymentCardClass = (selected: boolean) =>
    `flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition ${
      selected
        ? "border-primary bg-primary/5 ring-2 ring-primary/10"
        : "border-border bg-background hover:border-primary/40"
    }`;
  const actionDisabled =
    disabled || items.length === 0 || locating || (details.paymentMethod === "whish_money" && !whishConfigured);

  return (
    <section
      id="whatsapp-checkout"
      className="mt-5 scroll-mt-20 rounded-2xl border bg-card p-4 shadow-card sm:p-5"
      aria-labelledby="whatsapp-checkout-title"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 id="whatsapp-checkout-title" className="text-lg font-extrabold tracking-tight">
            {copy.title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">{copy.description}</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-5" noValidate>
        <section aria-labelledby="delivery-details-title" className="space-y-4">
          <h3 id="delivery-details-title" className="text-sm font-extrabold tracking-tight">
            {copy.delivery}
          </h3>

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

          <label className="block text-sm font-semibold">
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

          <label className="block text-sm font-semibold">
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {copy.address} <span className="text-destructive">*</span>
            </span>
            <textarea
              value={details.address}
              onChange={(event) => update("address", event.target.value)}
              autoComplete="street-address"
              rows={2}
              maxLength={240}
              placeholder={copy.addressPlaceholder}
              className={`${fieldClass} resize-y`}
              required
            />
          </label>

          <label className="block text-sm font-semibold">
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
        </section>

        <section aria-labelledby="location-section-title" className="rounded-xl border bg-muted/20 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <label className="flex min-w-0 cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={shareLocation}
                onChange={(event) => {
                  setShareLocation(event.target.checked);
                  setLocationError(null);
                  setSubmitted(false);
                }}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <span className="min-w-0">
                <span id="location-section-title" className="flex items-center gap-2 text-sm font-extrabold">
                  <MapPin className="h-4 w-4 text-primary" />
                  {copy.attachLocation}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                  {copy.locationDescription}
                </span>
              </span>
            </label>
          </div>

          {shareLocation ? (
            <div className="mt-3 space-y-3 sm:ps-7">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={locateCustomer}
                  disabled={locating}
                  className="inline-flex items-center gap-2 rounded-full border bg-background px-3.5 py-2 text-xs font-bold transition hover:bg-muted disabled:cursor-wait disabled:opacity-60"
                >
                  {locating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                  {locating ? copy.locating : copy.detectLocation}
                </button>
                {location ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {copy.locationReady}
                  </span>
                ) : null}
              </div>

              {locationError ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs font-medium leading-5 text-amber-800 dark:text-amber-200" role="alert">
                  <p>{locationErrorMessage()}</p>
                  {locationError === "permission_denied" ? <p className="mt-1 text-[11px]">{copy.permissionHelp}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={locateCustomer}
                      disabled={locating}
                      className="rounded-full border border-amber-500/30 bg-background px-3 py-1.5 text-[11px] font-bold text-foreground"
                    >
                      {copy.retryLocation}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShareLocation(false);
                        setLocationError(null);
                      }}
                      className="rounded-full px-3 py-1.5 text-[11px] font-bold text-foreground underline-offset-2 hover:underline"
                    >
                      {copy.continueWithoutLocation}
                    </button>
                  </div>
                </div>
              ) : null}

              {location ? (
                <div className="overflow-hidden rounded-xl border bg-background">
                  <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
                    <div>
                      <p className="text-xs font-extrabold">{copy.mapPreview}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {copy.accuracy}: ±{Math.max(1, Math.round(location.accuracy))} m
                      </p>
                    </div>
                    <a
                      href={googleMapsUrl(location)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold transition hover:bg-muted"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {copy.openMap}
                    </a>
                  </div>
                  <iframe
                    key={`${location.latitude.toFixed(6)}-${location.longitude.toFixed(6)}`}
                    src={googleMapsEmbedUrl(location)}
                    title={copy.mapPreview}
                    className="h-40 w-full border-0 sm:h-48"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <fieldset className="space-y-3">
          <legend className="flex items-center gap-2 text-sm font-extrabold">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            {copy.payment}
          </legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className={paymentCardClass(details.paymentMethod === "cash_on_delivery")}>
              <input
                type="radio"
                name="payment-method"
                checked={details.paymentMethod === "cash_on_delivery"}
                onChange={() => update("paymentMethod", "cash_on_delivery")}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <span>
                <span className="flex items-center gap-2 text-sm font-bold">
                  <WalletCards className="h-4 w-4" />
                  {copy.cash}
                </span>
                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{copy.cashDescription}</span>
              </span>
            </label>

            <label className={paymentCardClass(details.paymentMethod === "whish_money")}>
              <input
                type="radio"
                name="payment-method"
                checked={details.paymentMethod === "whish_money"}
                onChange={() => update("paymentMethod", "whish_money")}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-bold">
                  <CreditCard className="h-4 w-4" />
                  {copy.whish}
                </span>
                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{copy.whishDescription}</span>
              </span>
            </label>
          </div>

          {details.paymentMethod === "whish_money" ? (
            whishConfigured ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{copy.whishAccount}</p>
                    <p dir="ltr" className="mt-0.5 text-base font-extrabold tracking-wide">{WHISH_MONEY_ACCOUNT}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {copy.whishAccountName}: {WHISH_MONEY_ACCOUNT_NAME}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copyWhishAccount}
                    className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-2 text-xs font-bold"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? copy.copied : copy.copyAccount}
                  </button>
                </div>
              </div>
            ) : (
              <p className="rounded-xl bg-amber-500/10 px-3 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-300">
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
            rows={2}
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

        <div className="space-y-2.5">
          <div className="sticky bottom-[4.75rem] z-20 -mx-1 rounded-2xl border border-emerald-500/20 bg-background/95 p-1 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <button
              type="submit"
              disabled={actionDisabled || pdfBusy}
              className="press flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-4 text-sm font-extrabold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {locating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              {locating ? copy.locating : copy.send}
            </button>
          </div>

          <button
            type="button"
            onClick={downloadPdf}
            disabled={actionDisabled || pdfBusy}
            className="press flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-background px-5 py-3 text-sm font-bold text-foreground transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pdfBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {pdfBusy ? copy.preparingPdf : submitted ? copy.invoicePdf : copy.summaryPdf}
          </button>
        </div>

        {reference ? (
          <p dir="ltr" className="text-center text-[11px] font-semibold text-muted-foreground">
            {copy.invoiceLabel}: {invoiceNumber(reference)}
          </p>
        ) : null}
        <p className="text-center text-[11px] leading-5 text-muted-foreground">{copy.privacy}</p>
      </form>
    </section>
  );
}
