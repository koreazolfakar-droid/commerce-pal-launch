package store.spacecallapp.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.Nullable;

import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsIntent;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

import java.util.Locale;

/**
 * Hardened Space Call entry point.
 *
 * It accepts navigation only for Space Call HTTPS origins and adds a browser-only
 * fallback if a TWA provider fails to launch. The fallback deliberately avoids a
 * WebView and excludes this package so a failed launch cannot recurse into itself.
 */
public final class SpaceCallLauncherActivity extends LauncherActivity {
    private static final String TAG = "SpaceCallLauncher";
    private static final String CANONICAL_HOST = "www.spacecallapp.store";
    private static final String ALTERNATE_HOST = "spacecallapp.store";
    private static final Uri CANONICAL_URL =
            Uri.parse("https://www.spacecallapp.store/?source=android-app");

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            launchTwa();
        } catch (RuntimeException launchFailure) {
            Log.e(TAG, "Trusted Web Activity launch failed; using safe browser fallback.", launchFailure);
            openSafeBrowserFallback();
        }
    }

    @Override
    protected boolean shouldLaunchImmediately() {
        return false;
    }

    @Override
    protected Uri getUrlForIntent(Intent intent) {
        Uri requested = intent == null ? null : intent.getData();
        return sanitizeSpaceCallUrl(requested);
    }

    @Override
    protected Uri getLaunchingUrl() {
        return getUrlForIntent(getIntent());
    }

    private Uri sanitizeSpaceCallUrl(@Nullable Uri requested) {
        if (requested == null) {
            return CANONICAL_URL;
        }

        String scheme = requested.getScheme();
        if (!"https".equalsIgnoreCase(scheme) && !"http".equalsIgnoreCase(scheme)) {
            return CANONICAL_URL;
        }

        String host = requested.getHost();
        if (host == null) {
            return CANONICAL_URL;
        }

        String normalizedHost = host.toLowerCase(Locale.ROOT);
        if (!CANONICAL_HOST.equals(normalizedHost) && !ALTERNATE_HOST.equals(normalizedHost)) {
            Log.w(TAG, "Blocked non-Space-Call launch URL.");
            return CANONICAL_URL;
        }

        // Upgrade HTTP to HTTPS and force the canonical authority. This preserves
        // only a validated Space Call path/query while stripping user-info and ports.
        return requested.buildUpon()
                .scheme("https")
                .encodedAuthority(CANONICAL_HOST)
                .build();
    }

    private void openSafeBrowserFallback() {
        Uri url = sanitizeSpaceCallUrl(getIntent() == null ? null : getIntent().getData());
        String providerPackage = CustomTabsClient.getPackageName(this, null);

        if (providerPackage == null || getPackageName().equals(providerPackage)) {
            Log.e(TAG, "No external Custom Tabs provider is available for the fallback.");
            Toast.makeText(this, "A supported web browser is required to open Space Call.", Toast.LENGTH_LONG).show();
            finish();
            return;
        }

        try {
            CustomTabsIntent customTab = new CustomTabsIntent.Builder().build();
            customTab.intent.setPackage(providerPackage);
            customTab.launchUrl(this, url);
        } catch (ActivityNotFoundException | SecurityException fallbackFailure) {
            Log.e(TAG, "Safe browser fallback failed.", fallbackFailure);
            Toast.makeText(this, "Unable to open Space Call in the browser.", Toast.LENGTH_LONG).show();
        } finally {
            finish();
        }
    }}
