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


/**
 * Hardened Space Call entry point.
 *
 * It accepts navigation only for Space Call HTTPS origins and adds a browser-only
 * fallback if a TWA provider fails to launch. The fallback deliberately avoids a
 * WebView and excludes this package so a failed launch cannot recurse into itself.
 */
public final class SpaceCallLauncherActivity extends LauncherActivity {
    private static final String TAG = "SpaceCallLauncher";

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
        String rawUrl = requested == null ? null : requested.toString();
        String safeUrl = SpaceCallUrlPolicy.sanitize(rawUrl);
        if (rawUrl != null && !safeUrl.equals(rawUrl)) {
            Log.d(TAG, "Normalized Android launch URL to the canonical Space Call origin.");
        }
        return Uri.parse(safeUrl);
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
    }
}
