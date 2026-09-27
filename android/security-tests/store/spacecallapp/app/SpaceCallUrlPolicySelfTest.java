package store.spacecallapp.app;

public final class SpaceCallUrlPolicySelfTest {
    private static int checks = 0;

    private static void expect(String name, String expected, String actual) {
        checks++;
        if (!expected.equals(actual)) {
            throw new AssertionError(
                    name + " expected <" + expected + "> but was <" + actual + ">");
        }
    }

    public static void main(String[] args) {
        expect(
                "nullUrlFallsBackToCanonicalLaunch",
                SpaceCallUrlPolicy.CANONICAL_URL,
                SpaceCallUrlPolicy.sanitize(null));

        expect(
                "canonicalHttpsPathAndQueryArePreserved",
                "https://app.spacecallapp.store/shop?q=iphone#top",
                SpaceCallUrlPolicy.sanitize(
                        "https://app.spacecallapp.store/shop?q=iphone#top"));

        expect(
                "encodedComponentsArePreserved",
                "https://app.spacecallapp.store/search/a%20b?q=a%20b%26c#x%20y",
                SpaceCallUrlPolicy.sanitize(
                        "https://app.spacecallapp.store/search/a%20b?q=a%20b%26c#x%20y"));

        expect(
                "httpIsUpgradedToHttps",
                "https://app.spacecallapp.store/my-orders?id=123",
                SpaceCallUrlPolicy.sanitize(
                        "http://app.spacecallapp.store/my-orders?id=123"));

        expect(
                "publicWebsiteIsRejected",
                SpaceCallUrlPolicy.CANONICAL_URL,
                SpaceCallUrlPolicy.sanitize(
                        "https://www.spacecallapp.store/product/42"));

        expect(
                "foreignHostIsRejected",
                SpaceCallUrlPolicy.CANONICAL_URL,
                SpaceCallUrlPolicy.sanitize(
                        "https://evil.example/phishing"));

        expect(
                "lookalikeSubdomainIsRejected",
                SpaceCallUrlPolicy.CANONICAL_URL,
                SpaceCallUrlPolicy.sanitize(
                        "https://app.spacecallapp.store.evil.example/shop"));

        expect(
                "userInfoHostSpoofIsRejected",
                SpaceCallUrlPolicy.CANONICAL_URL,
                SpaceCallUrlPolicy.sanitize(
                        "https://app.spacecallapp.store@evil.example/shop"));

        expect(
                "nonWebSchemeIsRejected",
                SpaceCallUrlPolicy.CANONICAL_URL,
                SpaceCallUrlPolicy.sanitize(
                        "javascript:alert(1)"));

        expect(
                "explicitPortIsRejected",
                SpaceCallUrlPolicy.CANONICAL_URL,
                SpaceCallUrlPolicy.sanitize(
                        "https://app.spacecallapp.store:8443/shop"));

        expect(
                "malformedUrlIsRejected",
                SpaceCallUrlPolicy.CANONICAL_URL,
                SpaceCallUrlPolicy.sanitize(
                        "https://[invalid"));

        System.out.println("Space Call URL policy passed " + checks + " Java 8 security checks.");
    }
}
