import { computed, unref } from 'vue';
import { useQuery } from '@tanstack/vue-query';

function resolveErrorMessage(error) {
    if (!error) {
        return '';
    }

    return error.response?.data?.message ?? error.message ?? 'Something went wrong while loading data.';
}

export function useApiQuery(options) {
    const query = useQuery({
        retry: 1,
        ...options,
    });

    const data = computed(() => query.data.value ?? unref(options.initialData) ?? null);
    const pending = computed(() => query.isLoading.value);
    const fetching = computed(() => query.isFetching.value);
    const error = computed(() => query.error.value ?? null);
    const errorMessage = computed(() => resolveErrorMessage(error.value));

    return {
        ...query,
        data,
        pending,
        fetching,
        error,
        errorMessage,
    };
}
