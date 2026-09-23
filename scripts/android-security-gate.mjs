import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const manifestPath = "android/app/src/main/AndroidManifest.xml";
const gradlePath = "android/app/build.gradle";
const stringsPath = "android/app/src/main/res/values/strings.xml";
const launcherPath = "android/app/src/main/java/store/spacecallapp/app/SpaceCallLauncherActivity.java";
const delegationPath = "android/app/src/main/java/store/spacecallapp/app/SpaceCallDelegationService.java";
const urlPolicyPath = "android/app/src/main/java/store/spacecallapp/app/SpaceCallUrlPolicy.java";
const urlPolicyTestPath = "android/security-tests/store/spacecallapp/app/SpaceCallUrlPolicySelfTest.java";
const assetlinksPath = "public/.well-known/assetlinks.json";
const webManifestPath = "public/manifest.webmanifest";
const debugManifestPath = "android/app/src/debug/AndroidManifest.xml";
const releaseManifestPath = "android/app/src/release/AndroidManifest.xml";
const gitignorePath = ".gitignore";

const manifest = read(manifestPath);
const gradle = read(gradlePath);
const strings = read(stringsPath);
const launcher = read(launcherPath);
const delegation = read(delegationPath);
const urlPolicy = read(urlPolicyPath);
const urlPolicyTest = read(urlPolicyTestPath);
const debugManifest = read(debugManifestPath);
const releaseManifest = read(releaseManifestPath);
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
forbidText(
  manifest,
  "android:autoVerify=",
  "Shared manifest must not define App Link verification; variants own that policy.",
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
for (const [variantName, variantManifest] of [
  ["debug", debugManifest],
  ["release", releaseManifest],
]) {
  requireText(variantManifest, 'android:host="www.spacecallapp.store"', `${variantName} App Links must use the canonical www host.`);
  forbidText(variantManifest, 'android:host="spacecallapp.store"', `${variantName} App Links must not verify the redirecting bare host.`);
  requireText(variantManifest, 'android:scheme="http"', `${variantName} App Links must accept HTTP for safe HTTPS upgrade.`);
  requireText(variantManifest, 'android:scheme="https"', `${variantName} App Links must accept HTTPS.`);
}
requireText(debugManifest, 'android:autoVerify="false"', "Debug builds must not claim production App Links.");
requireText(releaseManifest, 'android:autoVerify="true"', "Release builds must verify production App Links.");

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

requireText(launcher, "SpaceCallUrlPolicy.sanitize(rawUrl)", "Launcher must delegate URL validation to SpaceCallUrlPolicy.");
requireText(launcher, "protected Uri getUrlForIntent(Intent intent)", "Raw VIEW intents must pass through the URL sanitizer.");
requireText(urlPolicy, 'CANONICAL_HOST = "www.spacecallapp.store"', "URL policy canonical host guard is missing.");
requireText(urlPolicy, 'ALTERNATE_HOST = "spacecallapp.store"', "URL policy alternate host normalization is missing.");
requireText(urlPolicy, '"https".equals(normalizedScheme) && !"http".equals(normalizedScheme)', "URL policy must reject non-web schemes.");
requireText(urlPolicy, '"https",', "URL policy must force accepted links to HTTPS.");
forbidText(urlPolicy, ".isBlank()", "URL policy must not use APIs unavailable on minSdk 24.");
requireText(urlPolicy, "null,\n                    CANONICAL_HOST,\n                    -1,", "URL policy must strip user-info and explicit ports.");
requireText(launcher, "openSafeBrowserFallback()", "Crash-safe browser fallback is missing.");
requireText(
  launcher,
  "protected boolean shouldLaunchImmediately()",
  "TWA launch must be explicitly guarded.",
);
requireText(
  launcher,
  "return false;",
  "Automatic unguarded TWA launch must remain disabled.",
);
requireText(launcher, "CustomTabsClient.getPackageName(this, null)", "Fallback must use the browser library provider resolver.");
requireText(launcher, "customTab.intent.setPackage(providerPackage)", "Fallback must launch an explicit browser provider.");
forbidText(launcher, "android.webkit.WebView", "Launcher must not introduce an embedded WebView.");
forbidText(launcher, "new WebView(", "Launcher must not instantiate an embedded WebView.");
forbidText(launcher, "queryIntentActivities(", "Launcher must not enumerate installed apps for browser fallback.");
requireText(
  delegation,
  "LocationDelegationExtraCommandHandler",
  "Location delegation handler is required.",
);
for (const requiredTestCase of [
  "httpIsUpgradedToHttps",
  "foreignHostIsRejected",
  "lookalikeSubdomainIsRejected",
  "userInfoHostSpoofIsRejected",
  "nonWebSchemeIsRejected",
  "explicitPortIsRemoved",
  "malformedUrlIsRejected",
]) {
  requireText(urlPolicyTest, requiredTestCase, `Missing Android URL policy regression test: ${requiredTestCase}`);
}

requireText(gradle, 'applicationId "store.spacecallapp.app"', "Production application ID changed unexpectedly.");
requireText(gradle, 'applicationIdSuffix ".debug"', "Test and production package identities must remain separate.");
forbidText(gradle, "manifestPlaceholders", "App Link verification must not rely on Gradle manifest placeholders.");
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
forbidText(gradle, "testImplementation", "Core Android build must remain independent of test-only Gradle dependencies.");
requireText(gradle, "minifyEnabled true", "Release R8 minification must stay enabled.");
requireText(gradle, "shrinkResources true", "Release resource shrinking must stay enabled.");
requireText(gradle, "debuggable false", "Release build must remain non-debuggable.");
requireText(gradle, "abortOnError true", "Android lint errors must fail the build.");
requireText(gradle, "checkReleaseBuilds true", "Release lint must remain enabled.");
requireText(gradle, "checkDependencies false", "App lint is temporarily isolated from dependency lint during diagnosis.");
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

if (Array.isArray(assetlinks)) {
  const debugEntry = assetlinks.find(
    (entry) =>
      entry?.target?.namespace === "android_app" &&
      entry?.target?.package_name === "store.spacecallapp.app.debug",
  );
  if (debugEntry) {
    failures.push("Production Digital Asset Links must never trust the debug application ID.");
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
