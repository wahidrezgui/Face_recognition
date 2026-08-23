import { router, usePage } from '@inertiajs/vue3';
import { computed, ref, watch } from 'vue';
import type {
    ActivityLogActor,
    ActivityLogFilters,
    PaginatedActivityLog,
} from '@/types';

interface ActivityLogPageProps {
    logs: PaginatedActivityLog;
    filters: ActivityLogFilters;
    users: ActivityLogActor[];
    [key: string]: unknown;
}

export function useActivityLogPage() {
    const page = usePage<ActivityLogPageProps>();

    const logs = computed(() => page.props.logs);
    const users = computed(() => page.props.users);

    const userOptions = computed(() =>
        users.value.map((u) => ({
            value: String(u.id),
            label: `${u.firstname} ${u.lastname}`.trim() || u.username,
        })),
    );

    const createdById = ref(page.props.filters.created_by_id ?? '');
    const employeeSearch = ref(page.props.filters.employee_search ?? '');
    const task = ref(page.props.filters.task ?? '');
    const fromDate = ref(page.props.filters.from_date ?? '');
    const toDate = ref(page.props.filters.to_date ?? '');
    const ipAddress = ref(page.props.filters.ip_address ?? '');
    const perPage = ref(page.props.filters.per_page ?? '25');

    let filterTimer: ReturnType<typeof setTimeout> | undefined;

    function fetchList(extra: Record<string, string | number> = {}) {
        router.get(
            page.url.split('?')[0],
            {
                created_by_id: createdById.value || undefined,
                employee_search: employeeSearch.value || undefined,
                task: task.value || undefined,
                from_date: fromDate.value || undefined,
                to_date: toDate.value || undefined,
                ip_address: ipAddress.value || undefined,
                per_page: perPage.value,
                ...extra,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['logs', 'filters'],
            },
        );
    }

    function scheduleFilter() {
        clearTimeout(filterTimer);
        filterTimer = setTimeout(() => fetchList(), 300);
    }

    watch(
        [createdById, employeeSearch, task, fromDate, toDate, ipAddress],
        () => scheduleFilter(),
    );

    function resetFilters() {
        createdById.value = '';
        employeeSearch.value = '';
        task.value = '';
        fromDate.value = '';
        toDate.value = '';
        ipAddress.value = '';
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

    return {
        logs,
        userOptions,
        createdById,
        employeeSearch,
        task,
        fromDate,
        toDate,
        ipAddress,
        resetFilters,
        onDataTableChange,
    };
}
