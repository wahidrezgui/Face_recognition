import { queryClient } from '../plugins/query';
import { fetchMe, syncLegacyStorage } from '../api/auth';

import { queryKeys } from '../lib/query-keys';

export const AUTH_QUERY_KEY = queryKeys.auth.me;

export async function ensureAuthUser() {
    const cached = queryClient.getQueryData(AUTH_QUERY_KEY);

    // Explicit logout — skip network
    if (cached === null) {
        return null;
    }

    // Trust user already loaded (e.g. right after login mutation)
    if (cached != null) {
        return cached;
    }

    try {
        return await queryClient.fetchQuery({
            queryKey: AUTH_QUERY_KEY,
            queryFn: async () => {
                const me = await fetchMe();
                syncLegacyStorage(me);
                return me;
            },
            staleTime: 0,
            retry: false,
        });
    } catch {
        queryClient.setQueryData(AUTH_QUERY_KEY, null);
        return null;
    }
}

export function getAuthUser() {
    return queryClient.getQueryData(AUTH_QUERY_KEY) ?? null;
}

export function getAuthRoleName(user = getAuthUser()) {
    return user?.roles?.[0]?.name ?? localStorage.getItem('roles') ?? '';
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
