# Space Call Android

This directory contains the hardened Android Trusted Web Activity (TWA) shell for
`https://www.spacecallapp.store`.

## Identity

- Production application ID: `store.spacecallapp.app`
- Test application ID: `store.spacecallapp.app.debug`
- Minimum SDK: API 24
- Target / compile SDK: API 36
- Android Browser Helper: 2.7.3
- Location delegation: 1.1.2

## Architecture

The storefront remains the source of truth. Android launches the canonical HTTPS
origin through a TWA and falls back only to an external browser / Custom Tab.
There is intentionally no embedded WebView fallback.

`SpaceCallLauncherActivity` is the only launcher entry point. It rejects non-HTTPS
and non-Space-Call launch URLs and catches runtime TWA launch failures so a broken
or missing provider cannot crash the app.

## Security baseline

- cleartext HTTP disabled
- backups and device-transfer extraction disabled
- broad media/storage permissions forbidden
- camera and location are optional device features
- FileProvider is private and app-scoped
- release builds are non-debuggable and R8/resource shrinking is enabled
- release APK/AAB generation is blocked without the persistent release signing key
- test and release signing identities are kept separate
- Digital Asset Links are required on the canonical `www` origin with no redirect

## Digital Asset Links

The production site must return HTTP 200 with `Content-Type: application/json` at:

`https://www.spacecallapp.store/.well-known/assetlinks.json`

No 301/302 redirect is allowed for that path.

The checked-in production file intentionally contains no debug certificate.
Debug builds use `store.spacecallapp.app.debug` and do not request production App
Link verification. This prevents a disposable test signing key from ever becoming
trusted by the production domain.

Before Play Store release, add the persistent Play App Signing certificate
fingerprint for `store.spacecallapp.app`. The release build requests App Link
verification and the security gate rejects a signed production build unless the
active release certificate is present in `assetlinks.json`.

## Signing

Release builds require:

- `ANDROID_KEYSTORE_PATH`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Optional stable test signing uses:

- `ANDROID_TEST_KEYSTORE_PATH`
- `ANDROID_TEST_KEYSTORE_PASSWORD`
- `ANDROID_TEST_KEY_ALIAS`
- `ANDROID_TEST_KEY_PASSWORD`

Never commit a keystore or signing password. Test keys must never be reused for a
production or Play signing identity.

## Validation

A green Android pipeline must include all of the following:

1. source security gate
2. Android lint with warnings treated as errors
3. debug APK build
4. APK signature/package inspection
5. emulator install and cold-launch smoke test
6. crash-buffer and fatal-log scan
7. Digital Asset Links validation
8. signed release APK/AAB only when persistent release signing is configured


## Camera and photos

The TWA shell intentionally does not declare Android CAMERA or media-library
permissions. Camera access used by the web storefront is mediated by the selected
TWA/browser provider and its site-permission flow. Photo/file selection should use
the browser/system picker, which grants access only to user-selected files and does
not require broad READ_MEDIA_* or storage permissions in this shell.

Native location is the exception: it uses Browser Helper's location delegation and
the Android coarse/fine location permissions so the OS permission prompt can occur
only when the web experience actually requests geolocation.
