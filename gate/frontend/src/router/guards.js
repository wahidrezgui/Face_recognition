import {
    ensureAuthUser,
    getAuthUser,
    isAuthenticated,
    AUTH_QUERY_KEY,
} from '../lib/auth-session';
import { pathToRouteKey } from '../lib/access';
import { userCanAccessRoute } from '../lib/auth-roles';
import { isApiReachable } from '../lib/offline-queue';
import { getKioskSession } from '../lib/gate-offline/kiosk-session';
import { isBrowserOnline } from '../lib/gate-offline/connectivity';
import { queryClient } from '../plugins/query';
import { getRedirectPathForUser, syncLegacyStorage } from '../api/auth';

export function registerRouterGuards(router) {
    router.beforeEach(async (to, from, next) => {
        document.title = to.meta.title || 'Gate';

        if (to.meta.requiresAuth || to.meta.guest) {
            await ensureAuthUser();
        }

        let user = getAuthUser();

        if (to.meta.guest && isAuthenticated(user)) {
            return next(getRedirectPathForUser(user));
        }

        if (to.meta.requiresAuth && !isAuthenticated(user)) {
            const routeKey = to.meta.routeKey ?? pathToRouteKey(to.path);
            const offlineGate = routeKey === 'gate' && !isBrowserOnline();
            const unreachableGate = routeKey === 'gate' && !(await isApiReachable());
            if (offlineGate || unreachableGate) {
                const kioskUser = await getKioskSession();
                if (kioskUser) {
                    queryClient.setQueryData(AUTH_QUERY_KEY, kioskUser);
                    syncLegacyStorage(kioskUser);
                    user = kioskUser;
                }
            }
            if (!isAuthenticated(user)) {
                return next('/');
            }
        }

        const routeKey = to.meta.routeKey ?? pathToRouteKey(to.path);

        if (routeKey) {
            const kioskUser = routeKey === 'gate' && !isBrowserOnline()
                ? await getKioskSession()
                : null;
            if (kioskUser || userCanAccessRoute(routeKey, user)) {
                return next();
            }
            return next('/permission-denied');
        }

        next();
    });
}
