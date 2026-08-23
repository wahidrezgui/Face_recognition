import { router, useForm, usePage } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import { useConfirm } from 'primevue/useconfirm';
import { computed, ref } from 'vue';
import {
    destroy,
    store,
    update,
} from '@/actions/App/Http/Controllers/Inertia/DepartmentController';
import { useLocale } from '@/composables/useLocale';
import { useToast } from '@/composables/useToast';
import { canWriteResource, isGlobalScope } from '@/lib/auth-roles';
import {
    collectDescendantDeptIds,
    extractDeptKey,
    filterDepartmentTreeExcluding,
    normalizeDepartmentTree,
    toTreeSelectValue,
} from '@/lib/organization/departmentTree';
import {
    countTreeNodes,
    findDepartmentNodeById,
} from '@/lib/organization/departmentTreeHelpers';
import type { DepartmentNode } from '@/types';

interface DepartmentsPageProps {
    departments: DepartmentNode[];
    bases: { id: number; name_ar: string; name_en: string }[];
    scope: 'global' | 'hierarchy' | 'self';
    scopeLabel: string;
    [key: string]: unknown;
}

interface DepartmentFormData {
    name_en: string;
    name_ar: string;
    parent_id: number;
    selected_bases: number[];
}

function emptyFormValues(parentId = 0): DepartmentFormData {
    return {
        name_en: '',
        name_ar: '',
        parent_id: parentId,
        selected_bases: [],
    };
}

export function useDepartmentPage() {
    const page = usePage<DepartmentsPageProps>();
    const toast = useToast();
    const confirm = useConfirm();
    const { locale } = useLocale();

    const departments = computed(() => page.props.departments);
    const bases = computed(() => page.props.bases);
    const scope = computed(() => page.props.scope);
    const user = computed(() => page.props.auth.user);

    const isOpenedC = ref(false);
    const isOpenedE = ref(false);
    const editingDepartmentId = ref<number | null>(null);

    const createForm = useForm<DepartmentFormData>(emptyFormValues());
    const editForm = useForm<DepartmentFormData>(emptyFormValues());
    const createParentTree = ref<Record<string, boolean> | null>(null);
    const editParentTree = ref<Record<string, boolean> | null>(null);

    const panelWidth = computed(() =>
        typeof window !== 'undefined' && window.innerWidth < 640
            ? '100%'
            : '600px',
    );

    const parentDepartmentOptions = computed(() =>
        normalizeDepartmentTree(departments.value || [], locale.value),
    );
    const editParentDepartmentOptions = computed(() => {
        const normalized = parentDepartmentOptions.value;

        if (!editingDepartmentId.value) {
            return normalized;
        }

        const excluded = collectDescendantDeptIds(
            normalized,
            editingDepartmentId.value,
        );

        return filterDepartmentTreeExcluding(normalized, excluded);
    });

    const pageTitle = computed(() =>
        isGlobalScope('departments', user.value)
            ? trans('departments.page.titleGlobal')
            : trans('departments.page.titleScoped'),
    );

    const pageDescription = computed(() => {
        if (isGlobalScope('departments', user.value)) {
            return trans('departments.page.descriptionGlobal');
        }

        if (scope.value === 'self') {
            return trans('departments.page.descriptionSelf');
        }

        return trans('departments.page.descriptionScoped');
    });

    const treeDescription = computed(() => {
        const count = countTreeNodes(departments.value);
        const countStr = String(count);

        if (scope.value === 'global') {
            return count
                ? trans('departments.tree.countGlobal', { count: countStr })
                : trans('departments.tree.emptyGlobal');
        }

        if (scope.value === 'self') {
            return count
                ? trans('departments.tree.countSelf', { count: countStr })
                : trans('departments.tree.emptySelfNone');
        }

        return count
            ? trans('departments.tree.countScoped', { count: countStr })
            : trans('departments.tree.emptyScoped');
    });

    const canDelete = computed(
        () =>
            scope.value === 'global' &&
            canWriteResource('departments', user.value),
    );
    const canManage = computed(() =>
        canWriteResource('departments', user.value),
    );

    function onCreateParentChange(value: Record<string, boolean> | null) {
        createParentTree.value = value;
        createForm.parent_id = Number(extractDeptKey(value) || 0);
    }

    function onEditParentChange(value: Record<string, boolean> | null) {
        editParentTree.value = value;
        editForm.parent_id = Number(extractDeptKey(value) || 0);
    }

    function openCreatePanel(parentId?: number | string | null) {
        isOpenedE.value = false;
        const resolvedParentId = Number(parentId ?? 0);
        createForm.reset();
        createForm.clearErrors();
        createForm.parent_id = resolvedParentId;
        createParentTree.value = toTreeSelectValue(resolvedParentId);
        isOpenedC.value = true;
    }

    function submitCreate() {
        createForm.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                isOpenedC.value = false;
                toast.success(
                    trans('departments.toast.createSuccess'),
                    trans('departments.toast.successTitle'),
                );
            },
            onError: () => {
                toast.error(
                    trans('departments.toast.createFailed'),
                    trans('departments.toast.errorTitle'),
                );
            },
        });
    }

    function editDep(id: number | string | null) {
        const departmentId = Number(id);

        if (!Number.isFinite(departmentId) || departmentId <= 0) {
            toast.error(
                trans('departments.toast.invalidId'),
                trans('departments.toast.errorTitle'),
            );

            return;
        }

        const node = findDepartmentNodeById(departments.value, departmentId);

        if (!node) {
            toast.error(
                trans('departments.toast.loadOneFailed'),
                trans('departments.toast.errorTitle'),
            );

            return;
        }

        isOpenedC.value = false;
        editingDepartmentId.value = departmentId;
        editForm.clearErrors();
        editForm.name_en = node.name_en || '';
        editForm.name_ar = node.name_ar || '';
        editForm.parent_id = Number(node.parent_id || 0);
        editForm.selected_bases = (node.bases || []).map((base) => base.id);
        editParentTree.value = toTreeSelectValue(node.parent_id);
        isOpenedE.value = true;
    }

    function submitEdit() {
        if (!editingDepartmentId.value) {
            return;
        }

        editForm.put(update.url(editingDepartmentId.value), {
            preserveScroll: true,
            onSuccess: () => {
                isOpenedE.value = false;
                toast.success(
                    trans('departments.toast.updateSuccess'),
                    trans('departments.toast.successTitle'),
                );
            },
            onError: () => {
                toast.error(
                    trans('departments.toast.updateFailed'),
                    trans('departments.toast.errorTitle'),
                );
            },
        });
    }

    function deleteDepartmentById(id: number | string | null) {
        const departmentId = Number(id);

        if (!Number.isFinite(departmentId) || departmentId <= 0) {
            toast.error(
                trans('departments.toast.invalidId'),
                trans('departments.toast.errorTitle'),
            );

            return;
        }

        confirm.require({
            message: trans('departments.toast.deleteConfirmMessage'),
            header: trans('departments.toast.deleteConfirmHeader'),
            acceptProps: { severity: 'danger', label: trans('common.confirm') },
            rejectProps: {
                severity: 'secondary',
                outlined: true,
                label: trans('common.cancel'),
            },
            accept: () => {
                router.delete(destroy.url(departmentId), {
                    preserveScroll: true,
                    onSuccess: () => {
                        toast.success(
                            trans('departments.toast.deleteSuccess'),
                            trans('departments.toast.deleteConfirmedTitle'),
                        );
                    },
                    onError: () => {
                        toast.error(
                            trans('departments.toast.deleteFailed'),
                            trans('departments.toast.errorTitle'),
                        );
                    },
                });
            },
        });
    }

    return {
        departments,
        bases,
        scope,
        createForm,
        editForm,
        createParentTree,
        editParentTree,
        isOpenedC,
        isOpenedE,
        panelWidth,
        parentDepartmentOptions,
        editParentDepartmentOptions,
        pageTitle,
        pageDescription,
        treeDescription,
        canDelete,
        canManage,
        onCreateParentChange,
        onEditParentChange,
        openCreatePanel,
        submitCreate,
        editDep,
        submitEdit,
        deleteDepartmentById,
    };
}
