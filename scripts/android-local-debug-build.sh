#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

for tool in node javac java gradle; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing required tool: $tool" >&2
    exit 2
  fi
done

GRADLE_VERSION="$(gradle --version | awk '/^Gradle / { print $2; exit }')"
IFS=. read -r GRADLE_MAJOR GRADLE_MINOR _ <<< "$GRADLE_VERSION"
if [[ ! "$GRADLE_MAJOR" =~ ^[0-9]+$ || ! "$GRADLE_MINOR" =~ ^[0-9]+$ ]] \
  || (( GRADLE_MAJOR < 9 || (GRADLE_MAJOR == 9 && GRADLE_MINOR < 6) )); then
  echo "Gradle 9.6.0 or newer is required by Android Gradle Plugin 9.4.0; found: ${GRADLE_VERSION:-unknown}" >&2
  exit 2
fi

SDK_ROOT="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$SDK_ROOT" ]; then
  echo "ANDROID_HOME or ANDROID_SDK_ROOT must point to the Android SDK." >&2
  exit 2
fi

PLATFORM_JAR="$SDK_ROOT/platforms/android-36/android.jar"
if [ ! -f "$PLATFORM_JAR" ]; then
  echo "Android SDK Platform 36 is missing: $PLATFORM_JAR" >&2
  exit 2
fi

BUILD_TOOLS="$SDK_ROOT/build-tools/36.0.0"
AAPT="$BUILD_TOOLS/aapt"
APKSIGNER="$BUILD_TOOLS/apksigner"
ZIPALIGN="$BUILD_TOOLS/zipalign"

for tool in "$AAPT" "$APKSIGNER" "$ZIPALIGN"; do
  if [ ! -x "$tool" ]; then
    echo "Missing Android Build Tools 36.0.0 executable: $tool" >&2
    exit 2
  fi
done

echo "== Toolchain =="
java -version
gradle --version | sed -n '1,12p'

echo "== Android source security gate =="
node scripts/android-security-gate.mjs

echo "== Java 8 URL policy security tests =="
rm -rf /tmp/space-call-url-policy
mkdir -p /tmp/space-call-url-policy/classes
javac --release 8 -d /tmp/space-call-url-policy/classes android/app/src/main/java/store/spacecallapp/app/SpaceCallUrlPolicy.java android/security-tests/store/spacecallapp/app/SpaceCallUrlPolicySelfTest.java
java -cp /tmp/space-call-url-policy/classes store.spacecallapp.app.SpaceCallUrlPolicySelfTest

echo "== Android lint + debug APK build =="
gradle -p android --no-daemon --stacktrace :app:lintDebug :app:assembleDebug

APK="android/app/build/outputs/apk/debug/app-debug.apk"
test -s "$APK"

echo "== APK identity =="
"$AAPT" dump badging "$APK" | tee /tmp/spacecall-apk-badging.txt
grep -q "package: name='store.spacecallapp.app.debug'" /tmp/spacecall-apk-badging.txt
grep -q "versionCode='3'" /tmp/spacecall-apk-badging.txt
grep -q "versionName='1.0.2-debug'" /tmp/spacecall-apk-badging.txt

echo "== APK signature =="
"$APKSIGNER" verify --verbose --print-certs "$APK" | tee /tmp/spacecall-apksigner.txt

echo "== APK alignment =="
"$ZIPALIGN" -c -P 16 -v 4 "$APK" | tee /tmp/spacecall-zipalign.txt

echo "== Package artifact =="
mkdir -p dist/android
cp "$APK" dist/android/Space-Call-1.0.2-debug.apk
sha256sum dist/android/Space-Call-1.0.2-debug.apk | tee dist/android/Space-Call-1.0.2-debug.apk.sha256

echo
echo "APK READY: dist/android/Space-Call-1.0.2-debug.apk"
cat dist/android/Space-Call-1.0.2-debug.apk.sha256
