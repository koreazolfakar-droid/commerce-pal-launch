import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, MapPin, MessageCircle, Phone, StickyNote, UserRound } from "lucide-react";

import { useLanguage } from "@/lib/i18n";
import { formatPrice, variantSummary } from "@/lib/shopify";
import { STORE_NAME, storeUrl } from "@/lib/storeConfig";
import { whatsappUrl } from "@/lib/whatsapp";
import type { CartItem } from "@/stores/cartStore";

const STORAGE_KEY = "space-call-whatsapp-checkout-customer";

type CustomerDetails = {
  name: string;
  phone: string;
  area: string;
  address: string;
  landmark: string;
  notes: string;
};

const EMPTY_DETAILS: CustomerDetails = {
  name: "",
  phone: "",
  area: "",
  address: "",
  landmark: "",
  notes: "",
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

  const copy = isArabic
    ? {
        title: "اطلب عبر واتساب",
        description: "املأ بيانات التوصيل وسنرسل تفاصيل السلة كاملة إلى واتساب.",
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
        notes: "ملاحظات الطلب (اختياري)",
        notesPlaceholder: "لون مفضل، وقت مناسب للتوصيل، أو أي ملاحظة",
        button: "إرسال الطلب عبر واتساب",
        required: "يرجى تعبئة الاسم ورقم الهاتف والمنطقة والعنوان قبل إرسال الطلب.",
        privacy: "سيتم فتح واتساب فقط بعد ضغطك على زر الإرسال. لا تُرسل بياناتك تلقائيًا.",
        ready: "تم تجهيز الطلب — سيتم فتح واتساب الآن.",
      }
    : {
        title: "Order via WhatsApp",
        description: "Fill in your delivery details and we’ll prepare your full cart for WhatsApp.",
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
        notes: "Order notes (optional)",
        notesPlaceholder: "Preferred colour, delivery time, or any request",
        button: "Send order on WhatsApp",
        required: "Please fill in your name, phone number, area and address before sending the order.",
        privacy: "WhatsApp opens only after you press send. Your details are not submitted automatically.",
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

  const update = (field: keyof CustomerDetails, value: string) => {
    setDetails((current) => ({ ...current, [field]: value }));
    setError("");
    setSubmitted(false);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
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

    const reference = orderReference();
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
      details.landmark.trim()
        ? `${isArabic ? "نقطة دالة" : "Landmark"}: ${details.landmark.trim()}`
        : "",
      "",
      `📦 ${isArabic ? "المنتجات" : "Items"}`,
      ...lines,
      "",
      `💰 ${isArabic ? "المجموع" : "Total"}: ${formatPrice(total, currency)}`,
      details.notes.trim()
        ? `📝 ${isArabic ? "ملاحظات" : "Notes"}: ${details.notes.trim()}`
        : "",
      "",
      `${isArabic ? "تم إنشاء الطلب من" : "Order created from"}: ${storeUrl("/cart")}`,
    ].filter(Boolean);

    setSubmitted(true);
    window.open(whatsappUrl(message.join("\n")), "_blank", "noopener,noreferrer");
  };

  const fieldClass =
    "mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

  return (
    <section className="mt-6 rounded-2xl border bg-card p-5 shadow-card" aria-labelledby="whatsapp-checkout-title">
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
          disabled={disabled || items.length === 0}
          className="press flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <MessageCircle className="h-4 w-4" />
          {copy.button}
        </button>

        <p className="text-center text-xs leading-5 text-muted-foreground">{copy.privacy}</p>
      </form>
    </section>
  );
}
