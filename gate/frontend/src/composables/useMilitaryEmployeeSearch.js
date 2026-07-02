import { ref, onBeforeUnmount } from 'vue';
import { searchEmployees } from '../api/employees';

function mapEmployeeRow(emp) {
    return {
        id: emp.id,
        military_number: emp.military_number == null ? '' : String(emp.military_number),
        empl: emp.fullname_ar,
        fullname_ar: emp.fullname_ar,
        fullname_en: emp.fullname_en,
        photo: emp.photo,
        department: emp.department || emp.company_name || '',
        rank_name_ar: emp.rank_name_ar || '',
    };
}

export function useMilitaryEmployeeSearch({
    debounceMs = 150,
    minChars: defaultMinChars = 2,
    perPage = 25,
} = {}) {
    const results = ref([]);
    const loading = ref(false);
    let timer = null;
    let requestId = 0;

    async function runSearch(query, requiredLength = defaultMinChars) {
        const trimmed = String(query ?? '').trim();
        if (trimmed.length < requiredLength) {
            results.value = [];
            loading.value = false;
            return;
        }

        const currentRequest = ++requestId;
        loading.value = true;

        try {
            const { data } = await searchEmployees({
                q: trimmed,
                scope: 'military',
                per_page: perPage,
            });

            if (currentRequest !== requestId) {
                return;
            }

            results.value = (data.data || []).map(mapEmployeeRow);
        } catch (error) {
            console.error('Military employee search failed:', error);
            if (currentRequest === requestId) {
                results.value = [];
            }
        } finally {
            if (currentRequest === requestId) {
                loading.value = false;
            }
        }
    }

    function search(query, requiredLength = defaultMinChars) {
        clearTimeout(timer);
        const trimmed = String(query ?? '').trim();

        if (trimmed.length < requiredLength) {
            results.value = [];
            loading.value = false;
            return;
        }

        timer = setTimeout(() => {
            runSearch(trimmed, requiredLength);
        }, debounceMs);
    }

    function clear() {
        clearTimeout(timer);
        requestId += 1;
        results.value = [];
        loading.value = false;
    }

    onBeforeUnmount(() => {
        clearTimeout(timer);
    });

    return {
        results,
        loading,
        search,
        clear,
    };
}
