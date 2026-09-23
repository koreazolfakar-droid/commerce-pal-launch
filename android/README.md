# Space Call Android app

This directory contains the Android Trusted Web Activity (TWA) wrapper for https://www.spacecallapp.store.

## Release identity

- Application ID: `store.spacecallapp.app`
- Target SDK: Android 16 / API 36
- Minimum SDK: API 23
- Android Browser Helper: 2.7.3

## Why TWA

TWA keeps the live storefront as the source of truth while providing an installed, full-screen Android application. It also avoids embedding Google OAuth inside a raw WebView, which can be rejected by Google identity flows.

## Required Digital Asset Link

The production site must serve:

`https://www.spacecallapp.store/.well-known/assetlinks.json`

The file must contain the SHA-256 fingerprint of the certificate used to sign the installed app. The initial signed build produces this file together with the APK/AAB and upload keystore.

## Build

Use JDK 17+, Gradle 9.6+, and Android SDK 36.

```bash
cd android
gradle :app:lintRelease
gradle :app:assembleRelease
gradle :app:bundleRelease
```

Release builds require these environment variables:

- `ANDROID_KEYSTORE_PATH`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Keep the upload keystore private and backed up. Losing it complicates future Play Store updates.
