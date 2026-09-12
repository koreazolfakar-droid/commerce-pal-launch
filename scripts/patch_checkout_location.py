from pathlib import Path
import re

path = Path('src/components/WhatsAppCheckoutForm.tsx')
text = path.read_text(encoding='utf-8')
original = text


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, found {count}')
    text = text.replace(old, new, 1)

replace_once('  Download,\n  FileText,', '  Download,\n  ExternalLink,\n  FileText,', 'ExternalLink import')

replace_once(
'''type SharedLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};
''',
'''type SharedLocation = {
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
''',
'location result types',
)

pattern = re.compile(
    r'''function googleMapsUrl\(location: SharedLocation\) \{.*?\n\}\n\nfunction getCurrentLocation\(\): Promise<SharedLocation \| null> \{.*?\n\}\n\nexport function''',
    re.S,
)
replacement = '''function googleMapsUrl(location: SharedLocation) {
  const latitude = location.latitude.toFixed(6);
  const longitude = location.longitude.toFixed(6);
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function googleMapsEmbedUrl(location: SharedLocation) {
  const latitude = location.latitude.toFixed(6);
  const longitude = location.longitude.toFixed(6);
  return `https://maps.google.com/maps?q=${latitude},${longitude}&z=17&output=embed`;
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
      (position) => {
        resolve({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          error: null,
        });
      },
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

  if (precise.location || precise.error === "permission_denied") {
    return precise;
  }

  // Android browsers/WebViews can time out while waiting for a high-accuracy GPS fix.
  // Retry with a cached/network-assisted fix before declaring location unavailable.
  return requestCurrentPosition({
    enableHighAccuracy: false,
    timeout: 8000,
    maximumAge: 300000,
  });
}

export function'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise RuntimeError(f'geolocation helpers: expected 1 match, found {count}')

replace_once(
'  const [locationFailed, setLocationFailed] = useState(false);',
'  const [locationError, setLocationError] = useState<LocationErrorReason | null>(null);',
'location error state',
)

replace_once(
'''        locationDescription:
          "سنرفق رابط موقعك الحالي تلقائيًا مع رسالة واتساب عند الإرسال. سيطلب المتصفح إذنك أولًا.",
        attachLocation: "إرفاق موقعي تلقائيًا",
        detectLocation: "تحديد موقعي الآن",
        locating: "جارٍ تحديد الموقع...",
        locationReady: "تم تحديد الموقع وسيُرفق مع الطلب.",
        locationUnavailable: "تعذر تحديد الموقع. يمكنك متابعة إرسال الطلب بدون الموقع.",
        locationLabel: "الموقع على الخريطة",
''',
'''        locationDescription:
          "اضغط تحديد موقعي وسنطلب إذن الموقع من جهازك، ثم نعرضه على خريطة حية ونرفق رابطه مع طلب واتساب.",
        attachLocation: "إرفاق موقعي تلقائيًا",
        detectLocation: "تحديد موقعي الآن",
        locating: "جارٍ تحديد الموقع...",
        locationReady: "تم تحديد الموقع وسيُرفق مع الطلب.",
        locationPermissionDenied:
          "صلاحية الموقع مرفوضة. فعّل Location لهذا الموقع من إعدادات المتصفح ثم اضغط تحديد موقعي من جديد.",
        locationUnavailable:
          "تعذر الحصول على إشارة الموقع. تأكد أن خدمة Location/GPS مفعّلة ثم أعد المحاولة.",
        locationTimeout: "استغرق تحديد الموقع وقتًا طويلًا. اقترب من نافذة أو فعّل GPS ثم أعد المحاولة.",
        locationUnsupported: "هذا المتصفح لا يدعم تحديد الموقع. جرّب Chrome أو متصفحًا حديثًا.",
        locationInsecure: "تحديد الموقع يحتاج اتصال HTTPS آمنًا. افتح النسخة الآمنة من الموقع ثم أعد المحاولة.",
        locationUnknown: "تعذر تحديد الموقع الآن. أعد المحاولة أو أرسل الطلب بدون الموقع.",
        locationLabel: "الموقع على الخريطة",
        mapPreview: "معاينة الموقع الحية",
        openMap: "فتح في Google Maps",
        accuracy: "دقة الموقع",
''',
'Arabic location copy',
)

replace_once(
'''        locationDescription:
          "We’ll automatically attach your current location to the WhatsApp order when you send it. Your browser will ask for permission first.",
        attachLocation: "Attach my location automatically",
        detectLocation: "Detect my location now",
        locating: "Detecting location...",
        locationReady: "Location detected and will be attached to the order.",
        locationUnavailable: "We couldn't detect your location. You can still send the order without it.",
        locationLabel: "Map location",
''',
'''        locationDescription:
          "Tap detect location, approve the browser permission, and we’ll show your position on a live map and attach it to WhatsApp.",
        attachLocation: "Attach my location automatically",
        detectLocation: "Detect my location now",
        locating: "Detecting location...",
        locationReady: "Location detected and will be attached to the order.",
        locationPermissionDenied:
          "Location permission is blocked. Allow Location for this site in your browser settings, then try again.",
        locationUnavailable: "We couldn't get a location signal. Turn on Location/GPS and try again.",
        locationTimeout: "Location detection timed out. Turn on GPS or move to a clearer area, then try again.",
        locationUnsupported: "This browser doesn't support location. Please try Chrome or another modern browser.",
        locationInsecure: "Location requires a secure HTTPS connection. Open the secure site and try again.",
        locationUnknown: "We couldn't detect your location right now. Try again or send the order without it.",
        locationLabel: "Map location",
        mapPreview: "Live location preview",
        openMap: "Open in Google Maps",
        accuracy: "Location accuracy",
''',
'English location copy',
)

locate_pattern = re.compile(
    r'''  const locateCustomer = async \(\) => \{.*?\n  \};\n\n  const validateDetails''',
    re.S,
)
locate_replacement = '''  const locateCustomer = async () => {
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
        return copy.locationPermissionDenied;
      case "unavailable":
        return copy.locationUnavailable;
      case "timeout":
        return copy.locationTimeout;
      case "unsupported":
        return copy.locationUnsupported;
      case "insecure":
        return copy.locationInsecure;
      case "unknown":
        return copy.locationUnknown;
      default:
        return "";
    }
  };

  const validateDetails'''
text, count = locate_pattern.subn(locate_replacement, text, count=1)
if count != 1:
    raise RuntimeError(f'locateCustomer: expected 1 match, found {count}')

replace_once('                setLocationFailed(false);', '                setLocationError(null);', 'checkbox location reset')

start_token = '''          {shareLocation ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 ps-7">'''
end_token = '''          ) : null}
        </div>

        <fieldset'''
start = text.find(start_token)
if start < 0:
    raise RuntimeError('location UI start not found')
end = text.find(end_token, start)
if end < 0:
    raise RuntimeError('location UI end not found')

new_ui = '''          {shareLocation ? (
            <div className="mt-3 space-y-3 ps-7">
              <div className="flex flex-wrap items-center gap-3">
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
                <p role="alert" className="text-xs font-medium leading-5 text-amber-700 dark:text-amber-300">
                  {locationErrorMessage()}
                </p>
              ) : null}

              {location ? (
                <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3.5 py-3">
                    <div>
                      <p className="text-xs font-extrabold text-foreground">{copy.mapPreview}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {copy.accuracy}: ±{Math.max(1, Math.round(location.accuracy))} m
                      </p>
                    </div>
                    <a
                      href={googleMapsUrl(location)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition hover:bg-muted"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {copy.openMap}
                    </a>
                  </div>
                  <iframe
                    key={`${location.latitude.toFixed(6)}-${location.longitude.toFixed(6)}`}
                    src={googleMapsEmbedUrl(location)}
                    title={copy.mapPreview}
                    className="h-64 w-full border-0 sm:h-72"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              ) : null}
            </div>
          ) : null}
'''
text = text[:start] + new_ui + text[end + len('          ) : null}\n'):]

if text == original:
    raise RuntimeError('patch made no changes')

for forbidden in ['locationFailed', 'setLocationFailed', "We couldn't detect your location. You can still send the order without it."]:
    if forbidden in text:
        raise RuntimeError(f'old location behavior still present: {forbidden}')

path.write_text(text, encoding='utf-8')
print('Patched WhatsAppCheckoutForm.tsx successfully')
