package store.spacecallapp.app;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;

/**
 * Pure URL policy for all Android entry points.
 *
 * This class intentionally has no Android framework dependency so the security
 * rules can be unit-tested on the JVM.
 */
final class SpaceCallUrlPolicy {
    static final String CANONICAL_HOST = "app.spacecallapp.store";
    static final String CANONICAL_URL =
            "https://app.spacecallapp.store/?source=android-app";

    private SpaceCallUrlPolicy() {}

    static String sanitize(String rawUrl) {
        if (rawUrl == null || rawUrl.trim().isEmpty()) {
            return CANONICAL_URL;
        }

        try {
            URI requested = new URI(rawUrl);
            String scheme = requested.getScheme();
            String host = requested.getHost();

            if (scheme == null || host == null) {
                return CANONICAL_URL;
            }

            String normalizedScheme = scheme.toLowerCase(Locale.ROOT);
            if (!"https".equals(normalizedScheme) && !"http".equals(normalizedScheme)) {
                return CANONICAL_URL;
            }

            String normalizedHost = host.toLowerCase(Locale.ROOT);
            if (!CANONICAL_HOST.equals(normalizedHost)) {
                return CANONICAL_URL;
            }

            if (requested.getUserInfo() != null || requested.getPort() != -1) {
                return CANONICAL_URL;
            }

            String rawPath = requested.getRawPath();
            if (rawPath == null || rawPath.isEmpty()) {
                rawPath = "/";
            }

            StringBuilder rebuilt = new StringBuilder("https://")
                    .append(CANONICAL_HOST)
                    .append(rawPath);

            String rawQuery = requested.getRawQuery();
            if (rawQuery != null) {
                rebuilt.append('?').append(rawQuery);
            }

            String rawFragment = requested.getRawFragment();
            if (rawFragment != null) {
                rebuilt.append('#').append(rawFragment);
            }

            URI canonical = new URI(rebuilt.toString());
            if (!"https".equalsIgnoreCase(canonical.getScheme())
                    || !CANONICAL_HOST.equalsIgnoreCase(canonical.getHost())
                    || canonical.getUserInfo() != null
                    || canonical.getPort() != -1) {
                return CANONICAL_URL;
            }

            return canonical.toASCIIString();
        } catch (IllegalArgumentException | URISyntaxException invalidUrl) {
            return CANONICAL_URL;
        }
    }
}
