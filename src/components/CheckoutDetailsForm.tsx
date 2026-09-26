import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
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

import { useCustomerAccount } from "@/components/customer-account/CustomerAccountProvider";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { addressCheckoutText } from "@/lib/customerAccount";
import { useLanguage } from "@/lib/i18n";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { downloadOrderInvoicePdf } from "@/lib/orderInvoice";
import {
  clearCheckoutAttempt,
  createStorefrontOrder,
  StoreOrderError,
  type CreatedStoreOrder,
} from "@/lib/orderCheckout";
import { formatPrice, variantSummary } from "@/lib/productPricing";
import { STORE_NAME, storeUrl } from "@/lib/storeConfig";
import { whatsappUrl } from "@/lib/whatsapp";
import { useCartStore, type CartItem } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "space-call-whatsapp-checkout-customer";
const WHISH_MONEY_ACCOUNT = (import.meta.env.VITE_WHISH_MONEY_ACCOUNT ?? "").trim();
const WHISH_MONEY_ACCOUNT_NAME = (
  import.meta.env.VITE_WHISH_MONEY_ACCOUNT_NAME ?? STORE_NAME
).trim();

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
  "unsupported" | "insecure" | "permission_denied" | "unavailable" | "timeout" | "unknown";

type LocationResult =
  { location: SharedLocation; error: null } | { location: null; error: LocationErrorReason };

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
  deliveryFee: number;
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
  deliveryFee,
  currency,
  disabled = false,
}: CheckoutDetailsFormProps) {
  const { language } = useLanguage();
  const { user } = useCustomerAuth();
  const { profile, selectedAddress, openAddressBook } = useCustomerAccount();
  const clearCart = useCartStore((state) => state.clearCart);
  const syncCart = useCartStore((state) => state.syncCart);
  const { data: cms, refetch: refetchCms } = useQuery(cmsQueryOptions());
  const cmsStoreName = cms?.settings["site_name"];
  const cmsWhatsApp = cms?.settings["whatsapp_number"];
  const storeName =
    typeof cmsStoreName === "string" && cmsStoreName.trim() ? cmsStoreName.trim() : STORE_NAME;
  const whatsappNumber =
    typeof cmsWhatsApp === "string" && cmsWhatsApp.trim() ? cmsWhatsApp : undefined;
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
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreatedStoreOrder | null>(null);

  const whishConfigured = WHISH_MONEY_ACCOUNT.length > 0;

  const copy = isArabic
    ? {
        title: "بيانات التوصيل وإتمام الطلب",
        description:
          "أدخل بياناتك واختر طريقة الدفع. نحفظ الطلب بأمان أولًا ثم نفتح واتساب للتأكيد.",
        stepLabel: "الخطوة 2 من 3",
        totalDue: "الإجمالي",
        deliveryIncluded: "يشمل رسوم التوصيل",
        savedBeforeWhatsapp: "يتم حفظ الطلب والتحقق من السعر والمخزون قبل فتح واتساب.",
        delivery: "بيانات التوصيل",
        savedAddress: "عنوان محفوظ",
        changeAddress: "تغيير",
        usingSavedAddress: "يتم استخدام هذا العنوان المحفوظ للطلب الحالي.",
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
        send: "إنشاء الطلب والمتابعة عبر واتساب",
        creating: "جارٍ إنشاء الطلب بأمان...",
        stockUnavailable:
          "تغيّر المخزون ولم تعد بعض العناصر متاحة بالكمية المطلوبة. راجع السلة ثم حاول مجددًا.",
        rateLimited: "تم إرسال محاولات كثيرة خلال وقت قصير. حاول مجددًا بعد قليل.",
        orderConflict:
          "تعذر إعادة استخدام محاولة الطلب السابقة بأمان. راجع بيانات الطلب قبل المحاولة من جديد.",
        pricingChanged:
          "تغيّر سعر منتج أو رسوم التوصيل قبل إنشاء الطلب. تم إيقاف العملية حتى لا يتم اعتماد مبلغ مختلف. راجع الإجمالي ثم حاول مجددًا.",
        orderFailed: "تعذر حفظ الطلب الآن. لم يتم فتح واتساب ولم يتم خصم المخزون مرتين.",
        summaryPdf: "تحميل ملخص الطلب PDF",
        invoicePdf: "تحميل الفاتورة PDF",
        preparingPdf: "جارٍ تجهيز PDF...",
        required: "يرجى تعبئة الاسم ورقم الهاتف والمنطقة والعنوان أولًا.",
        invalidPhone: "أدخل رقم هاتف صحيحًا يحتوي على 7 أرقام على الأقل.",
        pdfError: "تعذر إنشاء ملف PDF الآن. جرّب مرة أخرى.",
        ready: "تم حفظ الطلب في النظام بنجاح. يمكنك الاحتفاظ بنسخة PDF أو متابعة واتساب.",
        privacy: "لا نستخدم موقعك إلا بعد موافقتك، ويتم إنشاء ملف PDF محليًا على جهازك.",
        invoiceLabel: "رقم الفاتورة",
        mapLabel: "الموقع على الخريطة",
      }
    : {
        title: "Delivery & checkout",
        description:
          "Add your delivery details and payment method. We securely save the order before opening WhatsApp.",
        stepLabel: "Step 2 of 3",
        totalDue: "Order total",
        deliveryIncluded: "Delivery included",
        savedBeforeWhatsapp:
          "Price and stock are verified and the order is saved before WhatsApp opens.",
        delivery: "Delivery details",
        savedAddress: "Saved address",
        changeAddress: "Change",
        usingSavedAddress: "This saved address is being used for the current order.",
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
        send: "Create order & continue on WhatsApp",
        creating: "Creating your order securely...",
        stockUnavailable:
          "Stock changed and one or more items are no longer available in the requested quantity. Review your bag and try again.",
        rateLimited:
          "Too many checkout attempts were sent in a short time. Please try again shortly.",
        orderConflict:
          "The previous checkout attempt cannot be safely reused. Review the order details before trying again.",
        pricingChanged:
          "A product price or delivery fee changed before the order was created. Checkout was stopped so a different amount is never accepted silently. Review the updated total and try again.",
        orderFailed:
          "We couldn't save the order. WhatsApp was not opened and stock was not deducted twice.",
        summaryPdf: "Download order summary PDF",
        invoicePdf: "Download invoice PDF",
        preparingPdf: "Preparing PDF...",
        required: "Please fill in your name, phone number, area and address first.",
        invalidPhone: "Enter a valid phone number with at least 7 digits.",
        pdfError: "We couldn't generate the PDF right now. Please try again.",
        ready:
          "Your order was saved successfully. You can keep a PDF copy or continue on WhatsApp.",
        privacy:
          "We use your location only after approval, and the PDF is generated locally on your device.",
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

  useEffect(() => {
    if (!selectedAddress) return;

    setDetails((current) => ({
      ...current,
      name: profile?.fullName || current.name,
      phone: selectedAddress.phone || profile?.phone || current.phone,
      area:
        selectedAddress.areaStreet ||
        selectedAddress.formattedAddress ||
        current.area,
      address: addressCheckoutText(selectedAddress) || current.address,
      landmark: "",
    }));

    if (selectedAddress.latitude !== null && selectedAddress.longitude !== null) {
      setLocation({
        latitude: selectedAddress.latitude,
        longitude: selectedAddress.longitude,
        accuracy: 0,
      });
      setShareLocation(true);
      setLocationError(null);
    }
  }, [profile?.fullName, profile?.phone, selectedAddress]);

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
    if (details.phone.replace(/\D/g, "").length < 7 || details.phone.length > 32) {
      setError(copy.invalidPhone);
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

  const buildInvoiceInput = (orderIdentity: { reference: string; createdAt: Date }) => {
    const invoiceDeliveryFee = createdOrder?.shipping_total ?? deliveryFee;
    const invoiceSubtotal = createdOrder?.subtotal ?? total;

    return {
      invoiceNumber: invoiceNumber(orderIdentity.reference),
      orderReference: orderIdentity.reference,
      createdAt: orderIdentity.createdAt,
      language: (isArabic ? "ar" : "en") as "ar" | "en",
      currency: createdOrder?.currency ?? currency,
      subtotal: invoiceSubtotal,
      deliveryFee: invoiceDeliveryFee,
      total: createdOrder?.total ?? invoiceSubtotal + invoiceDeliveryFee,
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
    };
  };

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
    if (!validateDetails() || submitting) return;
    persistDetails();
    setError("");

    let resolvedLocation = location;
    if (shareLocation && !resolvedLocation) resolvedLocation = await locateCustomer();

    const orderIdentity = ensureOrderIdentity();
    const referenceValue = orderIdentity.reference;
    const invoiceValue = invoiceNumber(referenceValue);
    const paymentLabel = details.paymentMethod === "whish_money" ? copy.whish : copy.cash;

    setSubmitting(true);
    let order: CreatedStoreOrder;
    try {
      order = await createStorefrontOrder({
        items,
        customer: {
          name: details.name.trim(),
          phone: details.phone.trim(),
          email: user?.email?.trim() || undefined,
          city: details.area.trim(),
          address: [
            details.address.trim(),
            details.landmark.trim()
              ? `${isArabic ? "نقطة دالة" : "Landmark"}: ${details.landmark.trim()}`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
        paymentMethod: details.paymentMethod === "whish_money" ? "whish" : "cash",
        expectedSubtotal: total,
        expectedDeliveryFee: deliveryFee,
        notes: details.notes.trim(),
        reference: referenceValue,
        deliveryLocation:
          shareLocation && resolvedLocation
            ? {
                latitude: resolvedLocation.latitude,
                longitude: resolvedLocation.longitude,
                accuracy: resolvedLocation.accuracy,
              }
            : null,
      });
      setCreatedOrder(order);
    } catch (cause) {
      const code = cause instanceof StoreOrderError ? cause.code : "order_failed";
      if (code.includes("insufficient_stock") || code.includes("product_or_variant_unavailable")) {
        clearCheckoutAttempt();
        await syncCart();
        setError(copy.stockUnavailable);
      } else if (code.includes("rate_limited")) {
        setError(copy.rateLimited);
      } else if (code.includes("idempotency_key_conflict")) {
        clearCheckoutAttempt();
        await syncCart();
        setError(copy.orderConflict);
      } else if (code.includes("pricing_changed")) {
        clearCheckoutAttempt();
        await Promise.all([syncCart(), refetchCms()]);
        setError(copy.pricingChanged);
      } else {
        setError(copy.orderFailed);
      }
      return;
    } finally {
      setSubmitting(false);
    }

    const itemLines = items.flatMap((item, index) => {
      const options = variantSummary(item.selectedOptions);
      const unitPrice = formatPrice(item.price.amount, item.price.currencyCode);
      const lineTotal = formatPrice(
        Number(item.price.amount) * item.quantity,
        item.price.currencyCode,
      );
      return [
        `${index + 1}. ${item.product.node.title}`,
        options ? `   ${isArabic ? "الخيار" : "Variant"}: ${options}` : "",
        `   ${isArabic ? "الكمية" : "Qty"}: ${item.quantity}`,
        `   ${isArabic ? "السعر" : "Price"}: ${unitPrice}${item.quantity > 1 ? ` • ${isArabic ? "الإجمالي" : "Line total"}: ${lineTotal}` : ""}`,
        `   ${storeUrl(`/product/${item.product.node.handle}`)}`,
      ].filter(Boolean);
    });

    const message = [
      `🛍️ ${isArabic ? "طلب جديد" : "New order"} — ${storeName}`,
      `${isArabic ? "رقم الطلب" : "Order"}: #${order.public_order_number}`,
      `${isArabic ? "المرجع" : "Reference"}: ${referenceValue}`,
      `${copy.invoiceLabel}: ${invoiceValue}`,
      "",
      `👤 ${isArabic ? "بيانات الزبون" : "Customer details"}`,
      `${isArabic ? "الاسم" : "Name"}: ${details.name.trim()}`,
      `${isArabic ? "الهاتف" : "Phone"}: ${details.phone.trim()}`,
      `${isArabic ? "المنطقة" : "Area"}: ${details.area.trim()}`,
      `${isArabic ? "العنوان" : "Address"}: ${details.address.trim()}`,
      details.landmark.trim()
        ? `${isArabic ? "نقطة دالة" : "Landmark"}: ${details.landmark.trim()}`
        : "",
      shareLocation && resolvedLocation
        ? `📍 ${copy.mapLabel}: ${googleMapsUrl(resolvedLocation)}`
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
      ...itemLines,
      "",
      `💵 ${isArabic ? "مجموع المنتجات" : "Items subtotal"}: ${formatPrice(order.subtotal, order.currency)}`,
      order.delivery_type === "free"
        ? `🚚 ${isArabic ? "التوصيل" : "Delivery"}: ${isArabic ? "مجاني" : "Free"}`
        : `🚚 ${isArabic ? "رسوم التوصيل" : "Delivery fee"}: ${formatPrice(order.shipping_total, order.currency)}`,
      `💰 ${isArabic ? "الإجمالي النهائي" : "Final total"}: ${formatPrice(order.total, order.currency)}`,
      details.notes.trim() ? `📝 ${isArabic ? "ملاحظات" : "Notes"}: ${details.notes.trim()}` : "",
      "",
      `${isArabic ? "تم إنشاء الطلب من" : "Order created from"}: ${storeUrl("/cart")}`,
    ].filter(Boolean);

    setSubmitted(true);
    const target = whatsappUrl(message.join("\n"), whatsappNumber);
    const popup = window.open(target, "_blank", "noopener,noreferrer");
    clearCheckoutAttempt();
    clearCart();
    if (!popup) window.location.assign(target);
  };

  const checkoutTotal = total + deliveryFee;
  const fieldClass =
    "mt-1.5 min-h-11 w-full rounded-md border border-border/80 bg-background px-3 py-2.5 text-[13px] text-foreground outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/70 hover:border-primary/25 focus:border-primary focus:ring-2 focus:ring-primary/15 sm:px-3.5 sm:text-sm";
  const paymentCardClass = (selected: boolean) =>
    `flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 transition-[border-color,background-color,box-shadow,transform] sm:gap-3 sm:px-3.5 sm:py-3 ${
      selected
        ? "border-primary/35 bg-primary/[0.07] shadow-sm ring-2 ring-primary/10"
        : "border-border/80 bg-background hover:border-primary/30"
    }`;
  const actionDisabled =
    disabled ||
    submitting ||
    items.length === 0 ||
    locating ||
    (details.paymentMethod === "whish_money" && !whishConfigured);

  return (
    <section
      id="whatsapp-checkout"
      className="scroll-mt-20 overflow-hidden rounded-lg border bg-card shadow-card"
      aria-labelledby="whatsapp-checkout-title"
    >
      <div className="border-b bg-surface/50 px-3.5 py-3.5 min-[390px]:px-4 sm:px-5 sm:py-5">
        <div className="flex items-start justify-between gap-2.5 sm:gap-3">
          <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-success/15 bg-background/80 text-success shadow-sm sm:h-10 sm:w-10">
              <MessageCircle className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-success/15 bg-success/[0.08] px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-success">
                {copy.stepLabel}
              </span>
              <h2
                id="whatsapp-checkout-title"
                className="mt-1.5 text-[17px] font-extrabold tracking-tight sm:mt-2 sm:text-lg"
              >
                {copy.title}
              </h2>
              <p className="mt-1 max-w-xl text-[11px] leading-5 text-muted-foreground sm:text-xs">
                {copy.description}
              </p>
            </div>
          </div>

          <div className="hidden shrink-0 rounded-xl border bg-background/85 px-3 py-2 text-end shadow-sm sm:block">
            <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
              {copy.totalDue}
            </p>
            <p className="mt-0.5 text-lg font-black tracking-tight tabular-nums text-primary">
              {formatPrice(checkoutTotal, currency)}
            </p>
            <p className="mt-0.5 text-[9px] text-muted-foreground">{copy.deliveryIncluded}</p>
          </div>
        </div>

        <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-success/10 bg-background/60 px-2.5 py-2 text-[10px] leading-4 text-muted-foreground sm:hidden">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
          <span>{copy.savedBeforeWhatsapp}</span>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4.5 p-3.5 min-[390px]:p-4 sm:space-y-5 sm:p-5" noValidate>
        <section aria-labelledby="delivery-details-title" className="space-y-3 sm:space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <h3 id="delivery-details-title" className="text-sm font-extrabold tracking-tight">
              {copy.delivery}
            </h3>
            <span className="rounded-full bg-muted px-2 py-1 text-[9px] font-bold text-muted-foreground">
              {formatPrice(checkoutTotal, currency)}
            </span>
          </div>

          {selectedAddress ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.035] p-3.5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                        {copy.savedAddress}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-extrabold">
                        {selectedAddress.nickname ||
                          selectedAddress.areaStreet ||
                          selectedAddress.formattedAddress}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openAddressBook}
                      className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-primary transition hover:bg-primary/10"
                    >
                      {copy.changeAddress}
                    </button>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {selectedAddress.areaStreet || selectedAddress.formattedAddress}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {copy.usingSavedAddress}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
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

        <section
          aria-labelledby="location-section-title"
          className="rounded-xl border bg-muted/20 p-3 sm:p-3.5"
        >
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
                <span
                  id="location-section-title"
                  className="flex items-center gap-2 text-sm font-extrabold"
                >
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
            <div className="mt-2.5 space-y-2.5 sm:mt-3 sm:space-y-3 sm:ps-7">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={locateCustomer}
                  disabled={locating}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border bg-background px-3.5 py-2 text-xs font-bold transition hover:bg-muted disabled:cursor-wait disabled:opacity-60"
                >
                  {locating ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5" />
                  )}
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
                <div
                  className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs font-medium leading-5 text-amber-800 dark:text-amber-200"
                  role="alert"
                >
                  <p>{locationErrorMessage()}</p>
                  {locationError === "permission_denied" ? (
                    <p className="mt-1 text-[11px]">{copy.permissionHelp}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={locateCustomer}
                      disabled={locating}
                      className="min-h-9 rounded-md border border-amber-500/30 bg-background px-3 py-1.5 text-[11px] font-bold text-foreground"
                    >
                      {copy.retryLocation}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShareLocation(false);
                        setLocationError(null);
                      }}
                      className="min-h-9 rounded-md px-3 py-1.5 text-[11px] font-bold text-foreground underline-offset-2 hover:underline"
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
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-bold transition hover:bg-muted"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {copy.openMap}
                    </a>
                  </div>
                  <iframe
                    key={`${location.latitude.toFixed(6)}-${location.longitude.toFixed(6)}`}
                    src={googleMapsEmbedUrl(location)}
                    title={copy.mapPreview}
                    className="h-36 w-full border-0 min-[390px]:h-40 sm:h-48"
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
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-2.5">
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
                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                  {copy.cashDescription}
                </span>
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
                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                  {copy.whishDescription}
                </span>
              </span>
            </label>
          </div>

          {details.paymentMethod === "whish_money" ? (
            whishConfigured ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {copy.whishAccount}
                    </p>
                    <p dir="ltr" className="mt-0.5 text-base font-extrabold tracking-wide">
                      {WHISH_MONEY_ACCOUNT}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {copy.whishAccountName}: {WHISH_MONEY_ACCOUNT_NAME}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copyWhishAccount}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs font-bold"
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
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-3.5 py-3 text-sm font-medium text-destructive"
          >
            {error}
          </p>
        ) : null}

        {submitted ? (
          <p className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3.5 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              {copy.ready}
              {createdOrder
                ? ` #${createdOrder.order_number} · ${formatPrice(createdOrder.total, createdOrder.currency)}`
                : ""}
            </span>
          </p>
        ) : null}

        <div className="space-y-2.5">
          <div className="hidden items-start gap-2 rounded-xl border border-success/10 bg-success/[0.05] px-3 py-2.5 text-[10px] leading-4 text-muted-foreground sm:flex">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            <span>{copy.savedBeforeWhatsapp}</span>
          </div>

          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-1 rounded-lg border border-success/20 bg-background/95 p-1 shadow-float backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <Button
              type="submit"
              disabled={actionDisabled || pdfBusy}
              className="press min-h-[3.25rem] w-full justify-start bg-success px-3.5 text-[13px] font-extrabold text-success-foreground shadow-card-hover hover:bg-success/90 min-[390px]:min-h-14 min-[390px]:px-4 sm:px-5 sm:text-sm"
            >
              {locating || submitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              <span className="min-w-0 flex-1 truncate text-start">
                {submitting ? copy.creating : locating ? copy.locating : copy.send}
              </span>
              <span className="hidden shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-xs font-black tabular-nums min-[390px]:inline-flex">
                {formatPrice(checkoutTotal, currency)}
              </span>
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={downloadPdf}
            disabled={actionDisabled || pdfBusy}
            className="press min-h-11 w-full border-primary/20 px-4 text-[13px] font-bold sm:min-h-12 sm:px-5 sm:text-sm"
          >
            {pdfBusy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {pdfBusy ? copy.preparingPdf : submitted ? copy.invoicePdf : copy.summaryPdf}
          </Button>
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
