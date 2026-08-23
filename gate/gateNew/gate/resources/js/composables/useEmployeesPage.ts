import { router, useForm, usePage } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import { useConfirm } from 'primevue/useconfirm';
import { computed, ref, watch } from 'vue';
import {
    accessCard as accessCardAction,
    accessCards as accessCardsAction,
    approve,
    bulkPrintAccessCards as bulkPrintAccessCardsAction,
    destroy,
    markPrinted as markPrintedAction,
    movements as movementsAction,
    returnCard as returnCardAction,
    setActive as setActiveAction,
    storeCar,
    store,
    update,
    updateCar,
    destroyCar,
} from '@/actions/App/Http/Controllers/Inertia/EmployeeController';
import { useLocale } from '@/composables/useLocale';
import { useToast } from '@/composables/useToast';
import { canWriteResource, isGlobalScope } from '@/lib/auth-roles';
import {
    buildEmployeeBulkConfirm,
    resolveEmployeeBulkActions,
} from '@/lib/employees/employeeFormUi';
import {
    extractDeptKey,
    normalizeDepartmentTree,
    toTreeSelectValue,
} from '@/lib/organization/departmentTree';
import type { AccessCardResponse, BulkAccessCardEntry } from '@/types';
import type {
    BaseWithZones,
    Employee,
    EmployeeFilters,
    EmployeeMovement,
    Gender,
    Nationality,
    PaginatedEmployees,
    Rank,
    StatusCard,
} from '@/types';
import type { DepartmentNode } from '@/types';

interface LockedCompany {
    id: number;
    name_ar: string;
    name_en: string;
}

interface EmployeesPageProps {
    employees: PaginatedEmployees;
    statusCards: StatusCard[];
    expiredCount: number;
    filters: EmployeeFilters;
    departments: DepartmentNode[];
    bases: BaseWithZones[];
    ranks: Rank[];
    nationalities: Nationality[];
    genders: Gender[];
    lockedCompany?: LockedCompany | null;
    [key: string]: unknown;
}

interface EmployeeFormData {
    military_number: number | null;
    phone_number: number | null;
    fullname_en: string;
    fullname_ar: string;
    remarks: string;
    bloodtype: string;
    qid: string;
    Job_Arabic: string;
    Job_En: string;
    StartTime: string;
    EndTime: string;
    Escort: string;
    device: string;
    expiry_date: string;
    dep_id: number;
    dep_parent_id: number;
    rank_id: number | null;
    nationality_id: number | null;
    gender_id: number | null;
    default_base: number | null;
    is_employee: number;
    housing: boolean;
    photo: File | null;
    zoning: number[];
}

function emptyFormValues(depId = 0, isEmployee = 0): EmployeeFormData {
    return {
        military_number: null,
        phone_number: null,
        fullname_en: '',
        fullname_ar: '',
        remarks: '',
        bloodtype: '',
        qid: '',
        Job_Arabic: '',
        Job_En: '',
        StartTime: '',
        EndTime: '',
        Escort: '',
        device: '',
        expiry_date: '',
        dep_id: depId,
        dep_parent_id: depId,
        rank_id: null,
        nationality_id: null,
        gender_id: null,
        default_base: null,
        is_employee: isEmployee,
        housing: false,
        photo: null,
        zoning: [],
    };
}

export function useEmployeesPage() {
    const page = usePage<EmployeesPageProps>();
    const toast = useToast();
    const confirm = useConfirm();
    const { locale } = useLocale();

    const employees = computed(() => page.props.employees);
    const statusCards = computed(() => page.props.statusCards);
    const expiredCount = computed(() => page.props.expiredCount);
    const departments = computed(() => page.props.departments);
    const bases = computed(() => page.props.bases);
    const ranks = computed(() => page.props.ranks);
    const nationalities = computed(() => page.props.nationalities);
    const genders = computed(() => page.props.genders);
    const lockedCompany = computed(() => page.props.lockedCompany ?? null);
    const lockedDepartmentLabel = computed(() =>
        lockedCompany.value
            ? locale.value === 'en'
                ? lockedCompany.value.name_en
                : lockedCompany.value.name_ar
            : null,
    );
    const user = computed(() => page.props.auth.user);

    const militaryNumber = ref(page.props.filters.military_number ?? '');
    const fullnameAr = ref(page.props.filters.fullname_ar ?? '');
    const plateNumber = ref(page.props.filters.plate_number ?? '');
    const baseId = ref(page.props.filters.base_id ?? '');
    const zoneId = ref(page.props.filters.zone_id ?? '');
    const statusFilter = ref(page.props.filters.status ?? '');
    const nationalityId = ref(page.props.filters.nationality_id ?? '');
    const departmentId = ref(page.props.filters.dep_id ?? '');
    const housing = ref(page.props.filters.housing ?? '');
    const expiredOnly = ref(page.props.filters.expired_only ?? '');
    const deactivatedOnly = ref(page.props.filters.deactivated_only ?? '');
    const perPage = ref(page.props.filters.per_page ?? '25');
    const sortField = ref(page.props.filters.sort_field ?? '');
    const sortOrder = ref(page.props.filters.sort_order ?? '');

    const selectedRows = ref<Employee[]>([]);

    const canManage = computed(() => canWriteResource('employees', user.value));

    // Employees isn't its own scopable resource — visibility follows the actor's
    // 'departments' scope (global sees everyone, otherwise own dep + descendants).
    const pageTitle = computed(() => {
        if (lockedCompany.value) {
            return (
                lockedDepartmentLabel.value ??
                trans('employees.page.titleScoped')
            );
        }

        return isGlobalScope('departments', user.value)
            ? trans('employees.page.titleGlobal')
            : trans('employees.page.titleScoped');
    });

    const zoneOptions = computed(() => {
        if (!baseId.value) {
            return bases.value.flatMap((b) => b.zones);
        }

        return (
            bases.value.find((b) => String(b.id) === String(baseId.value))
                ?.zones ?? []
        );
    });

    const rankGroups = computed(() => {
        const groups = new Map<number, { label: string; items: Rank[] }>();

        for (const rank of ranks.value) {
            const catId = rank.category?.id ?? 0;

            if (!groups.has(catId)) {
                groups.set(catId, {
                    label:
                        locale.value === 'ar'
                            ? rank.category?.name_ar || ''
                            : rank.category?.name_en || '',
                    items: [],
                });
            }

            groups.get(catId)!.items.push(rank);
        }

        return Array.from(groups.values());
    });

    const parentDepartmentOptions = computed(() =>
        normalizeDepartmentTree(departments.value || [], locale.value),
    );

    const departmentFilterTree = ref<Record<string, boolean> | null>(
        departmentId.value
            ? toTreeSelectValue(Number(departmentId.value))
            : null,
    );

    function onDepartmentFilterChange(value: Record<string, boolean> | null) {
        departmentFilterTree.value = value;
        departmentId.value = extractDeptKey(value) || '';
    }

    let filterTimer: ReturnType<typeof setTimeout> | undefined;

    function fetchList(extra: Record<string, string | number> = {}) {
        router.get(
            page.url.split('?')[0],
            {
                military_number: militaryNumber.value || undefined,
                fullname_ar: fullnameAr.value || undefined,
                plate_number: plateNumber.value || undefined,
                base_id: baseId.value || undefined,
                zone_id: zoneId.value || undefined,
                status:
                    statusFilter.value !== '' ? statusFilter.value : undefined,
                nationality_id: nationalityId.value || undefined,
                dep_id: lockedCompany.value
                    ? lockedCompany.value.id
                    : departmentId.value || undefined,
                company_only: lockedCompany.value ? 1 : undefined,
                housing: housing.value || undefined,
                expired_only: expiredOnly.value || undefined,
                deactivated_only: deactivatedOnly.value || undefined,
                per_page: perPage.value,
                sort_field: sortField.value || undefined,
                sort_order: sortOrder.value || undefined,
                ...extra,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['employees', 'statusCards', 'expiredCount', 'filters'],
            },
        );
    }

    function scheduleFilter() {
        clearTimeout(filterTimer);
        filterTimer = setTimeout(() => fetchList(), 300);
    }

    watch(
        [
            militaryNumber,
            fullnameAr,
            plateNumber,
            statusFilter,
            nationalityId,
            departmentId,
            housing,
            expiredOnly,
            deactivatedOnly,
        ],
        () => scheduleFilter(),
    );
    watch(baseId, () => {
        zoneId.value = '';
        scheduleFilter();
    });
    watch(zoneId, () => scheduleFilter());
    // Switching which half of the table is being viewed invalidates the current selection —
    // a row selected while looking at active employees can't be acted on from the
    // deactivated view (and vice versa).
    watch(deactivatedOnly, () => {
        selectedRows.value = [];
    });

    function resetFilters() {
        militaryNumber.value = '';
        fullnameAr.value = '';
        plateNumber.value = '';
        baseId.value = '';
        zoneId.value = '';
        statusFilter.value = '';
        nationalityId.value = '';
        departmentId.value = '';
        housing.value = '';
        expiredOnly.value = '';
        deactivatedOnly.value = '';
        departmentFilterTree.value = null;
        fetchList();
    }

    interface DataTableLazyEvent {
        first: number;
        rows: number;
        sortField?: string | ((item: unknown) => string) | null;
        sortOrder?: 1 | 0 | -1 | null;
    }

    // Shared by the DataTable's @page and @sort events — both carry the same combined
    // first/rows/sort state (PrimeVue's lazy-loading contract), so one handler covers both.
    // (Only @page's event also carries `page` directly; @sort doesn't, so page is derived
    // from `first`/`rows`, which both events guarantee.)
    function onDataTableChange(event: DataTableLazyEvent) {
        perPage.value = String(event.rows);
        sortField.value =
            typeof event.sortField === 'string' ? event.sortField : '';
        sortOrder.value = event.sortOrder ? String(event.sortOrder) : '';
        fetchList({ page: Math.floor(event.first / event.rows) + 1 });
    }

    function clearSelection() {
        selectedRows.value = [];
    }

    const bulkActions = computed(() =>
        resolveEmployeeBulkActions({
            filterStatus: statusFilter.value,
            selectedStatuses: selectedRows.value.map((r) => r.status),
            isDeactivatedView: !!deactivatedOnly.value,
        }),
    );

    // ---- create / edit panels ----
    const isOpenedCreate = ref(false);
    const isOpenedEdit = ref(false);
    const editingEmployeeId = ref<number | null>(null);
    const editingEmployee = ref<Employee | null>(null);
    const employeeMovements = ref<EmployeeMovement[]>([]);
    const movementsLoading = ref(false);

    function refreshEditingEmployeeFromList() {
        if (!editingEmployeeId.value) {
            return;
        }

        const fresh = employees.value.data.find(
            (e) => e.id === editingEmployeeId.value,
        );

        if (fresh) {
            editingEmployee.value = fresh;
        }
    }

    async function fetchMovements() {
        if (!editingEmployeeId.value) {
            return;
        }

        movementsLoading.value = true;

        try {
            const response = await fetch(
                movementsAction.url(editingEmployeeId.value),
                {
                    headers: { Accept: 'application/json' },
                },
            );
            const data = await response.json();
            employeeMovements.value = data.movements ?? [];
        } catch {
            toast.error(
                trans('employees.toast.movementsFailed'),
                trans('employees.toast.errorTitle'),
            );
        } finally {
            movementsLoading.value = false;
        }
    }

    // ---- access card ----
    const accessCard = ref<AccessCardResponse | null>(null);
    const accessCardLoading = ref(false);
    const accessCardBaseId = ref<number | null>(null);

    async function fetchAccessCard() {
        if (!editingEmployeeId.value) {
            return;
        }

        accessCardLoading.value = true;

        try {
            const url = new URL(
                accessCardAction.url(editingEmployeeId.value),
                window.location.origin,
            );

            if (accessCardBaseId.value) {
                url.searchParams.set('base_id', String(accessCardBaseId.value));
            }

            const response = await fetch(url, {
                headers: { Accept: 'application/json' },
            });
            accessCard.value = await response.json();
        } catch {
            toast.error(
                trans('employees.toast.accessCardFailed'),
                trans('employees.toast.errorTitle'),
            );
        } finally {
            accessCardLoading.value = false;
        }
    }

    // Only auto-refetch on base changes once the tab has actually been opened at least once
    // (accessCard is non-null after that) — otherwise seeding accessCardBaseId from
    // openEditPanel() would fire an eager fetch before the user ever visits the tab.
    watch(accessCardBaseId, () => {
        if (editingEmployeeId.value && accessCard.value !== null) {
            fetchAccessCard();
        }
    });

    // Printing is a single action: log the print event, mark the employee Printed, then
    // refresh the tab's log table + the row's status badge — no separate confirm step.
    function recordPrintAndMarkPrinted() {
        if (!editingEmployeeId.value) {
            return;
        }

        router.post(
            markPrintedAction.url(editingEmployeeId.value),
            { base_id: accessCardBaseId.value },
            {
                preserveScroll: true,
                onSuccess: () => {
                    refreshEditingEmployeeFromList();
                    fetchAccessCard();
                    toast.success(
                        trans('employees.toast.statusSuccess'),
                        trans('employees.toast.successTitle'),
                    );
                },
                onError: () =>
                    toast.error(
                        trans('employees.toast.statusFailed'),
                        trans('employees.toast.errorTitle'),
                    ),
            },
        );
    }

    function returnCard(badgeLogId: number) {
        if (!editingEmployeeId.value) {
            return;
        }

        router.post(
            returnCardAction.url([editingEmployeeId.value, badgeLogId]),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    fetchAccessCard();
                    toast.success(
                        trans('employees.toast.cardReturned'),
                        trans('employees.toast.successTitle'),
                    );
                },
                onError: () =>
                    toast.error(
                        trans('employees.toast.returnCardFailed'),
                        trans('employees.toast.errorTitle'),
                    ),
            },
        );
    }

    const createParentTree = ref<Record<string, boolean> | null>(null);
    const editParentTree = ref<Record<string, boolean> | null>(null);

    const createForm = useForm<EmployeeFormData>(
        emptyFormValues(
            lockedCompany.value
                ? lockedCompany.value.id
                : (user.value?.dep_id ?? 0),
            lockedCompany.value ? 1 : 0,
        ),
    );
    const editForm = useForm<EmployeeFormData>(emptyFormValues());

    function onCreateParentChange(value: Record<string, boolean> | null) {
        createParentTree.value = value;
        createForm.dep_id = Number(extractDeptKey(value) || 0);
        createForm.dep_parent_id = createForm.dep_id;
    }

    function onEditParentChange(value: Record<string, boolean> | null) {
        editParentTree.value = value;
        editForm.dep_id = Number(extractDeptKey(value) || 0);
        editForm.dep_parent_id = editForm.dep_id;
    }

    function openCreatePanel() {
        isOpenedEdit.value = false;
        const depId = lockedCompany.value
            ? lockedCompany.value.id
            : (user.value?.dep_id ?? 0);
        createForm.reset();
        createForm.clearErrors();
        Object.assign(
            createForm,
            emptyFormValues(depId, lockedCompany.value ? 1 : 0),
        );
        createParentTree.value = toTreeSelectValue(depId);
        isOpenedCreate.value = true;
    }

    function submitCreate() {
        createForm.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                isOpenedCreate.value = false;
                toast.success(
                    trans('employees.toast.createSuccess'),
                    trans('employees.toast.successTitle'),
                );
            },
            onError: (errors) => {
                const message =
                    Object.keys(errors).length > 0
                        ? trans('employees.toast.validationFailed')
                        : trans('employees.toast.createFailed');
                toast.error(message, trans('employees.toast.errorTitle'));
            },
        });
    }

    function openEditPanel(employee: Employee) {
        isOpenedCreate.value = false;
        editingEmployeeId.value = employee.id;
        editingEmployee.value = employee;
        employeeMovements.value = [];
        accessCard.value = null;
        accessCardBaseId.value = employee.default_base ?? null;
        editForm.clearErrors();
        Object.assign(editForm, {
            military_number: employee.military_number,
            phone_number: employee.phone_number,
            fullname_en: employee.fullname_en,
            fullname_ar: employee.fullname_ar ?? '',
            remarks: employee.remarks ?? '',
            bloodtype: employee.bloodtype ?? '',
            qid: employee.qid ?? '',
            Job_Arabic: employee.Job_Arabic ?? '',
            Job_En: employee.Job_En ?? '',
            StartTime: employee.StartTime ?? '',
            EndTime: employee.EndTime ?? '',
            Escort: employee.Escort ?? '',
            device: employee.device ?? '',
            // expiry_date arrives as a full ISO datetime (Eloquent date cast); a native
            // AppDateInput / native date fields need a plain YYYY-MM-DD value or they render empty.
            expiry_date: employee.expiry_date
                ? employee.expiry_date.slice(0, 10)
                : '',
            dep_id: employee.dep_id,
            dep_parent_id: employee.dep_parent_id,
            rank_id: employee.rank_id,
            nationality_id: employee.nationality_id,
            gender_id: employee.gender_id,
            default_base: employee.default_base,
            is_employee: employee.is_employee ?? 0,
            housing: employee.housing ?? false,
            photo: null,
            zoning: (employee.zones ?? []).map((z) => z.id),
        });
        editParentTree.value = toTreeSelectValue(employee.dep_id);
        isOpenedEdit.value = true;
    }

    function submitEdit() {
        if (!editingEmployeeId.value) {
            return;
        }

        editForm.put(update.url(editingEmployeeId.value), {
            preserveScroll: true,
            onSuccess: () => {
                isOpenedEdit.value = false;
                toast.success(
                    trans('employees.toast.updateSuccess'),
                    trans('employees.toast.successTitle'),
                );
            },
            onError: (errors) => {
                const message =
                    Object.keys(errors).length > 0
                        ? trans('employees.toast.validationFailed')
                        : trans('employees.toast.updateFailed');
                toast.error(message, trans('employees.toast.errorTitle'));
            },
        });
    }

    // ---- cars ----
    const newCarPlateNumber = ref('');
    const newCarDescription = ref('');

    function addCar() {
        if (!editingEmployeeId.value || !newCarPlateNumber.value.trim()) {
            return;
        }

        router.post(
            storeCar.url(editingEmployeeId.value),
            {
                plate_number: newCarPlateNumber.value.trim(),
                car_description: newCarDescription.value.trim() || null,
            },
            {
                preserveScroll: true,
                only: ['employees', 'statusCards'],
                onSuccess: () => {
                    newCarPlateNumber.value = '';
                    newCarDescription.value = '';
                    refreshEditingEmployeeFromList();
                },
                onError: () =>
                    toast.error(
                        trans('employees.toast.carAddFailed'),
                        trans('employees.toast.errorTitle'),
                    ),
            },
        );
    }

    function updateCarDescription(carId: number, description: string) {
        if (!editingEmployeeId.value) {
            return;
        }

        router.patch(
            updateCar.url([editingEmployeeId.value, carId]),
            { car_description: description.trim() || null },
            {
                preserveScroll: true,
                only: ['employees', 'statusCards'],
                onSuccess: () => refreshEditingEmployeeFromList(),
                onError: () =>
                    toast.error(
                        trans('employees.toast.carUpdateFailed'),
                        trans('employees.toast.errorTitle'),
                    ),
            },
        );
    }

    function deleteCar(carId: number) {
        if (!editingEmployeeId.value) {
            return;
        }

        router.delete(destroyCar.url([editingEmployeeId.value, carId]), {
            preserveScroll: true,
            only: ['employees', 'statusCards'],
            onSuccess: () => refreshEditingEmployeeFromList(),
            onError: () =>
                toast.error(
                    trans('employees.toast.carDeleteFailed'),
                    trans('employees.toast.errorTitle'),
                ),
        });
    }

    // ---- bulk actions ----
    function selectedIds(): number[] {
        return selectedRows.value.map((r) => r.id);
    }

    function deleteSelected() {
        const ids = selectedIds();

        if (ids.length === 0) {
            return;
        }

        const copy = buildEmployeeBulkConfirm('delete', ids.length);
        confirm.require({
            message: copy.message,
            header: copy.header,
            acceptProps: { severity: 'danger', label: trans('common.confirm') },
            rejectProps: {
                severity: 'secondary',
                outlined: true,
                label: trans('common.cancel'),
            },
            accept: () => {
                router.delete(destroy.url(), {
                    data: { ids },
                    preserveScroll: true,
                    onSuccess: () => {
                        clearSelection();
                        toast.success(
                            trans('employees.toast.deleteSuccess'),
                            trans('employees.toast.successTitle'),
                        );
                    },
                    onError: () =>
                        toast.error(
                            trans('employees.toast.deleteFailed'),
                            trans('employees.toast.errorTitle'),
                        ),
                });
            },
        });
    }

    function setStatusForSelected(
        action: 'approve' | 'unapprove' | 'collect',
        status: number,
    ) {
        const ids = selectedIds();

        if (ids.length === 0) {
            return;
        }

        const copy = buildEmployeeBulkConfirm(action, ids.length);
        confirm.require({
            message: copy.message,
            header: copy.header,
            acceptProps: {
                severity: 'success',
                label: trans('common.confirm'),
            },
            rejectProps: {
                severity: 'secondary',
                outlined: true,
                label: trans('common.cancel'),
            },
            accept: () => {
                router.post(
                    approve.url(),
                    { ids, status },
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            clearSelection();
                            toast.success(
                                trans('employees.toast.statusSuccess'),
                                trans('employees.toast.successTitle'),
                            );
                        },
                        onError: () =>
                            toast.error(
                                trans('employees.toast.statusFailed'),
                                trans('employees.toast.errorTitle'),
                            ),
                    },
                );
            },
        });
    }

    // ---- bulk print access cards ----
    const bulkPrintDialogVisible = ref(false);
    const bulkPrintCards = ref<BulkAccessCardEntry[]>([]);
    const bulkPrintLoading = ref(false);
    const bulkPrintBaseId = ref<number | null>(null);

    async function fetchBulkAccessCards() {
        const ids = selectedIds();

        if (ids.length === 0) {
            return;
        }

        bulkPrintLoading.value = true;

        try {
            const url = new URL(
                accessCardsAction.url(),
                window.location.origin,
            );
            ids.forEach((id) => url.searchParams.append('ids[]', String(id)));

            if (bulkPrintBaseId.value) {
                url.searchParams.set('base_id', String(bulkPrintBaseId.value));
            }

            const response = await fetch(url, {
                headers: { Accept: 'application/json' },
            });
            const data = await response.json();
            bulkPrintCards.value = data.cards ?? [];
        } catch {
            toast.error(
                trans('employees.toast.accessCardFailed'),
                trans('employees.toast.errorTitle'),
            );
        } finally {
            bulkPrintLoading.value = false;
        }
    }

    function openBulkPrintDialog() {
        if (selectedIds().length === 0) {
            return;
        }

        bulkPrintBaseId.value = null;
        bulkPrintCards.value = [];
        bulkPrintDialogVisible.value = true;
        fetchBulkAccessCards();
    }

    watch(bulkPrintBaseId, () => {
        if (bulkPrintDialogVisible.value) {
            fetchBulkAccessCards();
        }
    });

    // Mirrors recordPrintAndMarkPrinted: printing is a single action from the user's
    // point of view — the print dialog opening is the trigger, logging + the status
    // transition to Printed follow immediately, no separate confirm step.
    function recordBulkPrintAndMarkPrinted() {
        const ids = selectedIds();

        if (ids.length === 0) {
            return;
        }

        router.post(
            bulkPrintAccessCardsAction.url(),
            { ids, base_id: bulkPrintBaseId.value },
            {
                preserveScroll: true,
                onSuccess: () => {
                    bulkPrintDialogVisible.value = false;
                    clearSelection();
                    toast.success(
                        trans('employees.toast.statusSuccess'),
                        trans('employees.toast.successTitle'),
                    );
                },
                onError: () =>
                    toast.error(
                        trans('employees.toast.statusFailed'),
                        trans('employees.toast.errorTitle'),
                    ),
            },
        );
    }

    function setActiveForSelected(active: boolean) {
        const ids = selectedIds();

        if (ids.length === 0) {
            return;
        }

        const copy = buildEmployeeBulkConfirm(
            active ? 'activate' : 'deactivate',
            ids.length,
        );
        confirm.require({
            message: copy.message,
            header: copy.header,
            acceptProps: {
                severity: active ? 'success' : 'danger',
                label: trans('common.confirm'),
            },
            rejectProps: {
                severity: 'secondary',
                outlined: true,
                label: trans('common.cancel'),
            },
            accept: () => {
                router.post(
                    setActiveAction.url(),
                    { ids, active },
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            clearSelection();
                            toast.success(
                                trans('employees.toast.statusSuccess'),
                                trans('employees.toast.successTitle'),
                            );
                        },
                        onError: () =>
                            toast.error(
                                trans('employees.toast.statusFailed'),
                                trans('employees.toast.errorTitle'),
                            ),
                    },
                );
            },
        });
    }

    return {
        employees,
        statusCards,
        expiredCount,
        departments,
        bases,
        ranks,
        nationalities,
        genders,
        lockedCompany,
        lockedDepartmentLabel,
        canManage,
        pageTitle,
        militaryNumber,
        fullnameAr,
        plateNumber,
        baseId,
        zoneId,
        statusFilter,
        nationalityId,
        departmentId,
        housing,
        expiredOnly,
        deactivatedOnly,
        departmentFilterTree,
        onDepartmentFilterChange,
        zoneOptions,
        rankGroups,
        parentDepartmentOptions,
        resetFilters,
        onDataTableChange,
        selectedRows,
        clearSelection,
        bulkActions,
        isOpenedCreate,
        isOpenedEdit,
        createForm,
        editForm,
        createParentTree,
        editParentTree,
        onCreateParentChange,
        onEditParentChange,
        openCreatePanel,
        submitCreate,
        openEditPanel,
        submitEdit,
        editingEmployee,
        employeeMovements,
        movementsLoading,
        fetchMovements,
        accessCard,
        accessCardLoading,
        accessCardBaseId,
        fetchAccessCard,
        recordPrintAndMarkPrinted,
        returnCard,
        newCarPlateNumber,
        newCarDescription,
        addCar,
        updateCarDescription,
        deleteCar,
        deleteSelected,
        setStatusForSelected,
        setActiveForSelected,
        bulkPrintDialogVisible,
        bulkPrintCards,
        bulkPrintLoading,
        bulkPrintBaseId,
        openBulkPrintDialog,
        recordBulkPrintAndMarkPrinted,
    };
}
