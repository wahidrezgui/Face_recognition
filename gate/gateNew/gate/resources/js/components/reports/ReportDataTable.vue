<script setup lang="ts">
import { trans } from 'laravel-vue-i18n';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import AppCard from '@/components/AppCard.vue';
import { SEVERITY_STYLES } from '@/lib/severityStyles';
import type { ReportPreset, ReportRow } from '@/types/reports';

const props = defineProps<{
    preset: ReportPreset;
    rows: ReportRow[];
    total: number;
    page: number;
    perPage: number;
    loading: boolean;
    searched: boolean;
}>();

const emit = defineEmits<{
    page: [event: { page: number; rows: number }];
    'row-click': [row: ReportRow];
}>();

function issueClass(row: ReportRow, issueField?: string): string {
    return issueField && row[issueField] ? SEVERITY_STYLES.danger.chip : '';
}
</script>

<template>
    <AppCard padding="none">
        <DataTable
            :value="props.rows"
            :loading="props.loading"
            lazy
            paginator
            :rows="props.perPage"
            :total-records="props.total"
            :first="(props.page - 1) * props.perPage"
            selection-mode="single"
            @page="
                (event) => emit('page', { page: event.page, rows: event.rows })
            "
            @row-click="(event) => emit('row-click', event.data as ReportRow)"
        >
            <template #empty>
                <span>{{
                    props.searched
                        ? trans('reports.table.noResults')
                        : trans('reports.table.searchToBegin')
                }}</span>
            </template>
            <Column
                v-for="column in props.preset.columns"
                :key="column.field"
                :field="column.field"
                :header="trans(column.headerKey)"
            >
                <template #body="{ data }">
                    <span
                        :class="
                            issueClass(data as ReportRow, column.issueField)
                        "
                        >{{ (data as ReportRow)[column.field] ?? '—' }}</span
                    >
                </template>
            </Column>
        </DataTable>
    </AppCard>
</template>
