import { router, useForm, usePage } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import { useConfirm } from 'primevue/useconfirm';
import { computed, ref, watch } from 'vue';
import {
    destroy,
    store,
    update,
} from '@/actions/App/Http/Controllers/Inertia/UserController';
import { useLocale } from '@/composables/useLocale';
import { useToast } from '@/composables/useToast';
import {
    extractDeptKey,
    normalizeDepartmentTree,
    toTreeSelectValue,
} from '@/lib/organization/departmentTree';
import type { DepartmentNode } from '@/types';
import type { ManagedUser, PaginatedUsers, UserFilters } from '@/types';

interface UsersPageProps {
    users: PaginatedUsers;
    filters: UserFilters;
    departments: DepartmentNode[];
    bases: { id: number; name_ar: string; name_en: string }[];
    assignableRoles: string[];
    rolesRequiringDepartment: string[];
    scope: 'global' | 'hierarchy' | 'self';
    scopeLabel: string;
    superAdminCount: number;
    [key: string]: unknown;
}

interface UserFormData {
    firstname: string;
    lastname: string;
    username: string;
    password: string;
    password_confirmation: string;
    role: string;
    dep_id: number | null;
    default_base: number | null;
    activate_sso: boolean;
    military_number: number | null;
}

function emptyFormValues(depId: number | null = null): UserFormData {
    return {
        firstname: '',
        lastname: '',
        username: '',
        password: '',
        password_confirmation: '',
        role: '',
        dep_id: depId,
        default_base: null,
        activate_sso: false,
        military_number: null,
    };
}

const SUPER_ADMIN_ROLE = 'Super Admin';

export function useUsersPage() {
    const page = usePage<UsersPageProps>();
    const toast = useToast();
    const confirm = useConfirm();
    const { locale } = useLocale();

    const users = computed(() => page.props.users);
    const departments = computed(() => page.props.departments);
    const bases = computed(() => page.props.bases);
    const assignableRoles = computed(() => page.props.assignableRoles);
    const rolesRequiringDepartment = computed(
        () => page.props.rolesRequiringDepartment,
    );
    const scope = computed(() => page.props.scope);
    const scopeLabel = computed(() => page.props.scopeLabel);
    const superAdminCount = computed(() => page.props.superAdminCount);
    const currentUser = computed(() => page.props.auth.user);

    const pageTitle = computed(() =>
        scope.value === 'global'
            ? trans('users.page.titleGlobal')
            : trans('users.page.titleScoped'),
    );

    const roleOptions = computed(() =>
        assignableRoles.value.map((name) => ({ value: name, label: name })),
    );
    const departmentOptions = computed(() =>
        normalizeDepartmentTree(departments.value || [], locale.value),
    );

    // ---- filters ----
    const search = ref(page.props.filters.search ?? '');
    const militaryNumber = ref(page.props.filters.military_number ?? '');
    const roleFilter = ref(page.props.filters.role ?? '');
    const ssoStatusFilter = ref(page.props.filters.sso_status ?? '');
    const departmentId = ref(page.props.filters.dep_id ?? '');
    const departmentFilterTree = ref<Record<string, boolean> | null>(
        departmentId.value
            ? toTreeSelectValue(Number(departmentId.value))
            : null,
    );
    const perPage = ref(page.props.filters.per_page ?? '25');
    const sortField = ref(page.props.filters.sort_field ?? '');
    const sortOrder = ref(page.props.filters.sort_order ?? '');

    function onDepartmentFilterChange(value: Record<string, boolean> | null) {
        departmentFilterTree.value = value;
        departmentId.value = extractDeptKey(value) || '';
    }

    let filterTimer: ReturnType<typeof setTimeout> | undefined;

    function fetchList(extra: Record<string, string | number> = {}) {
        router.get(
            page.url.split('?')[0],
            {
                search: search.value || undefined,
                military_number: militaryNumber.value || undefined,
                role: roleFilter.value || undefined,
                sso_status: ssoStatusFilter.value || undefined,
                dep_id: departmentId.value || undefined,
                per_page: perPage.value,
                sort_field: sortField.value || undefined,
                sort_order: sortOrder.value || undefined,
                ...extra,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['users', 'filters'],
            },
        );
    }

    function scheduleFilter() {
        clearTimeout(filterTimer);
        filterTimer = setTimeout(() => fetchList(), 300);
    }

    watch(
        [search, militaryNumber, roleFilter, ssoStatusFilter, departmentId],
        () => scheduleFilter(),
    );

    function resetFilters() {
        search.value = '';
        militaryNumber.value = '';
        roleFilter.value = '';
        ssoStatusFilter.value = '';
        departmentId.value = '';
        departmentFilterTree.value = null;
        fetchList();
    }

    interface DataTableLazyEvent {
        first: number;
        rows: number;
        sortField?: string | ((item: unknown) => string) | null;
        sortOrder?: 1 | 0 | -1 | null;
    }

    function onDataTableChange(event: DataTableLazyEvent) {
        perPage.value = String(event.rows);
        sortField.value =
            typeof event.sortField === 'string' ? event.sortField : '';
        sortOrder.value = event.sortOrder ? String(event.sortOrder) : '';
        fetchList({ page: Math.floor(event.first / event.rows) + 1 });
    }

    // ---- create / edit panel ----
    const isOpenedCreate = ref(false);
    const isOpenedEdit = ref(false);
    const editingUserId = ref<number | null>(null);
    const editingUser = ref<ManagedUser | null>(null);

    const createParentTree = ref<Record<string, boolean> | null>(null);
    const editParentTree = ref<Record<string, boolean> | null>(null);

    const createForm = useForm<UserFormData>(emptyFormValues());
    const editForm = useForm<UserFormData>(emptyFormValues());

    const isDepartmentRequired = computed(
        () =>
            rolesRequiringDepartment.value.includes(createForm.role) ||
            rolesRequiringDepartment.value.includes(editForm.role),
    );

    // Stricter than the backend, which only blocks a *downgrade*: there's no
    // legitimate reason to reopen your own row and resubmit your own role, so the
    // client fully locks it. The backend stays authoritative if ever bypassed.
    const isEditingSelf = computed(
        () =>
            !!editingUser.value &&
            editingUser.value.id === currentUser.value?.id,
    );

    const isTargetLastSuperAdmin = computed(
        () =>
            !!editingUser.value &&
            editingUser.value.roles.some((r) => r.name === SUPER_ADMIN_ROLE) &&
            superAdminCount.value <= 1,
    );

    function onCreateParentChange(value: Record<string, boolean> | null) {
        createParentTree.value = value;
        createForm.dep_id = Number(extractDeptKey(value) || 0) || null;
    }

    function onEditParentChange(value: Record<string, boolean> | null) {
        editParentTree.value = value;
        editForm.dep_id = Number(extractDeptKey(value) || 0) || null;
    }

    function openCreatePanel() {
        isOpenedEdit.value = false;
        createForm.reset();
        createForm.clearErrors();
        Object.assign(createForm, emptyFormValues());
        createParentTree.value = null;
        isOpenedCreate.value = true;
    }

    function submitCreate() {
        createForm.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                isOpenedCreate.value = false;
                toast.success(
                    trans('users.toast.createSuccess'),
                    trans('users.toast.successTitle'),
                );
            },
            onError: () => {
                toast.error(
                    trans('users.toast.createFailed'),
                    trans('users.toast.errorTitle'),
                );
            },
        });
    }

    function openEditPanel(user: ManagedUser) {
        isOpenedCreate.value = false;
        editingUserId.value = user.id;
        editingUser.value = user;
        editForm.clearErrors();
        Object.assign(editForm, {
            firstname: user.firstname,
            lastname: user.lastname,
            username: user.username,
            military_number: user.military_number,
            password: '',
            role: user.roles[0]?.name ?? '',
            dep_id: user.dep_id,
            default_base: user.default_base || null,
            activate_sso: user.is_sso_pending,
        });
        editParentTree.value = toTreeSelectValue(user.dep_id);
        isOpenedEdit.value = true;
    }

    function submitEdit() {
        if (!editingUserId.value) {
            return;
        }

        editForm.put(update.url(editingUserId.value), {
            preserveScroll: true,
            onSuccess: () => {
                isOpenedEdit.value = false;
                toast.success(
                    trans('users.toast.updateSuccess'),
                    trans('users.toast.successTitle'),
                );
            },
            onError: () => {
                toast.error(
                    trans('users.toast.updateFailed'),
                    trans('users.toast.errorTitle'),
                );
            },
        });
    }

    function deleteUser(user: ManagedUser) {
        confirm.require({
            message: trans('users.toast.deleteConfirmMessage'),
            header: trans('users.toast.deleteConfirmHeader'),
            acceptProps: { severity: 'danger', label: trans('common.confirm') },
            rejectProps: {
                severity: 'secondary',
                outlined: true,
                label: trans('common.cancel'),
            },
            accept: () => {
                router.delete(destroy.url(user.id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        toast.success(
                            trans('users.toast.deleteSuccess'),
                            trans('users.toast.successTitle'),
                        );
                    },
                    onError: () => {
                        toast.error(
                            trans('users.toast.deleteFailed'),
                            trans('users.toast.errorTitle'),
                        );
                    },
                });
            },
        });
    }

    return {
        users,
        departments,
        bases,
        roleOptions,
        departmentOptions,
        scope,
        scopeLabel,
        superAdminCount,
        currentUser,
        pageTitle,
        search,
        militaryNumber,
        roleFilter,
        ssoStatusFilter,
        departmentId,
        departmentFilterTree,
        onDepartmentFilterChange,
        resetFilters,
        onDataTableChange,
        isOpenedCreate,
        isOpenedEdit,
        createForm,
        editForm,
        createParentTree,
        editParentTree,
        isDepartmentRequired,
        isEditingSelf,
        isTargetLastSuperAdmin,
        onCreateParentChange,
        onEditParentChange,
        openCreatePanel,
        submitCreate,
        openEditPanel,
        submitEdit,
        editingUser,
        deleteUser,
    };
}
