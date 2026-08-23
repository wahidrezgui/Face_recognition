import { router, useForm, usePage } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import { useConfirm } from 'primevue/useconfirm';
import { computed, ref, watch } from 'vue';
import {
    destroy,
    store,
    update,
} from '@/actions/App/Http/Controllers/Inertia/CheckTimeController';
import { useLocale } from '@/composables/useLocale';
import { useToast } from '@/composables/useToast';
import { canWriteResource } from '@/lib/auth-roles';
import {
    extractDeptKey,
    normalizeDepartmentTree,
    toTreeSelectValue,
} from '@/lib/organization/departmentTree';
import type { CheckTime, RankCategory } from '@/types';
import type { Gender } from '@/types';
import type { DepartmentNode } from '@/types';

interface SettingsPageProps {
    departments: DepartmentNode[];
    genders: Gender[];
    rankCategories: RankCategory[];
    selectedDepId: number;
    checkTimes: CheckTime[];
    [key: string]: unknown;
}

interface CheckTimeFormData {
    dep_id: number;
    gender_id: number | null;
    rank_id: number | null;
    start_time: string;
    end_time: string;
}

function emptyFormValues(depId: number): CheckTimeFormData {
    return {
        dep_id: depId,
        gender_id: null,
        rank_id: null,
        start_time: '',
        end_time: '',
    };
}

export function useSettingsPage() {
    const page = usePage<SettingsPageProps>();
    const toast = useToast();
    const confirm = useConfirm();
    const { locale } = useLocale();

    const departments = computed(() => page.props.departments);
    const genders = computed(() => page.props.genders);
    const rankCategories = computed(() => page.props.rankCategories);
    const checkTimes = computed(() => page.props.checkTimes);
    const user = computed(() => page.props.auth.user);

    const canManage = computed(() => canWriteResource('settings', user.value));

    const departmentOptions = computed(() =>
        normalizeDepartmentTree(departments.value || [], locale.value),
    );

    const selectedDepId = ref(page.props.selectedDepId ?? 0);
    const departmentTree = ref<Record<string, boolean> | null>(
        selectedDepId.value ? toTreeSelectValue(selectedDepId.value) : null,
    );

    watch(
        () => page.props.selectedDepId,
        (depId) => {
            selectedDepId.value = depId ?? 0;
        },
    );

    function onDepartmentChange(value: Record<string, boolean> | null) {
        departmentTree.value = value;
        const depId = Number(extractDeptKey(value) || 0);
        selectedDepId.value = depId;

        router.get(
            page.url.split('?')[0],
            { dep_id: depId || undefined },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['checkTimes', 'selectedDepId'],
            },
        );
    }

    // ---- create / edit dialog ----
    const isOpenedCreate = ref(false);
    const isOpenedEdit = ref(false);
    const editingCheckTimeId = ref<number | null>(null);

    const createForm = useForm<CheckTimeFormData>(
        emptyFormValues(selectedDepId.value),
    );
    const editForm = useForm<CheckTimeFormData>(
        emptyFormValues(selectedDepId.value),
    );

    function openCreateDialog() {
        isOpenedEdit.value = false;
        createForm.reset();
        createForm.clearErrors();
        Object.assign(createForm, emptyFormValues(selectedDepId.value));
        isOpenedCreate.value = true;
    }

    function submitCreate() {
        createForm.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                isOpenedCreate.value = false;
                toast.success(
                    trans('settings.toast.createSuccess'),
                    trans('settings.toast.successTitle'),
                );
            },
            onError: () =>
                toast.error(
                    trans('settings.toast.createFailed'),
                    trans('settings.toast.errorTitle'),
                ),
        });
    }

    function openEditDialog(checkTime: CheckTime) {
        isOpenedCreate.value = false;
        editingCheckTimeId.value = checkTime.id;
        editForm.clearErrors();
        Object.assign(editForm, {
            dep_id: checkTime.dep_id,
            gender_id: checkTime.gender_id,
            rank_id: checkTime.rank_id,
            // DB values come back as HH:MM:SS; AppTimeInput accepts H:i or H:i:s and emits H:i by default.
            // Slice to HH:MM so validation stays happy.
            start_time: checkTime.start_time.slice(0, 5),
            end_time: checkTime.end_time.slice(0, 5),
        });
        isOpenedEdit.value = true;
    }

    function submitEdit() {
        if (!editingCheckTimeId.value) {
            return;
        }

        editForm.put(update.url(editingCheckTimeId.value), {
            preserveScroll: true,
            onSuccess: () => {
                isOpenedEdit.value = false;
                toast.success(
                    trans('settings.toast.updateSuccess'),
                    trans('settings.toast.successTitle'),
                );
            },
            onError: () =>
                toast.error(
                    trans('settings.toast.updateFailed'),
                    trans('settings.toast.errorTitle'),
                ),
        });
    }

    function deleteCheckTime(checkTime: CheckTime) {
        confirm.require({
            message: trans('settings.toast.deleteConfirmMessage'),
            header: trans('settings.toast.deleteConfirmHeader'),
            acceptProps: { severity: 'danger', label: trans('common.confirm') },
            rejectProps: {
                severity: 'secondary',
                outlined: true,
                label: trans('common.cancel'),
            },
            accept: () => {
                router.delete(destroy.url(checkTime.id), {
                    preserveScroll: true,
                    onSuccess: () =>
                        toast.success(
                            trans('settings.toast.deleteSuccess'),
                            trans('settings.toast.successTitle'),
                        ),
                    onError: () =>
                        toast.error(
                            trans('settings.toast.deleteFailed'),
                            trans('settings.toast.errorTitle'),
                        ),
                });
            },
        });
    }

    return {
        departments,
        departmentOptions,
        genders,
        rankCategories,
        checkTimes,
        canManage,
        selectedDepId,
        departmentTree,
        onDepartmentChange,
        isOpenedCreate,
        isOpenedEdit,
        createForm,
        editForm,
        openCreateDialog,
        submitCreate,
        openEditDialog,
        submitEdit,
        deleteCheckTime,
    };
}
