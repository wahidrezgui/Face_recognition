import { computed, toValue } from 'vue';
import { useApiQuery } from './useApiQuery';
import { queryKeys } from '../lib/query-keys';
import { fetchDepartment } from '../api/organization';

export function useDepartment(depIdSource) {
    const depId = computed(() => String(toValue(depIdSource) ?? ''));
    const enabled = computed(() => Boolean(depId.value));

    const query = useApiQuery({
        queryKey: computed(() => queryKeys.departments.detail(depId.value)),
        queryFn: async () => (await fetchDepartment(depId.value)).data,
        enabled,
    });

    const hasRule = computed(() => query.data.value?.parent_id === 0);
    const hasRuleAct = computed(() => {
        if (!hasRule.value) {
            return false;
        }

        return localStorage.getItem('base_default') === '0';
    });

    return {
        ...query,
        hasRule,
        hasRuleAct,
    };
}
