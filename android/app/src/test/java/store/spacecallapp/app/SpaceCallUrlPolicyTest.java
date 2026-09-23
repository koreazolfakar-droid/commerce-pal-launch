package store.spacecallapp.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public final class SpaceCallUrlPolicyTest {
    @Test
    public void nullUrlFallsBackToCanonicalLaunch() {
        assertEquals(
                SpaceCallUrlPolicy.CANONICAL_URL,
                SpaceCallUrlPolicy.sanitize(null));
    }

    @Test
    public void canonicalHttpsPathAndQueryArePreserved() {
        assertEquals(
                "https://www.spacecallapp.store/shop?q=iphone#top",
                SpaceCallUrlPolicy.sanitize(
                        "https://www.spacecallapp.store/shop?q=iphone#top"));
    }

    @Test
    public void httpIsUpgradedToHttps() {
        assertEquals(
                "https://www.spacecallapp.store/my-orders?id=123",
                SpaceCallUrlPolicy.sanitize(
                        "http://www.spacecallapp.store/my-orders?id=123"));
    }

    @Test
    public void bareDomainIsCanonicalizedToWww() {
        assertEquals(
                "https://www.spacecallapp.store/product/42",
                SpaceCallUrlPolicy.sanitize(
                        "https://spacecallapp.store/product/42"));
    }

    @Test
    public void foreignHostIsRejected() {
        assertEquals(
                SpaceCallUrlPolicy.CANONICAL_URL,
                SpaceCallUrlPolicy.sanitize(
                        "https://evil.example/phishing"));
    }

    @Test
    public void lookalikeSubdomainIsRejected() {
        assertEquals(
                SpaceCallUrlPolicy.CANONICAL_URL,
                SpaceCallUrlPolicy.sanitize(
                        "https://www.spacecallapp.store.evil.example/shop"));
    }

    @Test
    public void userInfoHostSpoofIsRejected() {
        assertEquals(
                SpaceCallUrlPolicy.CANONICAL_URL,
                SpaceCallUrlPolicy.sanitize(
                        "https://www.spacecallapp.store@evil.example/shop"));
    }

    @Test
    public void nonWebSchemeIsRejected() {
        assertEquals(
                SpaceCallUrlPolicy.CANONICAL_URL,
                SpaceCallUrlPolicy.sanitize(
                        "javascript:alert(1)"));
    }

    @Test
    public void explicitPortIsRemoved() {
        assertEquals(
                "https://www.spacecallapp.store/shop",
                SpaceCallUrlPolicy.sanitize(
                        "https://www.spacecallapp.store:8443/shop"));
    }

    @Test
    public void malformedUrlIsRejected() {
        assertEquals(
                SpaceCallUrlPolicy.CANONICAL_URL,
                SpaceCallUrlPolicy.sanitize(
                        "https://[invalid"));
    }
}
