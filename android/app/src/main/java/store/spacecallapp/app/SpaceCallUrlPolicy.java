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
    static final String CANONICAL_HOST = "www.spacecallapp.store";
    static final String ALTERNATE_HOST = "spacecallapp.store";
    static final String CANONICAL_URL =
            "https://www.spacecallapp.store/?source=android-app";

    private SpaceCallUrlPolicy() {}

    static String sanitize(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
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
            if (!CANONICAL_HOST.equals(normalizedHost) && !ALTERNATE_HOST.equals(normalizedHost)) {
                return CANONICAL_URL;
            }

            String path = requested.getRawPath();
            if (path == null || path.isEmpty()) {
                path = "/";
            }

            URI canonical = new URI(
                    "https",
                    null,
                    CANONICAL_HOST,
                    -1,
                    path,
                    requested.getRawQuery(),
                    requested.getRawFragment());
            return canonical.toASCIIString();
        } catch (IllegalArgumentException | URISyntaxException invalidUrl) {
            return CANONICAL_URL;
        }
    }
}
