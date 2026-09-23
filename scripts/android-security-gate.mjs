import fs from "node:fs";

const manifestPath = "android/app/src/main/AndroidManifest.xml";
const gradlePath = "android/app/build.gradle";
const stringsPath = "android/app/src/main/res/values/strings.xml";

const manifest = fs.readFileSync(manifestPath, "utf8");
const gradle = fs.readFileSync(gradlePath, "utf8");
const strings = fs.readFileSync(stringsPath, "utf8");

const failures = [];
const requireText = (source, needle, message) => {
  if (!source.includes(needle)) failures.push(message);
};

const permissions = [...manifest.matchAll(/<uses-permission\s+android:name="([^"]+)"/g)].map((m) => m[1]);
const allowedPermissions = new Set(["android.permission.INTERNET"]);
for (const permission of permissions) {
  if (!allowedPermissions.has(permission)) {
    failures.push(`Unexpected Android permission: ${permission}`);
  }
}

requireText(manifest, 'android:allowBackup="false"', "Android backups must stay disabled.");
requireText(manifest, 'android:usesCleartextTraffic="false"', "Cleartext HTTP must stay disabled.");
requireText(manifest, 'android:networkSecurityConfig="@xml/network_security_config"', "Network security config is required.");
requireText(manifest, 'android:dataExtractionRules="@xml/data_extraction_rules"', "Data extraction rules are required.");
requireText(manifest, 'android:authorities="${applicationId}.fileprovider"', "FileProvider authority must be app-scoped.");
requireText(manifest, 'android:exported="false"\n            android:grantUriPermissions="true"', "FileProvider must remain non-exported.");
if (manifest.includes("WebViewFallbackActivity") || manifest.includes('android:value="webview"')) {
  failures.push("Production manifest must not use the embedded WebView fallback.");
}

requireText(strings, "<string name=\"launch_url\">https://www.spacecallapp.store/</string>", "Launch URL must stay HTTPS on the canonical host.");
requireText(gradle, "targetSdk 36", "targetSdk must remain 36.");
requireText(gradle, "minifyEnabled true", "Release R8 minification must stay enabled.");
requireText(gradle, "shrinkResources true", "Release resource shrinking must stay enabled.");
requireText(gradle, "debuggable false", "Release build must stay non-debuggable.");
requireText(gradle, "Release APK/AAB generation is blocked", "Release signing gate is missing.");

const assetlinksPath = "public/.well-known/assetlinks.json";
const cert = process.env.ANDROID_CERT_SHA256;
if (cert) {
  if (!fs.existsSync(assetlinksPath)) {
    failures.push("Signed release requires public/.well-known/assetlinks.json.");
  } else {
    let assetlinks;
    try {
      assetlinks = JSON.parse(fs.readFileSync(assetlinksPath, "utf8"));
    } catch {
      failures.push("assetlinks.json is not valid JSON.");
    }

    if (Array.isArray(assetlinks)) {
      const matching = assetlinks.find((entry) =>
        entry?.target?.namespace === "android_app" &&
        entry?.target?.package_name === "store.spacecallapp.app" &&
        Array.isArray(entry?.target?.sha256_cert_fingerprints) &&
        entry.target.sha256_cert_fingerprints.includes(cert)
      );
      if (!matching) {
        failures.push("assetlinks.json does not contain the active Space Call release certificate fingerprint.");
      }
    }
  }
}

if (failures.length) {
  console.error("Android security gate failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Android security gate passed.");
