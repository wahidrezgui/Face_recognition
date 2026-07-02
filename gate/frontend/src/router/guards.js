import { getRedirectPathForRole } from '../api/auth';
import {
    ensureAuthUser,
    getAuthUser,
    isAuthenticated,
    userHasRole,
    getAuthRoleName,
} from '../lib/auth-session';

export function registerRouterGuards(router) {
    router.beforeEach(async (to, from, next) => {
        document.title = to.meta.title || 'Gate';

        if (to.meta.requiresAuth || to.meta.guest) {
            await ensureAuthUser();
        }

        const user = getAuthUser();

        if (to.meta.guest && isAuthenticated(user)) {
            return next(getRedirectPathForRole(getAuthRoleName(user)));
        }

        if (to.meta.requiresAuth && !isAuthenticated(user)) {
            return next('/');
        }

        if (to.meta.roles && !userHasRole(to.meta.roles, user)) {
            return next('/permission-denied');
        }

        next();
    });
}
