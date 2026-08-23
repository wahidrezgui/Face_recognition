import { router, useForm, usePage } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import { useConfirm } from 'primevue/useconfirm';
import { computed, ref, watch } from 'vue';
import {
    destroy,
    show,
    store,
    update,
} from '@/actions/App/Http/Controllers/Inertia/CompanyController';
import { useLocale } from '@/composables/useLocale';
import { useToast } from '@/composables/useToast';
import { canWriteResource, isGlobalScope } from '@/lib/auth-roles';
import {
    extractDeptKey,
    normalizeDepartmentTree,
    toTreeSelectValue,
} from '@/lib/organization/departmentTree';
import type { CompanyFilters, PaginatedCompanies } from '@/types';
import type { DepartmentNode } from '@/types';

interface CompaniesPageProps {
    companies: PaginatedCompanies;
    filters: CompanyFilters;
    parentDepartmentOptions: DepartmentNode[];
    bases: { id: number; name_ar: string; name_en: string }[];
    scope: 'global' | 'hierarchy' | 'self';
    scopeLabel: string;
    [key: string]: unknown;
}

interface CompanyFormData {
    name_en: string;
    name_ar: string;
    parent_id: number;
    selected_bases: number[];
    start_time: string;
    end_time: string;
}

function emptyFormValues(parentId = 0): CompanyFormData {
    return {
        name_en: '',
        name_ar: '',
        parent_id: parentId,
        selected_bases: [],
        start_time: '',
        end_time: '',
    };
}

export function useCompaniesPage() {
    const page = usePage<CompaniesPageProps>();
    const toast = useToast();
    const confirm = useConfirm();
    const { locale } = useLocale();

    const companies = computed(() => page.props.companies);
    const bases = computed(() => page.props.bases);
    const scope = computed(() => page.props.scope);
    const user = computed(() => page.props.auth.user);

    const pageTitle = computed(() =>
        isGlobalScope('departments', user.value)
            ? trans('companies.page.titleGlobal')
            : trans('companies.page.titleScoped'),
    );
    const canManage = computed(() => canWriteResource('companies', user.value));

    const search = ref(page.props.filters.search ?? '');
    const perPage = ref(page.props.filters.per_page ?? '25');

    let filterTimer: ReturnType<typeof setTimeout> | undefined;

    function fetchList(extra: Record<string, string | number> = {}) {
        router.get(
            page.url.split('?')[0],
            {
                search: search.value || undefined,
                per_page: perPage.value,
                ...extra,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['companies', 'filters'],
            },
        );
    }

    watch(search, () => {
        clearTimeout(filterTimer);
        filterTimer = setTimeout(() => fetchList(), 300);
    });

    function resetFilters() {
        search.value = '';
        fetchList();
    }

    interface DataTableLazyEvent {
        first: number;
        rows: number;
    }

    function onDataTableChange(event: DataTableLazyEvent) {
        perPage.value = String(event.rows);
        fetchList({ page: Math.floor(event.first / event.rows) + 1 });
    }

    const parentDepartmentOptions = computed(() =>
        normalizeDepartmentTree(
            page.props.parentDepartmentOptions || [],
            locale.value,
        ),
    );

    const isOpenedCreate = ref(false);
    const isOpenedEdit = ref(false);
    const editingCompanyId = ref<number | null>(null);

    const createForm = useForm<CompanyFormData>(emptyFormValues());
    const editForm = useForm<CompanyFormData>(emptyFormValues());
    const createParentTree = ref<Record<string, boolean> | null>(null);
    const editParentTree = ref<Record<string, boolean> | null>(null);

    const panelWidth = computed(() =>
        typeof window !== 'undefined' && window.innerWidth < 640
            ? '100%'
            : '600px',
    );

    function onCreateParentChange(value: Record<string, boolean> | null) {
        createParentTree.value = value;
        createForm.parent_id = Number(extractDeptKey(value) || 0);
    }

    function onEditParentChange(value: Record<string, boolean> | null) {
        editParentTree.value = value;
        editForm.parent_id = Number(extractDeptKey(value) || 0);
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
                    trans('companies.toast.createSuccess'),
                    trans('companies.toast.successTitle'),
                );
            },
            onError: () =>
                toast.error(
                    trans('companies.toast.createFailed'),
                    trans('companies.toast.errorTitle'),
                ),
        });
    }

    function openEditPanel(company: PaginatedCompanies['data'][number]) {
        isOpenedCreate.value = false;
        editingCompanyId.value = company.id;
        editForm.clearErrors();
        editForm.name_en = company.name_en ?? '';
        editForm.name_ar = company.name_ar ?? '';
        editForm.parent_id = company.parent_id;
        editForm.selected_bases = (company.bases ?? []).map((b) => b.id);
        editForm.start_time = company.start_time
            ? company.start_time.slice(0, 5)
            : '';
        editForm.end_time = company.end_time
            ? company.end_time.slice(0, 5)
            : '';
        editParentTree.value = toTreeSelectValue(company.parent_id);
        isOpenedEdit.value = true;
    }

    function submitEdit() {
        if (!editingCompanyId.value) {
            return;
        }

        editForm.put(update.url(editingCompanyId.value), {
            preserveScroll: true,
            onSuccess: () => {
                isOpenedEdit.value = false;
                toast.success(
                    trans('companies.toast.updateSuccess'),
                    trans('companies.toast.successTitle'),
                );
            },
            onError: () =>
                toast.error(
                    trans('companies.toast.updateFailed'),
                    trans('companies.toast.errorTitle'),
                ),
        });
    }

    function deleteCompany(company: PaginatedCompanies['data'][number]) {
        confirm.require({
            message: trans('companies.toast.deleteConfirmMessage'),
            header: trans('companies.toast.deleteConfirmHeader'),
            acceptProps: { severity: 'danger', label: trans('common.confirm') },
            rejectProps: {
                severity: 'secondary',
                outlined: true,
                label: trans('common.cancel'),
            },
            accept: () => {
                router.delete(destroy.url(company.id), {
                    preserveScroll: true,
                    onSuccess: () =>
                        toast.success(
                            trans('companies.toast.deleteSuccess'),
                            trans('companies.toast.successTitle'),
                        ),
                    onError: () =>
                        toast.error(
                            trans('companies.toast.deleteFailed'),
                            trans('companies.toast.errorTitle'),
                        ),
                });
            },
        });
    }

    function openCompany(company: PaginatedCompanies['data'][number]) {
        router.visit(show.url(company.id));
    }

    return {
        companies,
        bases,
        scope,
        pageTitle,
        canManage,
        search,
        resetFilters,
        onDataTableChange,
        parentDepartmentOptions,
        isOpenedCreate,
        isOpenedEdit,
        createForm,
        editForm,
        createParentTree,
        editParentTree,
        panelWidth,
        onCreateParentChange,
        onEditParentChange,
        openCreatePanel,
        submitCreate,
        openEditPanel,
        submitEdit,
        deleteCompany,
        openCompany,
    };
}
