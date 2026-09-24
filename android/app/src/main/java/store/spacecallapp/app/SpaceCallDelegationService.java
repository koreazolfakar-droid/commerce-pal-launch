package store.spacecallapp.app;

import com.google.androidbrowserhelper.trusted.DelegationService;

/**
 * Trusted Web Activity delegation service.
 *
 * Notification delegation is provided by Browser Helper's DelegationService.
 * Geolocation intentionally stays browser-managed so it follows the website's
 * just-in-time site-permission flow and avoids native delegation edge cases.
 */
public final class SpaceCallDelegationService extends DelegationService {
}
