#!/usr/bin/env bash
set -euo pipefail

APK="android/artifacts/Space-Call-1.0.2-debug.apk"
PACKAGE="store.spacecallapp.app.debug"
ACTIVITY="store.spacecallapp.app.SpaceCallLauncherActivity"

test -s "$APK"

adb install -r "$APK"
adb shell pm clear "$PACKAGE" >/dev/null || true
adb logcat -c

adb shell am force-stop "$PACKAGE" || true
adb shell am start -W -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n "$PACKAGE/$ACTIVITY" | tee /tmp/spacecall-launch.txt

grep -q "Status: ok" /tmp/spacecall-launch.txt

sleep 8
adb logcat -b crash -d > /tmp/spacecall-crash.txt || true
adb logcat -d > /tmp/spacecall-logcat.txt

if grep -Eqi "Process: store\.spacecallapp\.app\.debug|AndroidRuntime.*store\.spacecallapp\.app\.debug" /tmp/spacecall-crash.txt /tmp/spacecall-logcat.txt; then
  echo "Space Call Android runtime crash detected."
  exit 1
fi

mkdir -p android/artifacts
printf '%s\n' "Android emulator cold-launch passed without a Space Call runtime crash." > android/artifacts/RUNTIME-VALIDATED.txt
