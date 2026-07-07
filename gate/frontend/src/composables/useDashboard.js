import { computed } from 'vue';
import { useApiQuery } from './useApiQuery';
import { queryKeys } from '../lib/query-keys';
import { fetchAllStats, fetchStats, fetchSaReports, fetchDashboardReports } from '../api/stats';
import { getAuthUser } from '../lib/auth-session';
import { getResourceScope, isGlobalScope } from '../lib/auth-roles';

const defaultStats = {
    employees: 0,
    pending: 0,
    printed: 0,
    collected: 0,
    checkedIn: 0,
    checkedOut: 0,
    checkInsToday: 0,
    checkOutsToday: 0,
    users: 0,
    departments: 0,
    bases: 0,
    gates: 0,
    zones: 0,
    scope: '',
    scopeLabel: '',
};

export function useDashboard() {
    const dashboardScope = computed(() => getResourceScope('dashboard'));
    const isGlobalDashboard = computed(() => isGlobalScope('dashboard'));
    const depId = computed(() => String(getAuthUser()?.dep_id ?? localStorage.getItem('dep_id') ?? '').trim());
    const enabled = computed(() => isGlobalDashboard.value || Boolean(depId.value));

    const statsQuery = useApiQuery({
        queryKey: computed(() => (
            isGlobalDashboard.value
                ? queryKeys.dashboard.stats('global')
                : queryKeys.dashboard.stats(depId.value)
        )),
        queryFn: async () => (
            isGlobalDashboard.value
                ? (await fetchAllStats()).data
                : (await fetchStats(depId.value)).data
        ),
        enabled,
    });

    const reportsQuery = useApiQuery({
        queryKey: computed(() => (
            isGlobalDashboard.value
                ? queryKeys.dashboard.reports('global')
                : queryKeys.dashboard.reports(depId.value)
        )),
        queryFn: async () => (
            isGlobalDashboard.value
                ? (await fetchSaReports()).data
                : (await fetchDashboardReports(depId.value)).data
        ),
        enabled,
    });

    const stats = computed(() => statsQuery.data.value ?? defaultStats);
    const reports = computed(() => reportsQuery.data.value ?? null);
    const pending = computed(() => statsQuery.pending.value || reportsQuery.pending.value);

    const errorMessage = computed(() => {
        if (statsQuery.errorMessage.value) {
            return statsQuery.errorMessage.value;
        }

        if (!isGlobalDashboard.value && !depId.value) {
            return 'Department is missing for this account. Log out and sign in again.';
        }

        return reportsQuery.errorMessage.value || '';
    });

    const scopeLabel = computed(() => stats.value.scopeLabel || reports.value?.scopeLabel || '');

    return {
        dashboardScope,
        isGlobalDashboard,
        depId,
        stats,
        reports,
        scopeLabel,
        pending,
        errorMessage,
        statsQuery,
        reportsQuery,
    };
}
