import { getRedirectPathForUser } from '../api/auth';
import {
    ensureAuthUser,
    getAuthUser,
    isAuthenticated,
    getAuthRoleName,
} from '../lib/auth-session';
import { pathToRouteKey } from '../lib/access';
import { userCanAccessRoute } from '../lib/auth-roles';

export function registerRouterGuards(router) {
    router.beforeEach(async (to, from, next) => {
        document.title = to.meta.title || 'Gate';

        if (to.meta.requiresAuth || to.meta.guest) {
            await ensureAuthUser();
        }

        const user = getAuthUser();

        if (to.meta.guest && isAuthenticated(user)) {
            return next(getRedirectPathForUser(user));
        }

        if (to.meta.requiresAuth && !isAuthenticated(user)) {
            return next('/');
        }

        const routeKey = to.meta.routeKey ?? pathToRouteKey(to.path);

        if (routeKey) {
            if (userCanAccessRoute(routeKey, user)) {
                return next();
            }
            return next('/permission-denied');
        }

        next();
    });
}
