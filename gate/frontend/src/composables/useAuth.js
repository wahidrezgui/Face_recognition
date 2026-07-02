import { computed } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import {
    fetchMe,
    login as apiLogin,
    logout as apiLogout,
    syncLegacyStorage,
    clearLegacyStorage,
} from '../api/auth';
import { AUTH_QUERY_KEY } from '../lib/auth-session';
import { useEmployeeDirectory } from './useEmployeeDirectory';

export function useAuth() {
    const queryClient = useQueryClient();
    const { prefetchDirectory, clearDirectory } = useEmployeeDirectory();

    const {
        data: user,
        isLoading,
        isFetched,
        refetch,
    } = useQuery({
        queryKey: AUTH_QUERY_KEY,
        queryFn: async () => {
            const me = await fetchMe();
            syncLegacyStorage(me);
            return me;
        },
        retry: false,
        enabled: false,
    });

    const loginMutation = useMutation({
        mutationFn: apiLogin,
        onSuccess: (data) => {
            if (data.status !== 'success' || !data.user) {
                return;
            }

            queryClient.setQueryData(AUTH_QUERY_KEY, data.user);
            syncLegacyStorage(data.user);

            // Defer directory sync until the session cookie is committed
            window.setTimeout(() => {
                prefetchDirectory().catch((err) => {
                    console.error('Employee directory prefetch failed:', err);
                });
            }, 0);
        },
    });

    const logoutMutation = useMutation({
        mutationFn: apiLogout,
        onSettled: () => {
            queryClient.setQueryData(AUTH_QUERY_KEY, null);
            clearLegacyStorage();
            clearDirectory().catch((err) => {
                console.error('Employee directory clear failed:', err);
            });
        },
    });

    const isAuthenticated = computed(() => user.value != null);
    const role = computed(() => user.value?.roles?.[0]?.name ?? localStorage.getItem('roles') ?? '');
    const loaded = computed(() => isFetched.value);

    async function loadUser() {
        const result = await refetch();
        if (result.data) {
            prefetchDirectory().catch((err) => {
                console.error('Employee directory prefetch failed:', err);
            });
        }
        return result;
    }

    async function login(credentials) {
        return loginMutation.mutateAsync(credentials);
    }

    async function logout() {
        let redirectUrl = null;

        try {
            const result = await logoutMutation.mutateAsync();
            redirectUrl = result?.redirect_url ?? null;
        } catch {
            queryClient.setQueryData(AUTH_QUERY_KEY, null);
            clearLegacyStorage();
            clearDirectory().catch((err) => {
                console.error('Employee directory clear failed:', err);
            });
        }

        if (redirectUrl) {
            window.location.href = redirectUrl;
            return redirectUrl;
        }

        return null;
    }

    function hasRole(requiredRoles) {
        if (!requiredRoles) {
            return true;
        }
        const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
        return roles.includes(role.value);
    }

    return {
        user,
        loaded,
        isLoading,
        isAuthenticated,
        role,
        loadUser,
        login,
        logout,
        hasRole,
    };
}
