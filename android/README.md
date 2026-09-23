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


## CircleCI cloud build

The Android app is built in CircleCI from `.circleci/config.yml` on the `feat/android-twa-app` branch.

The job uses:

- CircleCI Android image `cimg/android:2026.08`
- JDK 17-compatible Android toolchain
- Android SDK 36
- Android Build Tools 36.0.0
- Gradle 9.6.0

Without release-signing variables, CircleCI still produces an installable debug APK plus an unsigned release AAB for validation.

For signed release APK/AAB builds, configure these CircleCI project environment variables:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

The keystore must be persistent and backed up securely. Do not generate a different release key for every build.

After a successful job, download the Android files from the CircleCI job's **Artifacts** tab.


## Stable GitHub Release download

CircleCI can publish the installable APK to a rolling GitHub prerelease with the fixed tag `android-latest`.

Configure one CircleCI project environment variable:

- `GITHUB_RELEASE_TOKEN`

Use a fine-grained GitHub personal access token restricted to the `koreazolfakar-droid/commerce-pal-launch` repository with **Contents: Read and write** permission.

After every successful Android build, CircleCI:

1. moves the `android-latest` tag to the current build commit,
2. creates or updates the rolling prerelease,
3. replaces the previous APK asset,
4. uploads `SHA256SUMS.txt`.

Before release signing is configured, the uploaded APK is named:

`Space-Call-latest-debug.apk`

After release signing is configured, the uploaded APK is named:

`Space-Call-latest.apk`

The repository is private, so GitHub authentication is still required to download release assets.
