import { fetchMe, syncLegacyStorage } from '../api/auth';
import { isNetworkError } from '../api/client';
import { queryKeys } from '../lib/query-keys';
import { saveKioskSession, getKioskSession } from './gate-offline/kiosk-session';

import { queryClient } from '../plugins/query';

export const AUTH_QUERY_KEY = queryKeys.auth.me;

export async function ensureAuthUser() {
    const cached = queryClient.getQueryData(AUTH_QUERY_KEY);

    // Explicit logout — skip network
    if (cached === null) {
        return null;
    }

    // Offline refresh: never block the router on /api/auth/me
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const kioskUser = await getKioskSession();
        if (kioskUser) {
            queryClient.setQueryData(AUTH_QUERY_KEY, kioskUser);
            syncLegacyStorage(kioskUser);
            return kioskUser;
        }
    }

    try {
        const user = await queryClient.fetchQuery({
            queryKey: AUTH_QUERY_KEY,
            queryFn: async () => {
                const me = await fetchMe();
                syncLegacyStorage(me);
                await saveKioskSession(me);
                return me;
            },
            staleTime: 0,
            retry: false,
        });
        return user;
    } catch (error) {
        const kioskUser = await getKioskSession();
        const offline = typeof navigator !== 'undefined' && !navigator.onLine;
        const canUseKiosk = kioskUser && (
            isNetworkError(error)
            || offline
            || (!error?.response && offline)
        );
        if (canUseKiosk) {
            queryClient.setQueryData(AUTH_QUERY_KEY, kioskUser);
            syncLegacyStorage(kioskUser);
            return kioskUser;
        }
        queryClient.setQueryData(AUTH_QUERY_KEY, null);
        return null;
    }
}

export async function isUsingCachedKioskSession() {
    const live = queryClient.getQueryData(AUTH_QUERY_KEY);
    const kiosk = await getKioskSession();
    return Boolean(kiosk && live?.id === kiosk.id);
}

export function getAuthUser() {
    return queryClient.getQueryData(AUTH_QUERY_KEY) ?? null;
}

export function getAuthRoleName(user = getAuthUser()) {
    return user?.roles?.[0]?.name ?? localStorage.getItem('roles') ?? '';
}

export function getAuthPermissions(user = getAuthUser()) {
    return user?.permissions ?? [];
}

export function userHasRole(requiredRoles, user = getAuthUser()) {
    if (!requiredRoles) {
        return true;
    }
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.includes(getAuthRoleName(user));
}

export function isAuthenticated(user = getAuthUser()) {
    return user != null;
}
