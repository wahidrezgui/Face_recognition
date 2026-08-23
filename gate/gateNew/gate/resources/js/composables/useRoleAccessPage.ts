import { usePage } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import { useConfirm } from 'primevue/useconfirm';
import { computed, ref, watch } from 'vue';
import {
    showRole,
    showUserPermissions,
    searchUsers as searchUsersAction,
    updateRolePermissions,
    updateUserPermissions,
} from '@/actions/App/Http/Controllers/Inertia/RoleAccessController';
import { useToast } from '@/composables/useToast';
import { csrfPut } from '@/lib/csrfFetch';
import type {
    AccessCatalogPayload,
    ResourceLevel,
    RoleDetail,
    RoleSummary,
    ScopeLevel,
    UserPermissionOverrides,
    UserSearchResult,
} from '@/types';

interface RoleAccessPageProps {
    catalog: AccessCatalogPayload;
    roles: RoleSummary[];
    [key: string]: unknown;
}

type AccessTab = 'roles' | 'users';

function emptyRouteAccess(
    catalog: AccessCatalogPayload,
): Record<string, boolean> {
    return Object.fromEntries(
        Object.keys(catalog.routes).map((key) => [key, false]),
    );
}

function emptyResourceAccess(
    catalog: AccessCatalogPayload,
): Record<string, ResourceLevel> {
    return Object.fromEntries(
        Object.keys(catalog.resources).map((key) => [key, 'none']),
    );
}

function emptyResourceScopeAccess(
    catalog: AccessCatalogPayload,
): Record<string, ScopeLevel> {
    return Object.fromEntries(
        catalog.scopable_resources.map((key) => [key, 'none']),
    );
}

export function useRoleAccessPage() {
    const page = usePage<RoleAccessPageProps>();
    const toast = useToast();
    const confirm = useConfirm();

    const catalog = computed(() => page.props.catalog);
    const roles = ref<RoleSummary[]>(page.props.roles);
    const currentUser = computed(() => page.props.auth.user);

    const activeTab = ref<AccessTab>('roles');

    // ---- Roles tab ----
    const selectedRoleId = ref<number | null>(roles.value[0]?.id ?? null);
    const roleDetail = ref<RoleDetail | null>(null);
    const roleLoading = ref(false);
    const roleSaving = ref(false);

    const roleRouteAccess = ref<Record<string, boolean>>(
        emptyRouteAccess(catalog.value),
    );
    const roleResourceAccess = ref<Record<string, ResourceLevel>>(
        emptyResourceAccess(catalog.value),
    );
    const roleResourceScopeAccess = ref<Record<string, ScopeLevel>>(
        emptyResourceScopeAccess(catalog.value),
    );

    async function loadRoleDetail() {
        if (!selectedRoleId.value) {
            return;
        }

        roleLoading.value = true;

        try {
            const response = await fetch(showRole.url(selectedRoleId.value), {
                headers: { Accept: 'application/json' },
            });
            const detail: RoleDetail = await response.json();
            roleDetail.value = detail;
            roleRouteAccess.value = { ...detail.route_permissions };
            roleResourceAccess.value = { ...detail.resource_permissions };
            roleResourceScopeAccess.value = { ...detail.resource_scopes };
        } catch {
            toast.error(
                trans('rolePermissions.toast.loadFailed'),
                trans('rolePermissions.toast.errorTitle'),
            );
        } finally {
            roleLoading.value = false;
        }
    }

    watch(selectedRoleId, () => void loadRoleDetail(), { immediate: true });

    // The actor is about to remove their own access to this very page.
    const wouldSelfLockOut = computed(() => {
        const actorRoleName = currentUser.value?.roles?.[0]?.name;

        return (
            !!actorRoleName &&
            actorRoleName === roleDetail.value?.role.name &&
            roleRouteAccess.value.role_permissions !== true
        );
    });

    async function runRoleSave() {
        if (!selectedRoleId.value) {
            return;
        }

        roleSaving.value = true;

        try {
            const routes = Object.keys(roleRouteAccess.value).filter(
                (key) => roleRouteAccess.value[key] === true,
            );
            const updated = await csrfPut<RoleDetail>(
                updateRolePermissions.url(selectedRoleId.value),
                {
                    routes,
                    resources: roleResourceAccess.value,
                    scopes: roleResourceScopeAccess.value,
                },
            );

            roleDetail.value = updated;
            roleRouteAccess.value = { ...updated.route_permissions };
            roleResourceAccess.value = { ...updated.resource_permissions };
            roleResourceScopeAccess.value = { ...updated.resource_scopes };
            roles.value = roles.value.map((r) =>
                r.id === updated.role.id ? updated.role : r,
            );
            toast.success(
                trans('rolePermissions.toast.saveSuccess'),
                trans('rolePermissions.toast.successTitle'),
            );
        } catch {
            toast.error(
                trans('rolePermissions.toast.saveFailed'),
                trans('rolePermissions.toast.errorTitle'),
            );
        } finally {
            roleSaving.value = false;
        }
    }

    function saveRolePermissions() {
        if (wouldSelfLockOut.value) {
            confirm.require({
                message: trans('rolePermissions.confirm.selfLockoutMessage'),
                header: trans('rolePermissions.confirm.selfLockoutHeader'),
                acceptProps: {
                    severity: 'danger',
                    label: trans('common.confirm'),
                },
                rejectProps: {
                    severity: 'secondary',
                    outlined: true,
                    label: trans('common.cancel'),
                },
                accept: () => void runRoleSave(),
            });

            return;
        }

        void runRoleSave();
    }

    // ---- User overrides tab ----
    const userSearch = ref('');
    const userSearchResults = ref<UserSearchResult[]>([]);
    const userSearchLoading = ref(false);
    const selectedUserId = ref<number | null>(null);
    const userDetail = ref<UserPermissionOverrides | null>(null);
    const userLoading = ref(false);
    const userSaving = ref(false);

    const userRouteAccess = ref<Record<string, boolean>>(
        emptyRouteAccess(catalog.value),
    );
    const userResourceAccess = ref<Record<string, ResourceLevel>>(
        emptyResourceAccess(catalog.value),
    );
    const userResourceScopeAccess = ref<Record<string, ScopeLevel>>(
        emptyResourceScopeAccess(catalog.value),
    );

    let searchTimer: ReturnType<typeof setTimeout> | undefined;

    watch(userSearch, (value) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(async () => {
            userSearchLoading.value = true;

            try {
                const response = await fetch(
                    searchUsersAction.url({ query: { q: value } }),
                    { headers: { Accept: 'application/json' } },
                );
                userSearchResults.value = await response.json();
            } catch {
                userSearchResults.value = [];
            } finally {
                userSearchLoading.value = false;
            }
        }, 300);
    });

    async function selectUser(userId: number) {
        selectedUserId.value = userId;
        userLoading.value = true;

        try {
            const response = await fetch(showUserPermissions.url(userId), {
                headers: { Accept: 'application/json' },
            });
            const detail: UserPermissionOverrides = await response.json();
            userDetail.value = detail;
            userRouteAccess.value = { ...detail.route_permissions };
            userResourceAccess.value = { ...detail.resource_permissions };
            userResourceScopeAccess.value = { ...detail.resource_scopes };
        } catch {
            toast.error(
                trans('rolePermissions.toast.loadFailed'),
                trans('rolePermissions.toast.errorTitle'),
            );
        } finally {
            userLoading.value = false;
        }
    }

    async function saveUserPermissions() {
        if (!selectedUserId.value) {
            return;
        }

        userSaving.value = true;

        try {
            const routes = Object.keys(userRouteAccess.value).filter(
                (key) => userRouteAccess.value[key] === true,
            );
            const updated = await csrfPut<UserPermissionOverrides>(
                updateUserPermissions.url(selectedUserId.value),
                {
                    routes,
                    resources: userResourceAccess.value,
                    scopes: userResourceScopeAccess.value,
                },
            );

            userDetail.value = updated;
            userRouteAccess.value = { ...updated.route_permissions };
            userResourceAccess.value = { ...updated.resource_permissions };
            userResourceScopeAccess.value = { ...updated.resource_scopes };
            toast.success(
                trans('rolePermissions.toast.saveSuccess'),
                trans('rolePermissions.toast.successTitle'),
            );
        } catch {
            toast.error(
                trans('rolePermissions.toast.saveFailed'),
                trans('rolePermissions.toast.errorTitle'),
            );
        } finally {
            userSaving.value = false;
        }
    }

    function clearUserOverrides() {
        userRouteAccess.value = emptyRouteAccess(catalog.value);
        userResourceAccess.value = emptyResourceAccess(catalog.value);
        userResourceScopeAccess.value = emptyResourceScopeAccess(catalog.value);
    }

    return {
        catalog,
        roles,
        activeTab,
        // roles tab
        selectedRoleId,
        roleDetail,
        roleLoading,
        roleSaving,
        roleRouteAccess,
        roleResourceAccess,
        roleResourceScopeAccess,
        saveRolePermissions,
        // user overrides tab
        userSearch,
        userSearchResults,
        userSearchLoading,
        selectedUserId,
        userDetail,
        userLoading,
        userSaving,
        userRouteAccess,
        userResourceAccess,
        userResourceScopeAccess,
        selectUser,
        saveUserPermissions,
        clearUserOverrides,
    };
}
