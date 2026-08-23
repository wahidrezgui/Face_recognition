<script setup lang="ts">
import { trans } from 'laravel-vue-i18n';
import InputText from 'primevue/inputtext';
import { computed, ref, watch } from 'vue';
import { useLocale } from '@/composables/useLocale';
import { employeePhotoUrl } from '@/lib/employees/employeeFormUi';
import type { DirectoryEmployee } from '@/types/gate';

const props = defineProps<{
    results: DirectoryEmployee[];
}>();

const emit = defineEmits<{
    search: [query: string];
    select: [employee: DirectoryEmployee];
}>();

const { locale } = useLocale();

const query = ref('');
const open = computed(
    () => query.value.trim().length > 0 && props.results.length > 0,
);

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

watch(query, (value) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => emit('search', value), 200);
});

function displayName(employee: DirectoryEmployee): string {
    return (
        (locale.value === 'ar' ? employee.fullname_ar : employee.fullname_en) ||
        employee.fullname_en
    );
}

function pick(employee: DirectoryEmployee): void {
    query.value = '';
    emit('select', employee);
}
</script>

<template>
    <div class="relative">
        <InputText
            v-model="query"
            fluid
            :placeholder="trans('gate.search.placeholder')"
        />

        <ul
            v-if="open"
            class="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-surface-200 bg-surface-0 shadow-lg dark:border-surface-700 dark:bg-surface-900"
        >
            <li
                v-for="employee in props.results"
                :key="employee.id"
                class="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-100 dark:hover:bg-surface-800"
                @click="pick(employee)"
            >
                <img
                    :src="employeePhotoUrl(employee.photo)"
                    alt=""
                    class="h-8 w-8 rounded-full object-cover"
                />
                <div class="min-w-0">
                    <p
                        class="truncate text-sm font-medium text-surface-900 dark:text-surface-100"
                    >
                        {{ displayName(employee) }}
                    </p>
                    <p
                        class="truncate text-xs text-surface-500 dark:text-surface-400"
                    >
                        {{ employee.military_number }}
                    </p>
                </div>
            </li>
        </ul>
    </div>
</template>
