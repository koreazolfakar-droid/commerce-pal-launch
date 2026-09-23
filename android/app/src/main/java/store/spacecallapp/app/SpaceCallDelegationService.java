package store.spacecallapp.app;

import com.google.androidbrowserhelper.locationdelegation.LocationDelegationExtraCommandHandler;
import com.google.androidbrowserhelper.trusted.DelegationService;

/**
 * Trusted Web Activity delegation service.
 *
 * Location is delegated to Android so the runtime permission is requested only
 * when the web experience actually calls the Geolocation API. Notification
 * delegation remains provided by the parent DelegationService.
 */
public final class SpaceCallDelegationService extends DelegationService {
    public SpaceCallDelegationService() {
        registerExtraCommandHandler(new LocationDelegationExtraCommandHandler());
    }
}
