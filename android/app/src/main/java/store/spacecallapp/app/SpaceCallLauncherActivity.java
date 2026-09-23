package store.spacecallapp.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.Nullable;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

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

        Intent genericWebIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://example.com/"));
        genericWebIntent.addCategory(Intent.CATEGORY_BROWSABLE);

        PackageManager packageManager = getPackageManager();
        List<ResolveInfo> browserHandlers =
                packageManager.queryIntentActivities(genericWebIntent, PackageManager.MATCH_DEFAULT_ONLY);
        Set<String> browserPackages = new HashSet<>();
        for (ResolveInfo handler : browserHandlers) {
            if (handler.activityInfo != null) {
                browserPackages.add(handler.activityInfo.packageName);
            }
        }

        Intent spaceCallIntent = new Intent(Intent.ACTION_VIEW, url);
        spaceCallIntent.addCategory(Intent.CATEGORY_BROWSABLE);
        List<ResolveInfo> handlers =
                packageManager.queryIntentActivities(spaceCallIntent, PackageManager.MATCH_DEFAULT_ONLY);

        for (ResolveInfo handler : handlers) {
            if (handler.activityInfo == null) continue;
            String packageName = handler.activityInfo.packageName;
            if (getPackageName().equals(packageName) || !browserPackages.contains(packageName)) continue;

            try {
                Intent explicitBrowserIntent = new Intent(spaceCallIntent);
                explicitBrowserIntent.setPackage(packageName);
                startActivity(explicitBrowserIntent);
                finish();
                return;
            } catch (ActivityNotFoundException | SecurityException ignored) {
                // Try the next verified browser handler.
            }
        }

        Log.e(TAG, "No external HTTPS browser is available for the fallback.");
        Toast.makeText(this, "A web browser is required to open Space Call.", Toast.LENGTH_LONG).show();
        finish();
    }
}
