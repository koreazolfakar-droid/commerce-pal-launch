import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Camera,
  Check,
  ChevronRight,
  CircleUserRound,
  Crosshair,
  Ellipsis,
  Home,
  Hotel,
  Loader2,
  MapPinned,
  Mic,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import { GoogleDeliveryMap } from "@/components/customer-account/GoogleDeliveryMap";
import { useCustomerAccount } from "@/components/customer-account/CustomerAccountProvider";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  addressDisplayLine,
  createAddressMediaUrls,
  loadMyOrderItems,
  loadMyOrders,
  removeAddressMedia,
  uploadAddressMedia,
  type AddressPatch,
  type CustomerAddress,
  type CustomerAddressType,
  type CustomerOrderItem,
  type CustomerOrderSummary,
} from "@/lib/customerAccount";
import { useLanguage } from "@/lib/i18n";

type View = "book" | "map" | "type" | "details" | "profile" | "orders";

type AddressForm = {
  nickname: string;
  addressType: CustomerAddressType | null;
  formattedAddress: string;
  areaStreet: string;
  buildingName: string;
  buildingNumber: string;
  floor: string;
  unit: string;
  doorDetails: string;
  phone: string;
  deliveryInstructions: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string;
  photoPaths: string[];
  voiceNotePath: string;
};

const EMPTY_FORM: AddressForm = {
  nickname: "",
  addressType: null,
  formattedAddress: "",
  areaStreet: "",
  buildingName: "",
  buildingNumber: "",
  floor: "",
  unit: "",
  doorDetails: "",
  phone: "",
  deliveryInstructions: "",
  latitude: null,
  longitude: null,
  placeId: "",
  photoPaths: [],
  voiceNotePath: "",
};

function formFromAddress(address: CustomerAddress | null, profilePhone = ""): AddressForm {
  if (!address) return { ...EMPTY_FORM, phone: profilePhone };
  return {
    nickname: address.nickname,
    addressType: address.addressType,
    formattedAddress: address.formattedAddress,
    areaStreet: address.areaStreet,
    buildingName: address.buildingName,
    buildingNumber: address.buildingNumber,
    floor: address.floor,
    unit: address.unit,
    doorDetails: address.doorDetails,
    phone: address.phone || profilePhone,
    deliveryInstructions: address.deliveryInstructions,
    latitude: address.latitude,
    longitude: address.longitude,
    placeId: address.placeId,
    photoPaths: address.photoPaths,
    voiceNotePath: address.voiceNotePath,
  };
}

function addressTypeIcon(type: CustomerAddressType | null) {
  if (type === "apartment") return Building2;
  if (type === "house_villa") return Home;
  if (type === "compound") return MapPinned;
  if (type === "office") return BriefcaseBusiness;
  if (type === "hotel") return Hotel;
  return MapPinned;
}

export function CustomerAddressHub() {
  const { language, direction } = useLanguage();
  const { user } = useCustomerAuth();
  const {
    profile,
    addresses,
    selectedAddress,
    draftAddress,
    loading,
    addressBookOpen,
    setAddressBookOpen,
    selectAddress,
    beginAddressDraft,
    beginAddressEdit,
    saveDraft,
    completeDraft,
    makeDefault,
    removeAddress,
    saveProfile,
  } = useCustomerAccount();

  const ar = language === "ar";
  const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;
  const NextIcon = direction === "rtl" ? ArrowLeft : ChevronRight;
  const [view, setView] = useState<View>("book");
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [autoLocateToken, setAutoLocateToken] = useState(0);
  const [profileForm, setProfileForm] = useState({ fullName: "", phone: "", email: "" });
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState("");
  const [orderItems, setOrderItems] = useState<Record<string, CustomerOrderItem[]>>({});
  const [addressPendingDelete, setAddressPendingDelete] = useState<CustomerAddress | null>(null);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const saveTimer = useRef<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingStopTimerRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTickerRef = useRef<number | null>(null);

  const copy = useMemo(
    () =>
      ar
        ? {
            title: "أين تريد أن نوصّل طلبك؟",
            search: "ابحث في العناوين المحفوظة...",
            current: "استخدام موقعي الحالي",
            currentHelp: "سنضع العلامة على موقعك لتأكيده",
            elsewhere: "التوصيل إلى مكان آخر",
            elsewhereHelp: "اختر الموقع على الخريطة",
            add: "إضافة عنوان جديد",
            saved: "العناوين المحفوظة",
            noSaved: "لا يوجد عناوين محفوظة بعد.",
            default: "افتراضي",
            setDefault: "تعيين كعنوان افتراضي",
            edit: "تعديل العنوان",
            delete: "حذف العنوان",
            deleteTitle: "حذف هذا العنوان؟",
            deleteDescription: "سيتم حذف العنوان المحفوظ نهائيًا من حسابك. لا يمكن التراجع عن هذه الخطوة.",
            cancel: "إلغاء",
            profile: "الملف الشخصي",
            myOrders: "طلباتي",
            ordersEmpty: "لا يوجد طلبات مرتبطة بحسابك بعد.",
            orderNumber: "طلب",
            items: "العناصر",
            viewOnMap: "عرض موقع التوصيل",
            loadingOrders: "جارٍ تحميل الطلبات...",
            mapTitle: "تأكيد موقع التوصيل",
            mapHelp: "حرّك العلامة إلى موقعك الدقيق لمساعدة المندوب على الوصول إليك أسرع.",
            confirmLocation: "تأكيد موقع التوصيل",
            chooseType: "اختر نوع العنوان",
            detailsTitle: "أكمل تفاصيل العنوان",
            previous: "السابق",
            done: "حفظ العنوان",
            saving: "جارٍ الحفظ...",
            nickname: "اسم مختصر (مثال: المنزل)",
            areaStreet: "المنطقة / الشارع",
            building: "اسم المبنى / المجمع",
            buildingNo: "رقم المبنى / المنزل",
            floor: "الطابق",
            unit: "الشقة / الغرفة / المكتب",
            door: "تفاصيل الباب / اسم الإنتركوم",
            phone: "رقم الهاتف",
            instructions: "معالم قريبة، تعليمات التوصيل...",
            helpFind: "ساعد المندوب في العثور عليك",
            helpFindText: "أضف صورًا أو تعليمات صوتية للموقع (اختياري).",
            addPhotos: "إضافة صور",
            photosAdded: "صور مضافة",
            record: "اضغط لتسجيل تعليمات صوتية",
            recording: "جارٍ التسجيل",
            voiceAdded: "تمت إضافة التعليمات الصوتية",
            removePhoto: "حذف الصورة",
            removeVoice: "حذف التسجيل",
            required: "أكمل الحقول المطلوبة قبل حفظ العنوان.",
            genericError: "تعذر إكمال العملية. حاول مرة أخرى.",
            name: "الاسم الكامل",
            email: "البريد الإلكتروني",
            saveProfile: "حفظ الملف الشخصي",
            profileSaved: "تم حفظ الملف الشخصي.",
          }
        : {
            title: "Where should we deliver to?",
            search: "Search saved addresses...",
            current: "Use current location",
            currentHelp: "We will pin your location for confirmation",
            elsewhere: "Deliver somewhere else",
            elsewhereHelp: "Choose location on map",
            add: "Add new address",
            saved: "Saved addresses",
            noSaved: "No saved addresses yet.",
            default: "Default",
            setDefault: "Set as default",
            edit: "Edit address",
            delete: "Delete address",
            deleteTitle: "Delete this address?",
            deleteDescription:
              "This saved address will be permanently removed from your account. This cannot be undone.",
            cancel: "Cancel",
            profile: "Profile",
            myOrders: "My orders",
            ordersEmpty: "No orders are linked to your account yet.",
            orderNumber: "Order",
            items: "Items",
            viewOnMap: "View delivery location",
            loadingOrders: "Loading orders...",
            mapTitle: "Confirm delivery location",
            mapHelp: "Move the pin to your exact location to help drivers locate you faster.",
            confirmLocation: "Confirm delivery location",
            chooseType: "Choose your address type",
            detailsTitle: "Complete your address details",
            previous: "Previous",
            done: "Done",
            saving: "Saving...",
            nickname: "Nickname (e.g. Home)",
            areaStreet: "Area / Street",
            building: "Building / compound name",
            buildingNo: "Building / house no.",
            floor: "Floor",
            unit: "Apartment / room / office",
            door: "Door details / Name on intercom",
            phone: "Phone Number",
            instructions: "Nearby landmarks, delivery instructions...",
            helpFind: "Help the shopper find you!",
            helpFindText: "Add photos and voice directions to help the driver find you faster (Optional).",
            addPhotos: "Add photos",
            photosAdded: "photos added",
            record: "Tap to record voice directions",
            recording: "Recording",
            voiceAdded: "Voice directions added",
            removePhoto: "Remove photo",
            removeVoice: "Remove recording",
            required: "Complete the required address fields before saving.",
            genericError: "We could not complete that action. Please try again.",
            name: "Full name",
            email: "Email",
            saveProfile: "Save profile",
            profileSaved: "Profile saved.",
          },
    [ar],
  );

  const ADDRESS_TYPES: Array<{
    type: CustomerAddressType;
    title: string;
    subtitle: string;
  }> = ar
    ? [
        { type: "apartment", title: "شقة", subtitle: "مبنى سكني متعدد الوحدات" },
        { type: "house_villa", title: "منزل / فيلا", subtitle: "منزل مستقل أو عائلي" },
        { type: "compound", title: "مجمع سكني", subtitle: "مجمع أو مجتمع مسوّر" },
        { type: "office", title: "مكتب", subtitle: "مكان عمل أو شركة" },
        { type: "hotel", title: "فندق", subtitle: "فندق أو منتجع" },
        { type: "other", title: "أخرى", subtitle: "مستشفى، مدرسة، مركز تجاري..." },
      ]
    : [
        { type: "apartment", title: "Apartment", subtitle: "Multi-unit residential building" },
        { type: "house_villa", title: "House/Villa", subtitle: "Single or multi-family home" },
        { type: "compound", title: "Compound", subtitle: "Gated community of homes" },
        { type: "office", title: "Office", subtitle: "Workplace with entry restrictions" },
        { type: "hotel", title: "Hotel", subtitle: "Lodging, motel or resort" },
        { type: "other", title: "Other", subtitle: "Medical facility, Mall, School..." },
      ];

  useEffect(() => {
    if (!addressBookOpen) return;
    setView("book");
    setSearch("");
    setError("");
    setProfileForm({
      fullName: profile?.fullName || "",
      phone: profile?.phone || "",
      email: profile?.email || "",
    });
  }, [addressBookOpen, profile?.email, profile?.fullName, profile?.phone]);

  useEffect(() => {
    if (!addressBookOpen || view !== "orders" || !user) return;
    let cancelled = false;
    setOrdersLoading(true);
    setError("");
    void loadMyOrders()
      .then((next) => {
        if (!cancelled) setOrders(next);
      })
      .catch(() => {
        if (!cancelled) setError(copy.genericError);
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [addressBookOpen, copy.genericError, user, view]);

  const toggleOrder = async (order: CustomerOrderSummary) => {
    if (expandedOrderId === order.orderId) {
      setExpandedOrderId("");
      return;
    }

    setExpandedOrderId(order.orderId);
    if (orderItems[order.orderId]) return;

    setPending("order:" + order.orderId);
    setError("");
    try {
      const items = await loadMyOrderItems(order.orderId);
      setOrderItems((current) => ({ ...current, [order.orderId]: items }));
    } catch {
      setError(copy.genericError);
    } finally {
      setPending("");
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (recordingTickerRef.current) window.clearInterval(recordingTickerRef.current);
      if (recordingStopTimerRef.current) window.clearTimeout(recordingStopTimerRef.current);
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (view !== "details") return;
    const paths = [...form.photoPaths, form.voiceNotePath].filter(Boolean);
    if (!paths.length) {
      setMediaUrls({});
      return;
    }

    let cancelled = false;
    void createAddressMediaUrls(paths)
      .then((urls) => {
        if (!cancelled) setMediaUrls(urls);
      })
      .catch(() => {
        if (!cancelled) setMediaUrls({});
      });

    return () => {
      cancelled = true;
    };
  }, [form.photoPaths, form.voiceNotePath, view]);


  const scheduleSave = (next: AddressForm) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void saveDraft(next as AddressPatch).catch(() => setError(copy.genericError));
    }, 650);
  };

  const updateField = <K extends keyof AddressForm>(field: K, value: AddressForm[K]) => {
    const next = { ...form, [field]: value };
    setForm(next);
    setError("");
    scheduleSave(next);
  };

  const startDraft = async (useCurrentLocation: boolean) => {
    setPending("draft");
    setError("");
    try {
      const draft = await beginAddressDraft();
      if (!draft) return;
      const next = formFromAddress(draft, profile?.phone || user?.phone || "");
      setForm(next);
      setView("map");
      if (useCurrentLocation) setAutoLocateToken(Date.now());
    } catch {
      setError(copy.genericError);
    } finally {
      setPending("");
    }
  };

  const editAddress = async (address: CustomerAddress) => {
    setPending("edit:" + address.id);
    setError("");
    try {
      const draft = await beginAddressEdit(address);
      if (!draft) return;
      setForm(formFromAddress(draft, profile?.phone || user?.phone || ""));
      setView("map");
    } catch {
      setError(copy.genericError);
    } finally {
      setPending("");
    }
  };

  const confirmMap = async () => {
    if (form.latitude === null || form.longitude === null) {
      setError(copy.required);
      return;
    }
    setPending("map");
    try {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      await saveDraft({ ...form, draftStep: 2 });
      setView("type");
      setError("");
    } catch {
      setError(copy.genericError);
    } finally {
      setPending("");
    }
  };

  const chooseType = async (type: CustomerAddressType) => {
    setPending(type);
    try {
      const next = { ...form, addressType: type };
      setForm(next);
      await saveDraft({ addressType: type, draftStep: 3 });
      setView("details");
      setError("");
    } catch {
      setError(copy.genericError);
    } finally {
      setPending("");
    }
  };

  const validateDetails = () => {
    if (!form.addressType) return false;
    if (form.nickname.trim().length < 1) return false;
    if ((form.areaStreet || form.formattedAddress).trim().length < 2) return false;
    if (form.phone.replace(/\D/g, "").length < 7) return false;
    return form.latitude !== null && form.longitude !== null;
  };

  const finishAddress = async () => {
    if (!validateDetails()) {
      setError(copy.required);
      return;
    }
    setPending("done");
    setError("");
    try {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      await saveDraft({ ...form, draftStep: 3 });
      await completeDraft();
      setView("book");
    } catch {
      setError(copy.genericError);
    } finally {
      setPending("");
    }
  };

  const filteredAddresses = addresses.filter((address) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      address.nickname.toLowerCase().includes(query) ||
      addressDisplayLine(address).toLowerCase().includes(query)
    );
  });

  const saveProfileForm = async (event: FormEvent) => {
    event.preventDefault();
    setPending("profile");
    setError("");
    try {
      await saveProfile(profileForm);
      setError(copy.profileSaved);
    } catch {
      setError(copy.genericError);
    } finally {
      setPending("");
    }
  };

  const addPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 5 - form.photoPaths.length);
    if (!files.length || !user || !draftAddress) return;
    setPending("photos");
    setError("");
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) continue;
        uploaded.push(
          await uploadAddressMedia({
            userId: user.id,
            addressId: draftAddress.id,
            file,
            kind: "photo",
          }),
        );
      }
      const photoPaths = [...form.photoPaths, ...uploaded].slice(0, 5);
      const next = { ...form, photoPaths };
      setForm(next);
      await saveDraft({ photoPaths });
    } catch {
      setError(copy.genericError);
    } finally {
      setPending("");
      event.target.value = "";
    }
  };

  const removePhoto = async (path: string) => {
    setPending("remove-photo");
    setError("");
    try {
      const photoPaths = form.photoPaths.filter((item) => item !== path);
      setForm((current) => ({ ...current, photoPaths }));
      await saveDraft({ photoPaths });
      if (draftAddress && path.includes("/" + draftAddress.id + "/")) {
        await removeAddressMedia(path);
      }
      setMediaUrls((current) => {
        const next = { ...current };
        delete next[path];
        return next;
      });
    } catch {
      setError(copy.genericError);
    } finally {
      setPending("");
    }
  };

  const removeVoice = async () => {
    if (!form.voiceNotePath) return;
    const path = form.voiceNotePath;
    setPending("remove-voice");
    setError("");
    try {
      setForm((current) => ({ ...current, voiceNotePath: "" }));
      await saveDraft({ voiceNotePath: "" });
      if (draftAddress && path.includes("/" + draftAddress.id + "/")) {
        await removeAddressMedia(path);
      }
      setMediaUrls((current) => {
        const next = { ...current };
        delete next[path];
        return next;
      });
    } catch {
      setError(copy.genericError);
    } finally {
      setPending("");
    }
  };

  const cleanupRecording = () => {
    if (recordingTickerRef.current) window.clearInterval(recordingTickerRef.current);
    if (recordingStopTimerRef.current) window.clearTimeout(recordingStopTimerRef.current);
    recordingTickerRef.current = null;
    recordingStopTimerRef.current = null;
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    setRecording(false);
    setRecordingSeconds(0);
  };

  const startVoiceRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (
      !user ||
      !draftAddress ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(copy.genericError);
      return;
    }

    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const preferred = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: preferred });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      });
      recorder.addEventListener(
        "stop",
        () => {
          const chunks = audioChunksRef.current;
          cleanupRecording();
          if (!chunks.length) return;
          const blob = new Blob(chunks, { type: preferred });
          const file = new File([blob], "voice-directions.webm", { type: preferred });
          setPending("voice");
          void uploadAddressMedia({
            userId: user.id,
            addressId: draftAddress.id,
            file,
            kind: "voice",
          })
            .then(async (voiceNotePath) => {
              const next = { ...form, voiceNotePath };
              setForm(next);
              await saveDraft({ voiceNotePath });
            })
            .catch(() => setError(copy.genericError))
            .finally(() => setPending(""));
        },
        { once: true },
      );

      recorder.start(250);
      setRecording(true);
      setRecordingSeconds(0);
      recordingTickerRef.current = window.setInterval(
        () => setRecordingSeconds((seconds) => Math.min(30, seconds + 1)),
        1000,
      );
      recordingStopTimerRef.current = window.setTimeout(() => recorder.stop(), 30_000);
    } catch {
      cleanupRecording();
      setError(copy.genericError);
    }
  };

  const typeMeta = ADDRESS_TYPES.find((item) => item.type === form.addressType);
  const TypeIcon = addressTypeIcon(form.addressType);

  return (
    <Dialog open={addressBookOpen} onOpenChange={setAddressBookOpen}>
      <DialogContent
        dir={direction}
        data-testid="customer-address-hub"
        className="bottom-0 top-auto max-h-[96dvh] w-full max-w-none translate-x-[-50%] translate-y-0 overflow-hidden rounded-t-[28px] border-x-0 border-b-0 border-border/70 bg-background p-0 shadow-2xl sm:bottom-auto sm:top-[50%] sm:w-[calc(100%-2rem)] sm:max-w-[34rem] sm:translate-y-[-50%] sm:rounded-[28px] sm:border"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-muted sm:hidden" aria-hidden="true" />

        {view === "book" ? (
          <div className="max-h-[92dvh] overflow-y-auto p-5 pt-4 sm:p-7">
            <DialogHeader className="text-start">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <DialogTitle className="text-2xl font-extrabold tracking-[-0.03em]">
                    {copy.title}
                  </DialogTitle>
                  <DialogDescription className="sr-only">{copy.title}</DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setView("orders")}
                    className="grid h-10 w-10 place-items-center rounded-full border border-border/70 bg-card hover:bg-surface"
                    aria-label={copy.myOrders}
                    title={copy.myOrders}
                  >
                    <ReceiptText className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("profile")}
                    className="grid h-10 w-10 place-items-center rounded-full border border-border/70 bg-card hover:bg-surface"
                    aria-label={copy.profile}
                    title={copy.profile}
                  >
                    <CircleUserRound className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-5 flex h-14 items-center gap-3 rounded-2xl border border-border/75 bg-card px-4 shadow-sm">
              <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy.search}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-border/65 bg-card shadow-sm">
              <button
                type="button"
                onClick={() => void startDraft(true)}
                className="flex w-full items-center gap-3 px-4 py-4 text-start transition-colors hover:bg-surface"
                disabled={pending === "draft"}
              >
                <Crosshair className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{copy.current}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{copy.currentHelp}</span>
                </span>
                {pending === "draft" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <NextIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                )}
              </button>
              <div className="mx-4 h-px bg-border/60" />
              <button
                type="button"
                onClick={() => void startDraft(false)}
                className="flex w-full items-center gap-3 px-4 py-4 text-start transition-colors hover:bg-surface"
              >
                <MapPinned className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{copy.elsewhere}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{copy.elsewhereHelp}</span>
                </span>
                <NextIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </button>
              <div className="mx-4 h-px bg-border/60" />
              <button
                type="button"
                onClick={() => void startDraft(false)}
                className="flex w-full items-center gap-3 px-4 py-4 text-start transition-colors hover:bg-surface"
              >
                <Plus className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{copy.add}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{copy.elsewhereHelp}</span>
                </span>
                <NextIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </button>
            </div>

            <h3 className="mt-7 text-xl font-extrabold tracking-[-0.02em]">{copy.saved}</h3>
            <div className="mt-3 space-y-3">
              {loading ? (
                <div className="grid place-items-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
                </div>
              ) : filteredAddresses.length ? (
                filteredAddresses.map((address) => {
                  const Icon = addressTypeIcon(address.addressType);
                  const selected = selectedAddress?.id === address.id;
                  return (
                    <div
                      key={address.id}
                      className={
                        "flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition " +
                        (selected ? "border-primary ring-1 ring-primary/20" : "border-border/65")
                      }
                    >
                      <button
                        type="button"
                        onClick={() => {
                          selectAddress(address);
                          setAddressBookOpen(false);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 text-start"
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-extrabold">
                              {address.nickname || copy.saved}
                            </span>
                            {address.isDefault ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                {copy.default}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {addressDisplayLine(address)}
                          </span>
                        </span>
                      </button>

                      <DropdownMenu dir={direction}>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={ar ? "خيارات العنوان" : "Address options"}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-surface"
                          >
                            <Ellipsis className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
                          <DropdownMenuItem
                            onSelect={() => void editAddress(address)}
                            className="rounded-lg"
                          >
                            {pending === "edit:" + address.id ? (
                              <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Pencil className="me-2 h-4 w-4" aria-hidden="true" />
                            )}
                            {copy.edit}
                          </DropdownMenuItem>
                          {!address.isDefault ? (
                            <DropdownMenuItem
                              onSelect={() => void makeDefault(address)}
                              className="rounded-lg"
                            >
                              <Check className="me-2 h-4 w-4" aria-hidden="true" />
                              {copy.setDefault}
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            onSelect={() => setAddressPendingDelete(address)}
                            className="rounded-lg text-destructive focus:text-destructive"
                          >
                            <Trash2 className="me-2 h-4 w-4" aria-hidden="true" />
                            {copy.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  {copy.noSaved}
                </div>
              )}
            </div>

            {error ? (
              <p role="status" className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        {view === "map" ? (
          <div className="flex max-h-[92dvh] min-h-[76dvh] flex-col overflow-hidden">
            <div className="shrink-0 px-5 pb-3 pt-3 sm:px-7">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setView("book")}
                  className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface"
                  aria-label={copy.previous}
                >
                  <BackIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                <h2 className="text-xl font-extrabold">{copy.mapTitle}</h2>
              </div>
              <Progress step={1} />
            </div>

            <div className="min-h-0 flex-1">
              <GoogleDeliveryMap
                autoLocateToken={autoLocateToken}
                value={
                  form.latitude !== null && form.longitude !== null
                    ? {
                        latitude: form.latitude,
                        longitude: form.longitude,
                        formattedAddress: form.formattedAddress,
                        placeId: form.placeId,
                        areaStreet: form.areaStreet,
                      }
                    : null
                }
                onChange={(location) => {
                  const next = {
                    ...form,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    formattedAddress: location.formattedAddress || form.formattedAddress,
                    placeId: location.placeId || form.placeId,
                    areaStreet: location.areaStreet || form.areaStreet,
                  };
                  setForm(next);
                  scheduleSave(next);
                  setError("");
                }}
              />
            </div>

            <div className="shrink-0 border-t border-border/70 bg-background p-5 sm:px-7">
              <h3 className="text-xl font-extrabold">{copy.mapTitle}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.mapHelp}</p>
              {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
              <Button
                type="button"
                className="mt-4 h-13 w-full rounded-2xl text-base font-extrabold"
                onClick={() => void confirmMap()}
                disabled={pending === "map"}
              >
                {pending === "map" ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                {copy.confirmLocation}
              </Button>
            </div>
          </div>
        ) : null}

        {view === "type" ? (
          <div className="max-h-[92dvh] overflow-y-auto p-5 pt-3 sm:p-7">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setView("map")}
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface"
                aria-label={copy.previous}
              >
                <BackIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              <h2 className="text-xl font-extrabold">{copy.chooseType}</h2>
            </div>
            <Progress step={2} />

            <div className="mt-6 space-y-3">
              {ADDRESS_TYPES.map((item) => {
                const Icon = addressTypeIcon(item.type);
                return (
                  <button
                    type="button"
                    key={item.type}
                    onClick={() => void chooseType(item.type)}
                    disabled={pending === item.type}
                    className="flex w-full items-center gap-4 rounded-2xl border border-border/65 bg-card p-4 text-start shadow-sm transition hover:border-primary/40 hover:bg-surface"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-extrabold">{item.title}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{item.subtitle}</span>
                    </span>
                    {pending === item.type ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <NextIcon className="h-6 w-6" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          </div>
        ) : null}

        {view === "details" ? (
          <div className="max-h-[92dvh] overflow-y-auto p-5 pt-3 sm:p-7">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setView("type")}
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface"
                aria-label={copy.previous}
              >
                <BackIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              <h2 className="text-xl font-extrabold">{copy.detailsTitle}</h2>
            </div>
            <Progress step={3} />

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border/65 bg-card p-4 shadow-sm">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <TypeIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold">{typeMeta?.title || copy.chooseType}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{typeMeta?.subtitle}</span>
              </span>
              <button
                type="button"
                onClick={() => setView("type")}
                className="text-xs font-bold text-primary"
              >
                {ar ? "تغيير" : "Change"}
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <Field
                value={form.nickname}
                placeholder={copy.nickname}
                onChange={(value) => updateField("nickname", value)}
              />
              <Field
                value={form.areaStreet}
                placeholder={copy.areaStreet}
                onChange={(value) => updateField("areaStreet", value)}
              />

              {form.addressType !== "other" ? (
                <Field
                  value={form.buildingName}
                  placeholder={copy.building}
                  onChange={(value) => updateField("buildingName", value)}
                />
              ) : null}

              {form.addressType === "apartment" ||
              form.addressType === "house_villa" ||
              form.addressType === "compound" ||
              form.addressType === "office" ? (
                <Field
                  value={form.buildingNumber}
                  placeholder={copy.buildingNo}
                  onChange={(value) => updateField("buildingNumber", value)}
                />
              ) : null}

              {form.addressType === "apartment" ||
              form.addressType === "office" ||
              form.addressType === "hotel" ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    value={form.floor}
                    placeholder={copy.floor}
                    onChange={(value) => updateField("floor", value)}
                  />
                  <Field
                    value={form.unit}
                    placeholder={copy.unit}
                    onChange={(value) => updateField("unit", value)}
                  />
                </div>
              ) : null}

              <Field
                value={form.doorDetails}
                placeholder={copy.door}
                onChange={(value) => updateField("doorDetails", value)}
              />

              <div className="flex h-14 overflow-hidden rounded-2xl border border-border/70 bg-card">
                <span className="flex items-center gap-2 border-e border-border/70 px-3 text-sm font-bold">
                  <span aria-hidden="true">🇱🇧</span> +961
                </span>
                <input
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder={copy.phone}
                  className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-border/65 bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold">{copy.helpFind}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.helpFindText}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-extrabold text-primary">
                  {ar ? "اختياري" : "OPTIONAL"}
                </span>
              </div>

              <div className="mt-4 rounded-2xl bg-surface p-3">
                <button
                  type="button"
                  onClick={() => void startVoiceRecording()}
                  className={
                    "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start transition " +
                    (recording ? "text-destructive" : "hover:bg-accent")
                  }
                  disabled={pending === "voice" || pending === "remove-voice"}
                >
                  {pending === "voice" ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Mic className="h-5 w-5" aria-hidden="true" />
                  )}
                  <span className="flex-1 text-sm font-bold">
                    {recording
                      ? copy.recording + " " + recordingSeconds + "s / 30s"
                      : form.voiceNotePath
                        ? copy.voiceAdded
                        : copy.record}
                  </span>
                </button>

                {form.voiceNotePath && mediaUrls[form.voiceNotePath] ? (
                  <div className="mt-2 flex items-center gap-2">
                    <audio
                      controls
                      preload="metadata"
                      src={mediaUrls[form.voiceNotePath]}
                      className="h-9 min-w-0 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => void removeVoice()}
                      disabled={pending === "remove-voice"}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-destructive hover:bg-destructive/10"
                      aria-label={copy.removeVoice}
                      title={copy.removeVoice}
                    >
                      {pending === "remove-voice" ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                ) : null}
              </div>

              <textarea
                value={form.deliveryInstructions}
                onChange={(event) => updateField("deliveryInstructions", event.target.value)}
                placeholder={copy.instructions}
                rows={3}
                className="mt-3 w-full resize-none rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(event) => void addPhotos(event)}
              />
              {form.photoPaths.length ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {form.photoPaths.map((path) => (
                    <div
                      key={path}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted"
                    >
                      {mediaUrls[path] ? (
                        <img
                          src={mediaUrls[path]}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => void removePhoto(path)}
                        disabled={pending === "remove-photo"}
                        className="absolute end-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-background/90 text-destructive shadow-sm backdrop-blur hover:bg-background"
                        aria-label={copy.removePhoto}
                        title={copy.removePhoto}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={pending === "photos" || form.photoPaths.length >= 5}
                className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-surface px-4 text-sm font-bold hover:bg-accent disabled:opacity-50"
              >
                {pending === "photos" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Camera className="h-4 w-4" aria-hidden="true" />
                )}
                {form.photoPaths.length
                  ? form.photoPaths.length + " " + copy.photosAdded
                  : copy.addPhotos}
              </button>
            </div>

            {error ? (
              <p role="status" className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="sticky bottom-0 mt-5 flex gap-3 bg-background/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
              <Button
                type="button"
                variant="ghost"
                className="h-13 flex-1 rounded-2xl font-extrabold"
                onClick={() => setView("type")}
              >
                {copy.previous}
              </Button>
              <Button
                type="button"
                className="h-13 flex-[1.6] rounded-2xl text-base font-extrabold"
                onClick={() => void finishAddress()}
                disabled={pending === "done"}
              >
                {pending === "done" ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                {pending === "done" ? copy.saving : copy.done}
              </Button>
            </div>
          </div>
        ) : null}

        {view === "orders" ? (
          <div className="max-h-[92dvh] overflow-y-auto p-5 pt-3 sm:p-7">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setView("book")}
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface"
                aria-label={copy.previous}
              >
                <BackIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold">{copy.myOrders}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {ar
                    ? "الطلبات المرتبطة برقم الهاتف أو البريد الموثّق في حسابك."
                    : "Orders linked to your verified account phone or email."}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {ordersLoading ? (
                <div className="grid place-items-center py-12 text-muted-foreground">
                  <Loader2 className="mb-3 h-6 w-6 animate-spin text-primary" aria-hidden="true" />
                  <span className="text-sm">{copy.loadingOrders}</span>
                </div>
              ) : orders.length ? (
                orders.map((order) => {
                  const expanded = expandedOrderId === order.orderId;
                  const items = orderItems[order.orderId] || [];
                  const location = order.deliveryLocation;
                  const latitude =
                    typeof location?.latitude === "number" ? location.latitude : null;
                  const longitude =
                    typeof location?.longitude === "number" ? location.longitude : null;
                  const mapHref =
                    latitude !== null && longitude !== null
                      ? "https://www.google.com/maps?q=" + latitude + "," + longitude
                      : "";
                  return (
                    <div
                      key={order.orderId}
                      className="overflow-hidden rounded-2xl border border-border/65 bg-card shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => void toggleOrder(order)}
                        className="flex w-full items-center gap-3 p-4 text-start transition hover:bg-surface"
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                          <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-3">
                            <span className="truncate text-sm font-extrabold">
                              {copy.orderNumber} #{order.orderNumber}
                            </span>
                            <span className="shrink-0 text-sm font-extrabold">
                              {new Intl.NumberFormat(ar ? "ar-LB" : "en-US", {
                                style: "currency",
                                currency: order.currency || "USD",
                              }).format(order.total)}
                            </span>
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              {order.createdAt
                                ? new Intl.DateTimeFormat(ar ? "ar-LB" : "en-GB", {
                                    dateStyle: "medium",
                                  }).format(new Date(order.createdAt))
                                : ""}
                            </span>
                            <span aria-hidden="true">•</span>
                            <span className="font-semibold capitalize text-foreground">
                              {order.status.replaceAll("_", " ")}
                            </span>
                          </span>
                        </span>
                        {pending === "order:" + order.orderId ? (
                          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                        ) : (
                          <NextIcon
                            className={
                              "h-5 w-5 text-muted-foreground transition-transform " +
                              (expanded ? "rotate-90" : "")
                            }
                            aria-hidden="true"
                          />
                        )}
                      </button>

                      {expanded ? (
                        <div className="border-t border-border/60 px-4 pb-4 pt-3">
                          {items.length ? (
                            <div className="space-y-2">
                              {items.map((item) => (
                                <div
                                  key={item.itemId}
                                  className="flex items-start justify-between gap-3 text-sm"
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate font-semibold">{item.title}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {item.variantTitle ? item.variantTitle + " · " : ""}
                                      ×{item.quantity}
                                    </span>
                                  </span>
                                  <span className="shrink-0 font-bold">
                                    {new Intl.NumberFormat(ar ? "ar-LB" : "en-US", {
                                      style: "currency",
                                      currency: order.currency || "USD",
                                    }).format(item.lineTotal)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : pending !== "order:" + order.orderId ? (
                            <p className="text-xs text-muted-foreground">{copy.items}</p>
                          ) : null}

                          <div className="mt-3 rounded-xl bg-surface px-3 py-2.5 text-xs leading-5 text-muted-foreground">
                            {[order.city, order.deliveryAddress].filter(Boolean).join(" — ")}
                          </div>

                          {mapHref ? (
                            <a
                              href={mapHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                            >
                              <MapPinned className="h-4 w-4" aria-hidden="true" />
                              {copy.viewOnMap}
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  {copy.ordersEmpty}
                </div>
              )}
            </div>

            {error ? (
              <p role="status" className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        {view === "profile" ? (
          <div className="max-h-[92dvh] overflow-y-auto p-5 pt-3 sm:p-7">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setView("book")}
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface"
                aria-label={copy.previous}
              >
                <BackIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              <h2 className="text-xl font-extrabold">{copy.profile}</h2>
            </div>

            <form onSubmit={saveProfileForm} className="mt-6 space-y-3">
              <Field
                value={profileForm.fullName}
                placeholder={copy.name}
                onChange={(fullName) => setProfileForm((current) => ({ ...current, fullName }))}
              />
              <Field
                value={profileForm.phone}
                placeholder={copy.phone}
                onChange={(phone) => setProfileForm((current) => ({ ...current, phone }))}
                inputMode="tel"
              />
              <Field
                value={profileForm.email}
                placeholder={copy.email}
                onChange={(email) => setProfileForm((current) => ({ ...current, email }))}
                inputMode="email"
              />
              {error ? (
                <p
                  role="status"
                  className={
                    "rounded-xl px-3 py-2 text-sm " +
                    (error === copy.profileSaved
                      ? "bg-primary/10 text-primary"
                      : "bg-destructive/10 text-destructive")
                  }
                >
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                className="h-13 w-full rounded-2xl font-extrabold"
                disabled={pending === "profile"}
              >
                {pending === "profile" ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                {copy.saveProfile}
              </Button>
            </form>
          </div>
        ) : null}
      </DialogContent>

      <AlertDialog
        open={Boolean(addressPendingDelete)}
        onOpenChange={(open) => {
          if (!open && pending !== "delete") setAddressPendingDelete(null);
        }}
      >
        <AlertDialogContent dir={direction} className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle>{copy.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel disabled={pending === "delete"}>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={pending === "delete"}
              onClick={(event) => {
                event.preventDefault();
                if (!addressPendingDelete || pending === "delete") return;
                setPending("delete");
                setError("");
                void removeAddress(addressPendingDelete)
                  .then(() => {
                    setAddressPendingDelete(null);
                  })
                  .catch(() => setError(copy.genericError))
                  .finally(() => setPending(""));
              }}
            >
              {pending === "delete" ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="me-2 h-4 w-4" aria-hidden="true" />
              )}
              {copy.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function Progress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2" aria-label={"Step " + step + " of 3"}>
      {[1, 2, 3].map((item) => (
        <span
          key={item}
          className={"h-1 rounded-full " + (item <= step ? "bg-primary" : "bg-border")}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function Field({
  value,
  placeholder,
  onChange,
  inputMode,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  inputMode?: "text" | "tel" | "email";
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className="h-14 w-full rounded-2xl border border-border/70 bg-card px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 placeholder:text-muted-foreground"
    />
  );
}
