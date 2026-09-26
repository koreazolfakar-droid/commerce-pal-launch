# Space Call Android

This directory contains the hardened Android Trusted Web Activity (TWA) shell for
`https://www.spacecallapp.store`.

## Identity

- Production application ID: `store.spacecallapp.app`
- Test application ID: `store.spacecallapp.app.debug`
- Minimum SDK: API 24
- Target / compile SDK: API 36
- Android Browser Helper: 2.7.3

## Build toolchain

The Android project currently uses:

- Android Gradle Plugin: 9.4.0
- Gradle: 9.6.0 minimum (CI pins 9.6.0)
- JDK: 17
- Android SDK Platform: 36
- Android Build Tools: 36.0.0

For a local debug build, set `ANDROID_HOME` or `ANDROID_SDK_ROOT` and run:

`bash scripts/android-local-debug-build.sh`

That command runs the Android source security gate, the standalone Java 8 URL
policy regression test, `lintDebug`, `assembleDebug`, package/version checks,
signature verification, 16 KB ZIP alignment verification, and SHA-256 generation.

A successful run writes:

- `dist/android/Space-Call-1.0.2-debug.apk`
- `dist/android/Space-Call-1.0.2-debug.apk.sha256`

## Architecture

The storefront remains the source of truth. Android launches the canonical HTTPS
origin through a TWA and falls back only to an external browser / Custom Tab.
There is intentionally no embedded WebView fallback.

`SpaceCallLauncherActivity` is the only launcher entry point. It accepts only
Space Call web URLs, upgrades HTTP links to the canonical HTTPS origin, rejects
non-web or foreign hosts, strips user-info/ports, and catches runtime TWA launch
failures so a broken or missing provider cannot crash the app.

## Security baseline

- cleartext HTTP disabled
- backups and device-transfer extraction disabled
- broad media/storage permissions forbidden
- native camera/media permissions are intentionally absent; browser/system pickers own those flows
- geolocation is browser-managed and requested by the storefront only when the feature is used
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

Debug APKs use the build environment's debug signing identity and the separate
`store.spacecallapp.app.debug` package. They are for install/runtime testing only
and are intentionally not trusted by the production Digital Asset Links file.

Never commit a production keystore or signing password. The Play/release identity
must be persistent and must never reuse a disposable debug signing key.

## Validation

A green Android pipeline must include all of the following:

1. source security gate
2. Java 8 URL policy regression test
3. Android lint with real errors blocking; warnings remain visible for review
4. debug APK build
5. APK package/version/signature/alignment inspection
6. emulator install and cold-launch smoke test
7. crash-buffer and fatal-log scan
8. Digital Asset Links validation
9. signed release APK/AAB only when persistent release signing is configured

The emulator smoke test is kept separate from the local build script because it
requires an Android virtual or physical device. CI runs it through
`.github/scripts/android-emulator-smoke-test.sh`.

## Camera and photos

The TWA shell intentionally does not declare Android CAMERA or media-library
permissions. Camera access used by the web storefront is mediated by the selected
TWA/browser provider and its site-permission flow. Photo/file selection should use
the browser/system picker, which grants access only to user-selected files and does
not require broad READ_MEDIA_* or storage permissions in this shell.

Location follows the same least-privilege model: the Android shell does not request
coarse, fine, or background location. When the storefront calls the web Geolocation
API, the active TWA/browser provider handles the site permission at that moment.
This avoids native location-delegation background-launch edge cases while
preserving just-in-time location access for the storefront.
