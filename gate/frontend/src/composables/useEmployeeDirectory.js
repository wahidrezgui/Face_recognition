import { computed } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import {
    clearEmployeeDirectory,
    getDirectoryStatus,
    initEmployeeDirectory,
    isDirectoryReady,
    searchEmployeesLocal,
    syncEmployeeDirectory,
} from '../lib/employee-directory';

export const EMPLOYEE_DIRECTORY_QUERY_KEY = ['employee-directory'];

export function useEmployeeDirectory() {
    const queryClient = useQueryClient();

    const {
        data: status,
        isFetching,
        isLoading,
        refetch,
    } = useQuery({
        queryKey: EMPLOYEE_DIRECTORY_QUERY_KEY,
        queryFn: syncEmployeeDirectory,
        staleTime: Infinity,
        gcTime: Infinity,
        enabled: false,
        retry: 1,
    });

    const isReady = computed(() => isDirectoryReady() || Boolean(status.value?.ready));
    const isSyncing = computed(() => isFetching.value || isLoading.value);
    const directoryMeta = computed(() => status.value ?? getDirectoryStatus());

    async function prefetchDirectory() {
        await initEmployeeDirectory();
        if (isDirectoryReady()) {
            return getDirectoryStatus();
        }
        const result = await refetch();
        return result.data ?? getDirectoryStatus();
    }

    async function refreshDirectory() {
        const result = await refetch();
        return result.data ?? getDirectoryStatus();
    }

    function searchLocal(query, limit = 25) {
        return searchEmployeesLocal(query, limit);
    }

    async function clearDirectory() {
        await clearEmployeeDirectory();
        queryClient.removeQueries({ queryKey: EMPLOYEE_DIRECTORY_QUERY_KEY });
    }

    return {
        isReady,
        isSyncing,
        directoryMeta,
        prefetchDirectory,
        refreshDirectory,
        searchLocal,
        clearDirectory,
        initEmployeeDirectory,
    };
}
