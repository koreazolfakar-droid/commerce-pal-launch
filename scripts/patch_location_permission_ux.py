from pathlib import Path

path = Path("src/components/WhatsAppCheckoutForm.tsx")
text = path.read_text(encoding="utf-8")
original = text


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {count}")
    text = text.replace(old, new, 1)


replace_once(
    '''        locationPermissionDenied:
          "صلاحية الموقع مرفوضة. فعّل Location لهذا الموقع من إعدادات المتصفح ثم اضغط تحديد موقعي من جديد.",
''',
    '''        locationPermissionDenied:
          "صلاحية الموقع محظورة لهذا الموقع. المتصفح لا يسمح للموقع بإعادة فتح نافذة الإذن تلقائيًا بعد الحظر.",
        locationPermissionHelp:
          "على Chrome في Android: اضغط أيقونة معلومات/إعدادات الموقع بجانب العنوان ← الأذونات Permissions ← الموقع Location ← سماح Allow، ثم ارجع واضغط إعادة المحاولة.",
        retryLocation: "إعادة محاولة تحديد الموقع",
        continueWithoutLocation: "المتابعة بدون الموقع",
''',
    "Arabic blocked-location guidance",
)

replace_once(
    '''        locationPermissionDenied:
          "Location permission is blocked. Allow Location for this site in your browser settings, then try again.",
''',
    '''        locationPermissionDenied:
          "Location access is blocked for this site. Browsers cannot reopen a blocked permission automatically.",
        locationPermissionHelp:
          "On Chrome for Android: tap the site controls/info icon next to the address → Permissions → Location → Allow, then come back and try again.",
        retryLocation: "Try location again",
        continueWithoutLocation: "Continue without location",
''',
    "English blocked-location guidance",
)

replace_once(
    '''              {locationError ? (
                <p role="alert" className="text-xs font-medium leading-5 text-amber-700 dark:text-amber-300">
                  {locationErrorMessage()}
                </p>
              ) : null}
''',
    '''              {locationError ? (
                <div
                  role="alert"
                  className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-3 text-xs font-medium leading-5 text-amber-800 dark:text-amber-200"
                >
                  <p>{locationErrorMessage()}</p>

                  {locationError === "permission_denied" ? (
                    <>
                      <p className="mt-1.5 text-[11px] leading-5 text-amber-800/90 dark:text-amber-100/90">
                        {copy.locationPermissionHelp}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={locateCustomer}
                          disabled={locating}
                          className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-background px-3 py-1.5 text-[11px] font-bold text-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-60"
                        >
                          {locating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                          {copy.retryLocation}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShareLocation(false);
                            setLocationError(null);
                            setSubmitted(false);
                          }}
                          className="rounded-full border border-transparent px-3 py-1.5 text-[11px] font-bold text-foreground underline-offset-2 transition hover:bg-background/70 hover:underline"
                        >
                          {copy.continueWithoutLocation}
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={locateCustomer}
                      disabled={locating}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-background px-3 py-1.5 text-[11px] font-bold text-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-60"
                    >
                      {locating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                      {copy.retryLocation}
                    </button>
                  )}
                </div>
              ) : null}
''',
    "location error actions",
)

if text == original:
    raise RuntimeError("patch made no changes")

required = [
    "Browsers cannot reopen a blocked permission automatically",
    "locationPermissionHelp",
    "continueWithoutLocation",
    'locationError === "permission_denied"',
    "setShareLocation(false)",
]
for token in required:
    if token not in text:
        raise RuntimeError(f"missing required token after patch: {token}")

path.write_text(text, encoding="utf-8")
print("Location permission UX patch applied successfully")
