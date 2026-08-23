<script setup lang="ts">
import { Pencil, Trash2 } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import AppButton from '@/components/AppButton.vue';
import { useLocale } from '@/composables/useLocale';
import type { Company, PaginatedCompanies } from '@/types';

interface Props {
    companies: PaginatedCompanies;
    canManage: boolean;
}

defineProps<Props>();

interface DataTableLazyEvent {
    first: number;
    rows: number;
}

const emit = defineEmits<{
    change: [event: DataTableLazyEvent];
    'row-click': [company: Company];
    edit: [company: Company];
    delete: [company: Company];
}>();

const { locale } = useLocale();
</script>

<template>
    <DataTable
        :value="companies.data"
        lazy
        paginator
        data-key="id"
        :rows="companies.per_page"
        :total-records="companies.total"
        :first="(companies.current_page - 1) * companies.per_page"
        :rows-per-page-options="[10, 25, 50, 100]"
        striped-rows
        class="companies-table"
        @page="emit('change', $event)"
        @row-click="emit('row-click', $event.data)"
    >
        <template #empty>
            <div
                class="py-10 text-center text-sm text-surface-500 dark:text-surface-400"
            >
                {{ trans('companies.table.empty') }}
            </div>
        </template>

        <Column :header="trans('companies.table.name')">
            <template #body="{ data }">{{
                locale === 'en'
                    ? data.name_en || data.name_ar
                    : data.name_ar || data.name_en
            }}</template>
        </Column>

        <Column :header="trans('companies.table.timeWindow')">
            <template #body="{ data }">
                <span v-if="data.start_time && data.end_time"
                    >{{ data.start_time.slice(0, 5) }} –
                    {{ data.end_time.slice(0, 5) }}</span
                >
                <span v-else class="text-surface-400">—</span>
            </template>
        </Column>

        <Column
            v-if="canManage"
            :header="trans('companies.table.actions')"
            style="width: 6rem"
        >
            <template #body="{ data }">
                <div class="flex items-center gap-1">
                    <AppButton
                        text
                        rounded
                        size="small"
                        severity="info"
                        :aria-label="trans('companies.table.edit')"
                        @click.stop="emit('edit', data)"
                    >
                        <Pencil :size="15" />
                    </AppButton>
                    <AppButton
                        text
                        rounded
                        size="small"
                        severity="danger"
                        :aria-label="trans('companies.table.delete')"
                        @click.stop="emit('delete', data)"
                    >
                        <Trash2 :size="15" />
                    </AppButton>
                </div>
            </template>
        </Column>
    </DataTable>
</template>

<style scoped>
.companies-table :deep(.p-datatable-tbody > tr) {
    cursor: pointer;
}
</style>
