import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const manifestPath = "android/app/src/main/AndroidManifest.xml";
const gradlePath = "android/app/build.gradle";
const stringsPath = "android/app/src/main/res/values/strings.xml";
const launcherPath = "android/app/src/main/java/store/spacecallapp/app/SpaceCallLauncherActivity.java";
const delegationPath = "android/app/src/main/java/store/spacecallapp/app/SpaceCallDelegationService.java";
const assetlinksPath = "public/.well-known/assetlinks.json";
const webManifestPath = "public/manifest.webmanifest";
const gitignorePath = ".gitignore";

const manifest = read(manifestPath);
const gradle = read(gradlePath);
const strings = read(stringsPath);
const launcher = read(launcherPath);
const delegation = read(delegationPath);
const gitignore = read(gitignorePath);

const failures = [];
const requireText = (source, needle, message) => {
  if (!source.includes(needle)) failures.push(message);
};
const forbidText = (source, needle, message) => {
  if (source.includes(needle)) failures.push(message);
};

const permissions = [
  ...manifest.matchAll(/<uses-permission\s+android:name="([^"]+)"/g),
].map((match) => match[1]);

const allowedPermissions = new Set([
  "android.permission.INTERNET",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.CAMERA",
  "android.permission.POST_NOTIFICATIONS",
]);

for (const permission of permissions) {
  if (!allowedPermissions.has(permission)) {
    failures.push(`Unexpected Android permission: ${permission}`);
  }
}

for (const requiredPermission of allowedPermissions) {
  if (!permissions.includes(requiredPermission)) {
    failures.push(`Required Android permission is missing: ${requiredPermission}`);
  }
}

for (const forbiddenPermission of [
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_MEDIA_AUDIO",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.ACCESS_MEDIA_LOCATION",
  "android.permission.RECORD_AUDIO",
  "android.permission.READ_CONTACTS",
  "android.permission.WRITE_CONTACTS",
  "android.permission.READ_SMS",
  "android.permission.SEND_SMS",
  "android.permission.CALL_PHONE",
  "android.permission.MANAGE_EXTERNAL_STORAGE",
  "android.permission.REQUEST_INSTALL_PACKAGES",
]) {
  if (permissions.includes(forbiddenPermission)) {
    failures.push(`High-risk permission must not be added: ${forbiddenPermission}`);
  }
}

requireText(manifest, 'android:allowBackup="false"', "Android backups must stay disabled.");
requireText(manifest, 'android:fullBackupContent="false"', "Legacy full backup must stay disabled.");
requireText(manifest, 'android:usesCleartextTraffic="false"', "Cleartext HTTP must stay disabled.");
requireText(
  manifest,
  'android:networkSecurityConfig="@xml/network_security_config"',
  "Network security config is required.",
);
requireText(
  manifest,
  'android:dataExtractionRules="@xml/data_extraction_rules"',
  "Data extraction rules are required.",
);
requireText(
  manifest,
  'android:name=".SpaceCallLauncherActivity"',
  "The hardened SpaceCallLauncherActivity must remain the launcher.",
);
requireText(
  manifest,
  'android:name="android.support.customtabs.trusted.FALLBACK_STRATEGY"',
  "Explicit TWA fallback metadata is required.",
);
requireText(
  strings,
  '<string name="fallback_strategy">customtabs</string>',
  "Fallback must remain Custom Tabs, never an embedded WebView.",
);
requireText(
  manifest,
  'android:name="com.google.androidbrowserhelper.trusted.NotificationPermissionRequestActivity"',
  "Android notification permission bridge activity is required.",
);
requireText(
  manifest,
  'android:name="com.google.androidbrowserhelper.trusted.FocusActivity"',
  "TWA focus activity is required.",
);
requireText(
  manifest,
  'android:name="com.google.androidbrowserhelper.trusted.ManageDataLauncherActivity"',
  "TWA site-settings activity is required.",
);
requireText(
  manifest,
  'android:authorities="${applicationId}.fileprovider"',
  "FileProvider authority must remain application scoped.",
);
requireText(
  manifest,
  'android:exported="false"\n            android:grantUriPermissions="true"',
  "FileProvider must remain non-exported.",
);
forbidText(manifest, "WebViewFallbackActivity", "Embedded WebView fallback is forbidden.");
forbidText(manifest, 'android:host="spacecallapp.store"', "Only the canonical www origin may request App Link verification.");
forbidText(manifest, 'android:scheme="http"', "HTTP deep links are forbidden.");

requireText(
  strings,
  '<string name="launch_url">https://www.spacecallapp.store/?source=android-app</string>',
  "Launch URL must stay on the canonical HTTPS origin.",
);
requireText(
  strings,
  '"site":"https://www.spacecallapp.store"',
  "The app-side Digital Asset Link must point to the canonical site.",
);

requireText(launcher, 'CANONICAL_HOST = "www.spacecallapp.store"', "Launcher canonical host guard is missing.");
requireText(launcher, "protected Uri getUrlForIntent(Intent intent)", "Raw VIEW intents must pass through the URL sanitizer.");
requireText(launcher, '!"https".equalsIgnoreCase(requested.getScheme())', "Launcher must reject non-HTTPS URLs.");
requireText(launcher, "openSafeBrowserFallback()", "Crash-safe browser fallback is missing.");
requireText(launcher, "!browserPackages.contains(packageName)", "Fallback must restrict candidates to browser packages.");
forbidText(launcher, "android.webkit.WebView", "Launcher must not introduce an embedded WebView.");
forbidText(launcher, "new WebView(", "Launcher must not instantiate an embedded WebView.");
requireText(
  delegation,
  "LocationDelegationExtraCommandHandler",
  "Location delegation handler is required.",
);

requireText(gradle, 'applicationId "store.spacecallapp.app"', "Production application ID changed unexpectedly.");
requireText(gradle, 'applicationIdSuffix ".debug"', "Test and production package identities must remain separate.");
requireText(gradle, "compileSdk 36", "compileSdk must remain 36.");
requireText(gradle, "targetSdk 36", "targetSdk must remain 36.");
requireText(gradle, "minSdk 24", "minSdk must remain 24.");
requireText(gradle, 'versionName "1.0.2"', "Expected Android versionName 1.0.2.");
requireText(
  gradle,
  'com.google.androidbrowserhelper:androidbrowserhelper:2.7.3',
  "Android Browser Helper must remain pinned to 2.7.3.",
);
requireText(
  gradle,
  'com.google.androidbrowserhelper:locationdelegation:1.1.2',
  "Location delegation dependency must remain pinned.",
);
requireText(gradle, "minifyEnabled true", "Release R8 minification must stay enabled.");
requireText(gradle, "shrinkResources true", "Release resource shrinking must stay enabled.");
requireText(gradle, "debuggable false", "Release build must remain non-debuggable.");
requireText(gradle, "abortOnError true", "Android lint errors must fail the build.");\nrequireText(gradle, "checkReleaseBuilds true", "Release lint must remain enabled.");\nrequireText(gradle, "checkDependencies true", "Dependency lint checks must remain enabled.");
requireText(
  gradle,
  "Release APK/AAB generation is blocked",
  "Release signing fail-closed gate is missing.",
);

for (const secretPattern of [
  /storePassword\s+["'][^"']+["']/,
  /keyPassword\s+["'][^"']+["']/,
  /ANDROID_KEYSTORE_PASSWORD\s*=\s*["'][^"']+["']/,
]) {
  if (secretPattern.test(gradle)) {
    failures.push("Signing credentials must never be hardcoded in Gradle.");
  }
}

requireText(gitignore, "*.jks", "JKS files must remain gitignored.");
requireText(gitignore, "*.keystore", "Keystore files must remain gitignored.");
requireText(gitignore, "*.p12", "PKCS#12 files must remain gitignored.");

let assetlinks;
try {
  assetlinks = JSON.parse(read(assetlinksPath));
} catch {
  failures.push("public/.well-known/assetlinks.json must be valid JSON.");
}

const knownDebugFingerprint =
  "7C:A9:6F:44:7B:F6:79:D8:F1:14:0B:9F:89:D3:81:6E:4B:10:88:AE:96:69:EF:42:DA:20:47:19:92:17:E9:BD";

if (Array.isArray(assetlinks)) {
  const debugEntry = assetlinks.find(
    (entry) =>
      entry?.target?.namespace === "android_app" &&
      entry?.target?.package_name === "store.spacecallapp.app.debug" &&
      Array.isArray(entry?.target?.sha256_cert_fingerprints) &&
      entry.target.sha256_cert_fingerprints.includes(knownDebugFingerprint),
  );
  if (!debugEntry) {
    failures.push("Digital Asset Links must authorize the known 1.0.1 test APK certificate.");
  }

  const releaseCert = process.env.ANDROID_CERT_SHA256;
  if (releaseCert) {
    const releaseEntry = assetlinks.find(
      (entry) =>
        entry?.target?.namespace === "android_app" &&
        entry?.target?.package_name === "store.spacecallapp.app" &&
        Array.isArray(entry?.target?.sha256_cert_fingerprints) &&
        entry.target.sha256_cert_fingerprints.includes(releaseCert),
    );
    if (!releaseEntry) {
      failures.push("Signed release requires its production certificate in assetlinks.json.");
    }
  }
}

let webManifest;
try {
  webManifest = JSON.parse(read(webManifestPath));
} catch {
  failures.push("public/manifest.webmanifest must be valid JSON.");
}

if (webManifest) {
  if (webManifest.id !== "/") failures.push("Web manifest id must remain '/'.");
  if (webManifest.scope !== "/") failures.push("Web manifest scope must remain '/'.");
  if (webManifest.start_url !== "/?source=android-app") {
    failures.push("Web manifest start_url must identify Android launches.");
  }
  if (webManifest.display !== "standalone") {
    failures.push("Web manifest display must remain standalone.");
  }
  if (webManifest.orientation !== "portrait-primary") {
    failures.push("Web manifest orientation must remain portrait-primary.");
  }
}

if (failures.length) {
  console.error("Android security gate failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Android security gate passed.");
